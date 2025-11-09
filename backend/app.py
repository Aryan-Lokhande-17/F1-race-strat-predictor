import torch
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
import json
from pydantic import BaseModel
from typing import List, Tuple

app = FastAPI()
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from model_def import HybridLSTM

with open("model_features.json", "r") as f:
    feats = json.load(f)
    
opt3_features = feats["opt3_features"]
compound_cols = feats["compound_dummies"]
optional_feats = feats["optional_feats"]
SEQ_LEN = feats["seq_len"]

model = HybridLSTM(input_dim=len(opt3_features))
model.load_state_dict(torch.load("models/hybrid_opt3_final.pth", map_location="cpu"))
model.eval()

class StrategyRequest(BaseModel):
    strategy: List[Tuple[str, int]]

    base_lap_time: float

    pit_loss: float

    track_env: dict | None = None


from strategy_simulator import simulate_race

@app.post("/predict_strategy")
def predict_strategy(req: StrategyRequest):
    total, laps = simulate_race(
        req.strategy,
        req.base_lap_time,
        req.pit_loss,
        model,
        compound_cols,
        optional_feats,
        SEQ_LEN,
        track_env=None
    )
    return {
        "total_race_time": round(float(total), 3),
        "lap_times": np.round(laps, 3).tolist()
    }
