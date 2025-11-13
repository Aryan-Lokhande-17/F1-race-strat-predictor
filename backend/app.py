import json
import numpy as np
import torch
from typing import List, Tuple, Dict, Optional
import pandas as pd
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from model_def import HybridLSTM
from strategy_simulator import simulate_race, suggest_strategy, race_model, PACE_REF

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
LOOKUP_PATH = Path(__file__).resolve().parent / "Excelfiles" / "display_lookup.csv"

# Load track parameters
with open("data/track_params.json", "r") as f:
    TRACK_DATA = json.load(f)

# Load model feature metadata
with open("model_features.json", "r") as f:
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
    model.load_state_dict(torch.load("models/hybrid_opt3_final.pth", map_location="cpu"))
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
        circuitId=req.circuitId,
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
        circuitId = data.get("circuitId", 1)

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
        compound_cols=compound_cols,
        optional_feats=optional_feats,
        seq_len=SEQ_LEN,
        track_env=req.track_env,
    )

    best = out.get("best_strategy")
    if not best:
        return {"error": "No valid strategy found"}

    return {
        "track": track_key,
        "laps": race_laps,
        "base_lap_used": base_lap,
        "pit_loss_used": pit_loss,
        "best_strategy": best,
        "predicted_time": out.get("best_time"),
    }


# -------------------------
# Lookup Helpers
# -------------------------
_DISPLAY_LOOKUP = None

def get_display_lookup():
    global _DISPLAY_LOOKUP
    if _DISPLAY_LOOKUP is None:
        _DISPLAY_LOOKUP = pd.read_csv(LOOKUP_PATH)
    return _DISPLAY_LOOKUP


# -------------------------
# 🏁 Predict Race Finishing Order / Winner
# -------------------------
class FinishingOrderRequest(BaseModel):
    drivers: List[Dict[str, int]]  # [{driverId, constructorId, circuitId, grid_position}, ...]
    track: str


@app.post("/predict_winner")
def predict_race_order(req: FinishingOrderRequest):
    """Predicts the finishing order based on pace model and current selections."""
    if race_model is None or PACE_REF.empty:
        return {"error": "Race pace model not loaded or pace reference missing."}

    print("PACE_REF columns:", PACE_REF.columns.tolist())
    print("Unique driverIds:", PACE_REF["driverId"].unique()[:10])
    print("Unique constructorIds:", PACE_REF["constructorId"].unique()[:10])
    print("Unique circuitIds:", PACE_REF["circuitId"].unique()[:10])
    print("PACE_REF sample:\n", PACE_REF.head(5))

    try:
        df_rows = []
        for entry in req.drivers:
            d_id = entry.get("driverId")
            c_id = entry.get("constructorId")
            cir_id = entry.get("circuitId")

            row = PACE_REF[
                (PACE_REF.driverId == d_id)
                & (PACE_REF.constructorId == c_id)
                & (PACE_REF.circuitId == cir_id)
            ]
            if len(row) > 0:
                df_rows.append(row)

        if not df_rows:
            return {"error": "No valid entries matched in pace reference."}

        df = pd.concat(df_rows, ignore_index=True)

        # --- Inject grid positions ---
        grid_positions = []
        for entry in req.drivers:
            d_id = entry.get("driverId")
            c_id = entry.get("constructorId")
            pos = entry.get("grid_position", None)

            match_idx = df.index[
                (df["driverId"] == d_id) & (df["constructorId"] == c_id)
            ]
            if len(match_idx) > 0:
                df.loc[match_idx, "grid_position"] = pos
            grid_positions.append(pos)

        # Ensure grid_position column exists
        if "grid_position" not in df.columns:
            df["grid_position"] = grid_positions[: len(df)]

        # --- Prepare features ---
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

        # --- Predict and rank ---
        preds = race_model.predict(df[feature_cols])
        df["predicted_performance"] = preds
        df["predicted_rank"] = df["predicted_performance"].rank(method="dense", ascending=True)
        df = df.sort_values("predicted_rank")

        lookup = get_display_lookup()
        df = df.merge(
    lookup[["driverId", "constructorId", "forename", "surname", "team_name"]],
    on=["driverId", "constructorId"],
    how="left"
)
        # --- Build response ---
        result = df[
            [
                "driverId", "constructorId", "code", "forename", "surname",
                "team_name", "grid_position", "predicted_performance", "predicted_rank"
            ]
        ].to_dict(orient="records")

        winner = result[0] if len(result) > 0 else None

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
    return df[
        ["driverId", "constructorId", "code", "forename", "surname", "team_name"]
    ].to_dict(orient="records")


@app.get("/tracks")
def list_tracks():
    return {"tracks": list(TRACK_DATA.keys())}
