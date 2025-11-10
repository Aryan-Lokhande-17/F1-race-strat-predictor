import json
import numpy as np
import torch
from typing import List, Tuple, Dict, Optional
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from model_def import HybridLSTM
from strategy_simulator import simulate_race

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# Load trained model
model = HybridLSTM(input_dim=len(opt3_features))
model.load_state_dict(torch.load("models/hybrid_opt3_final.pth", map_location="cpu"))
model.eval()

class StrategyRequest(BaseModel):
    track: str                              
    strategy: List[Tuple[str, int]]         
    base_lap_time: float | None = None      
    pit_loss: float | None = None           
    track_env: Dict[str, float] | None = None
    driverId: Optional[int] = None
    constructorId: Optional[int] = None
    circuitId: Optional[int] = None

from predict_race import router as race_router
app.include_router(race_router)

@app.post("/predict_strategy")
def predict_strategy(req: StrategyRequest):

    track_key = req.track.strip().title()

    base_lap = req.base_lap_time if req.base_lap_time is not None else TRACK_DATA[track_key]["avg_lap"]
    pit_loss = req.pit_loss if req.pit_loss is not None else TRACK_DATA[track_key]["pit_loss"]

    total, laps = simulate_race(
        req.strategy,
        base_lap,
        pit_loss,
        model,
        compound_cols,
        optional_feats,
        SEQ_LEN,
        track_env=req.track_env,
        driverId=req.driverId,
        constructorId=req.constructorId,
        circuitId=req.circuitId 

    )

    return {
        "track": track_key,
        "base_lap_used": base_lap,
        "pit_loss_used": pit_loss,
        "total_race_time": round(float(total), 3),
        "lap_times": np.round(laps, 3).tolist()
    }

class OptimizeRequest(BaseModel):
    track: str
    race_laps: int = 57
    compounds: List[str] = ["SOFT","MEDIUM","HARD"]
    base_lap_time: Optional[float] = None
    pit_loss: Optional[float] = None
    track_env: Dict[str, float] | None = None
    top_k: int = 5

@app.post("/optimize_strategy")
def optimize_strategy(req: OptimizeRequest):
    track_key = req.track.strip().title()
    if track_key not in TRACK_DATA:
        return {"error": f"Unknown track: {req.track}"}

    base = req.base_lap_time if req.base_lap_time is not None else TRACK_DATA[track_key]["avg_lap"]
    pit  = req.pit_loss      if req.pit_loss      is not None else TRACK_DATA[track_key]["pit_loss"]

    from optimizer import evaluate_plans
    out = evaluate_plans(
        race_laps=req.race_laps,
        compounds=req.compounds,
        base_lap=base,
        pit_loss=pit,
        model=model,
        compound_cols=compound_cols,
        optional_feats=optional_feats,
        seq_len=SEQ_LEN,
        track_env=req.track_env,
        top_k=req.top_k
    )
    out["track"] = track_key
    out["base_lap_used"] = base
    out["pit_loss_used"] = pit
    return out

_DISPLAY_LOOKUP = None
def get_display_lookup():
    global _DISPLAY_LOOKUP
    if _DISPLAY_LOOKUP is None:
        _DISPLAY_LOOKUP = pd.read_csv(LOOKUP_PATH)
    return _DISPLAY_LOOKUP

@app.get("/lookup/drivers")
def lookup_drivers():
    df = get_display_lookup()
    return df[[
        "driverId","constructorId","code","forename","surname","team_name"
    ]].to_dict(orient="records")

@app.get("/tracks")
def list_tracks():
    return {"tracks": list(TRACK_DATA.keys())}

