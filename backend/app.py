"""2025 Strategy-Only API: Focuses on Tyre Degradation & Strategy Optimization."""
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import torch
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from model_def import HybridLSTM
from strategy_simulator import simulate_race, suggest_strategy

BASE_DIR = Path(__file__).resolve().parent
TRACK_PARAMS_PATH = BASE_DIR / "data" / "track_params.json"
MODEL_FEATURES_PATH = BASE_DIR / "model_features.json"
MODEL_PATH = BASE_DIR / "models" / "hybrid_opt3_final.pth"

app = FastAPI()

# Enable CORS for the Streamlit/React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# Load the Hybrid LSTM Model
try:
    model = HybridLSTM(input_dim=len(opt3_features))
    model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu"))
    model.eval()
except Exception as e:
    print(f"Model load failed: {e}")
    model = None

class StrategyRequest(BaseModel):
    track: str
    strategy: List[Tuple[str, int]]
    base_lap_time: Optional[float] = None
    pit_loss: Optional[float] = None
    track_env: Optional[Dict[str, float]] = None
    driverId: Optional[int] = 0
    constructorId: Optional[int] = 0
    circuitId: Optional[int] = 0

class OptimizeRequest(BaseModel):
    track: str
    compounds: List[str] = ["SOFT", "MEDIUM", "HARD"]
    base_lap_time: Optional[float] = None
    pit_loss: Optional[float] = None
    track_env: Optional[Dict[str, float]] = None

@app.get("/health")
def health():
    return {"status": "ok", "focus": "strategy_only_2025"}

@app.get("/tracks")
def list_tracks():
    return {"tracks": list(TRACK_DATA.keys())}

@app.post("/predict_strategy")
def predict_strategy(req: StrategyRequest):
    track_key = req.track.strip().title()
    if track_key not in TRACK_DATA:
        return {"error": f"Unknown track '{req.track}'."}

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
        "total_race_time": round(float(total), 3),
        "lap_times": np.round(laps, 3).tolist(),
        "delta_to_avg": round(float(total - (base_lap * len(laps))), 3)
    }

@app.post("/suggest_strategy")
async def suggest_best_strategy(req: Request):
    data = await req.json()
    result = suggest_strategy(
        track=data.get("track", "Bahrain"),
        base_lap_time=data.get("base_lap_time", 96.5),
        pit_loss=data.get("pit_loss", 21.5),
        driverId=data.get("driverId", 0),
        constructorId=data.get("constructorId", 0),
        circuitId=data.get("circuitId", 0),
    )
    if not result or result.get("best_strategy") is None:
        return {"error": "No valid strategy found."}
    return result