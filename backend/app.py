import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import torch
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from model_def import HybridLSTM
from strategy_simulator import PACE_REF, race_model, simulate_race, suggest_strategy

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# Global paths and setup
# -------------------------
LOOKUP_PATH = BASE_DIR / "Excelfiles" / "display_lookup.csv"
RACES_PATH = BASE_DIR / "Excelfiles" / "races.csv"
TRACK_PARAMS_PATH = BASE_DIR / "data" / "track_params.json"
MODEL_FEATURES_PATH = BASE_DIR / "model_features.json"
MODEL_PATH = BASE_DIR / "models" / "hybrid_opt3_final.pth"

# Load track parameters
with TRACK_PARAMS_PATH.open("r", encoding="utf-8") as f:
    TRACK_DATA = json.load(f)

# Load model feature metadata
with MODEL_FEATURES_PATH.open("r", encoding="utf-8") as f:
    feats = json.load(f)

opt3_features = feats["opt3_features"]
compound_cols = feats["compound_dummies"]
optional_feats = feats["optional_feats"]
SEQ_LEN = feats["seq_len"]

# -------------------------
# Load trained HybridLSTM model
# -------------------------
try:
    model = HybridLSTM(input_dim=len(opt3_features))
    model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu"))
    model.eval()
    print("[INFO] ✅ HybridLSTM model loaded successfully.")
except Exception as e:
    print(f"[WARN] ⚠ Could not load HybridLSTM model: {e}")
    model = None


# -------------------------
# Pydantic request models
# -------------------------
class StrategyRequest(BaseModel):
    track: str
    strategy: List[Tuple[str, int]]
    base_lap_time: Optional[float] = None
    pit_loss: Optional[float] = None
    track_env: Optional[Dict[str, float]] = None
    driverId: Optional[int] = None
    constructorId: Optional[int] = None
    circuitId: Optional[int] = None


class OptimizeRequest(BaseModel):
    track: str
    compounds: List[str] = ["SOFT", "MEDIUM", "HARD"]
    base_lap_time: Optional[float] = None
    pit_loss: Optional[float] = None
    track_env: Optional[Dict[str, float]] = None


class FinishingOrderRequest(BaseModel):
    drivers: List[Dict[str, int]]
    track: str


# -------------------------
# Lookup Helpers
# -------------------------
_DISPLAY_LOOKUP = None
_TRACK_CIRCUIT_MAP = None


def get_display_lookup() -> pd.DataFrame:
    global _DISPLAY_LOOKUP
    if _DISPLAY_LOOKUP is None:
        _DISPLAY_LOOKUP = pd.read_csv(LOOKUP_PATH)
    return _DISPLAY_LOOKUP


def _normalize_track_name(track: str) -> str:
    return (track or "").strip().lower().replace("grand prix", "").replace("gp", "").strip()


def get_track_circuit_map() -> Dict[str, int]:
    global _TRACK_CIRCUIT_MAP
    if _TRACK_CIRCUIT_MAP is not None:
        return _TRACK_CIRCUIT_MAP

    races = pd.read_csv(RACES_PATH)
    races = races.sort_values("year", ascending=False)

    mapping: Dict[str, int] = {}
    for _, row in races.iterrows():
        key = _normalize_track_name(str(row.get("name", "")))
        if key and key not in mapping:
            mapping[key] = int(row["circuitId"])

    alias = {
        "bahrain": "bahrain",
        "jeddah": "saudi arabian",
        "saudi arabia": "saudi arabian",
        "australia": "australian",
        "japan": "japanese",
        "china": "chinese",
        "miami": "miami",
        "imola": "emilia romagna",
        "monaco": "monaco",
        "canada": "canadian",
        "spain": "spanish",
        "austria": "austrian",
        "silverstone": "british",
        "hungary": "hungarian",
        "belgium": "belgian",
        "netherlands": "dutch",
        "italy": "italian",
        "azerbaijan": "azerbaijan",
        "singapore": "singapore",
        "usa": "united states",
        "united states": "united states",
        "mexico": "mexico city",
        "brazil": "são paulo",
        "qatar": "qatar",
        "abu dhabi": "abu dhabi",
        "las vegas": "las vegas",
    }

    for short, canonical in alias.items():
        if canonical in mapping:
            mapping[short] = mapping[canonical]

    _TRACK_CIRCUIT_MAP = mapping
    return _TRACK_CIRCUIT_MAP


def resolve_circuit_id(track: str, requested_circuit_id: Optional[int]) -> Optional[int]:
    if requested_circuit_id is not None and requested_circuit_id > 1:
        return int(requested_circuit_id)

    mapping = get_track_circuit_map()
    normalized = _normalize_track_name(track)

    if normalized in mapping:
        return mapping[normalized]

    for key, circuit_id in mapping.items():
        if normalized and normalized in key:
            return circuit_id

    return requested_circuit_id


# -------------------------
# Predict Strategy (Run Simulation)
# -------------------------
@app.post("/predict_strategy")
def predict_strategy(req: StrategyRequest):
    track_key = req.track.strip().title()

    if track_key not in TRACK_DATA:
        return {"error": f"Unknown track '{req.track}'. Add it to data/track_params.json."}

    base_lap = req.base_lap_time if req.base_lap_time is not None else TRACK_DATA[track_key]["avg_lap"]
    pit_loss = req.pit_loss if req.pit_loss is not None else TRACK_DATA[track_key]["pit_loss"]
    circuit_id = resolve_circuit_id(track_key, req.circuitId)

    total, laps = simulate_race(
        strategy=req.strategy,
        base_lap_time=base_lap,
        pit_loss=pit_loss,
        model=model,
        compound_cols=compound_cols,
        optional_feats=optional_feats,
        SEQ_LEN=SEQ_LEN,
        track_env=req.track_env,
        driverId=req.driverId,
        constructorId=req.constructorId,
        circuitId=circuit_id,
    )

    return {
        "track": track_key,
        "base_lap_used": base_lap,
        "pit_loss_used": pit_loss,
        "total_race_time": round(float(total), 3),
        "lap_times": np.round(laps, 3).tolist(),
    }


# -------------------------
# Suggest Best Strategy (AI Auto Optimization)
# -------------------------
@app.post("/suggest_strategy")
async def suggest_best_strategy(req: Request):
    try:
        data = await req.json()

        track = data.get("track", "Bahrain")
        base_lap_time = data.get("base_lap_time", 96.5)
        pit_loss = data.get("pit_loss", 21.5)
        driverId = data.get("driverId", 830)
        constructorId = data.get("constructorId", 131)
        circuitId = resolve_circuit_id(track, data.get("circuitId", 1))

        result = suggest_strategy(
            track=track,
            base_lap_time=base_lap_time,
            pit_loss=pit_loss,
            driverId=driverId,
            constructorId=constructorId,
            circuitId=circuitId,
        )

        if not result or result.get("best_strategy") is None:
            return {"error": "No valid strategy found."}

        return result

    except Exception as e:
        print(f"[ERROR] /suggest_strategy failed: {e}")
        return {"error": f"Backend exception: {e}"}


# -------------------------
# Optimize Strategy (Evaluate All Combinations)
# -------------------------
@app.post("/optimize_strategy")
def optimize_strategy(req: OptimizeRequest):
    track_key = req.track.strip().title()

    if track_key not in TRACK_DATA:
        return {"error": f"Unknown track: {req.track}. Add it in data/track_params.json."}

    race_laps = TRACK_DATA[track_key]["laps"]
    base_lap = req.base_lap_time if req.base_lap_time is not None else TRACK_DATA[track_key]["avg_lap"]
    pit_loss = req.pit_loss if req.pit_loss is not None else TRACK_DATA[track_key]["pit_loss"]

    from optimizer import evaluate_plans

    out = evaluate_plans(
        race_laps=race_laps,
        compounds=req.compounds,
        base_lap=base_lap,
        pit_loss=pit_loss,
        model=model,
        compound_cols=compound_cols,
        optional_feats=optional_feats,
        seq_len=SEQ_LEN,
        track_env=req.track_env,
    )

    best = out.get("best")
    if not best:
        return {"error": "No valid strategy found"}

    return {
        "track": track_key,
        "laps": race_laps,
        "base_lap_used": base_lap,
        "pit_loss_used": pit_loss,
        "best_strategy": best.get("strategy"),
        "predicted_time": best.get("total_race_time"),
        "top_strategies": out.get("top", []),
    }


# -------------------------
# 🏁 Predict Race Finishing Order / Winner
# -------------------------
@app.post("/predict_winner")
def predict_race_order(req: FinishingOrderRequest):
    """Predict finishing order based on pace model and current selections."""
    if race_model is None or PACE_REF.empty:
        return {"error": "Race pace model not loaded or pace reference missing."}

    try:
        enriched_rows = []
        for entry in req.drivers:
            d_id = entry.get("driverId")
            c_id = entry.get("constructorId")
            grid_position = int(entry.get("grid_position", 20))
            cir_id = resolve_circuit_id(req.track, entry.get("circuitId"))

            if d_id is None or c_id is None:
                continue

            # strict match first
            row = pd.DataFrame()
            if cir_id is not None:
                row = PACE_REF[
                    (PACE_REF.driverId == d_id)
                    & (PACE_REF.constructorId == c_id)
                    & (PACE_REF.circuitId == cir_id)
                ]

            # fallback to latest profile for this driver+team
            if row.empty:
                row = PACE_REF[(PACE_REF.driverId == d_id) & (PACE_REF.constructorId == c_id)]

            if row.empty:
                continue

            if "year" in row.columns:
                row = row.sort_values("year", ascending=False)
            selected = row.iloc[[0]].copy()
            selected["grid_position"] = grid_position
            selected["circuitId"] = cir_id if cir_id is not None else selected.get("circuitId")
            enriched_rows.append(selected)

        if not enriched_rows:
            return {"error": "No valid entries matched in pace reference."}

        df = pd.concat(enriched_rows, ignore_index=True)
        feature_cols = [
            "grid_position",
            "driver_strength_career",
            "driver_strength_season",
            "team_strength",
            "driver_dnf_rate",
            "team_dnf_rate",
            "driver_track_form",
            "team_track_form",
        ]

        df = df.fillna(0)
        preds = race_model.predict(df[feature_cols])
        df["predicted_performance"] = preds
        df["predicted_rank"] = df["predicted_performance"].rank(method="dense", ascending=True)
        df = df.sort_values("predicted_rank")

        lookup = get_display_lookup()
        df = df.merge(
            lookup[["driverId", "constructorId", "forename", "surname", "team_name"]],
            on=["driverId", "constructorId"],
            how="left",
        )

        result = df[
            [
                "driverId",
                "constructorId",
                "code",
                "forename",
                "surname",
                "team_name",
                "grid_position",
                "predicted_performance",
                "predicted_rank",
            ]
        ].to_dict(orient="records")

        winner = result[0] if result else None
        return {
            "track": req.track,
            "predicted_order": result,
            "winner": winner,
        }

    except Exception as e:
        print(f"[ERROR] /predict_winner failed: {e}")
        return {"error": f"Prediction failed: {e}"}


# -------------------------
# Misc lookup endpoints
# -------------------------
@app.get("/lookup/drivers")
def lookup_drivers():
    df = get_display_lookup()
    return df[["driverId", "constructorId", "code", "forename", "surname", "team_name"]].to_dict(orient="records")


@app.get("/tracks")
def list_tracks():
    return {"tracks": list(TRACK_DATA.keys())}
