import json
import numpy as np
import torch
from typing import List, Tuple, Dict, Optional
import pandas as pd
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path

# -------------------------
# Local imports
# -------------------------
from model_def import HybridLSTM
from strategy_simulator import simulate_race, suggest_strategy

# -------------------------
# FastAPI setup
# -------------------------
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

    # Run simulation
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
    """
    Suggests the best tyre strategy automatically using hybrid_opt3_final model + race pace predictor.
    """
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


@app.get("/lookup/drivers")
def lookup_drivers():
    df = get_display_lookup()
    return df[
        ["driverId", "constructorId", "code", "forename", "surname", "team_name"]
    ].to_dict(orient="records")


@app.get("/tracks")
def list_tracks():
    return {"tracks": list(TRACK_DATA.keys())}
