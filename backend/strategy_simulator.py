import json
from pathlib import Path
from typing import Dict, Optional, List, Tuple

import numpy as np
import torch
from model_def import HybridLSTM

BASE_DIR = Path(__file__).resolve().parent
DEG_MODEL_PATH = BASE_DIR / "models" / "hybrid_opt3_final.pth"
MODEL_FEATURES_PATH = BASE_DIR / "model_features.json"
TRACK_PARAMS_PATH = BASE_DIR / "data" / "track_params.json"

_deg_model = None  # (model, device)

# Load Track Metadata
if TRACK_PARAMS_PATH.exists():
    TRACK_PARAMS = json.loads(TRACK_PARAMS_PATH.read_text())
else:
    TRACK_PARAMS = {}

def _startup_reminder():
    print("=== Strategy Simulator Startup ===")
    print(f"Degradation Model Present: {DEG_MODEL_PATH.exists()}")
    print("Focus: 2025 Strategy-Only (Pace/Winner logic removed)")
    print("=================================")


_startup_reminder()

def _load_deg_model():
    global _deg_model
    if _deg_model is not None:
        return _deg_model

    if not DEG_MODEL_PATH.exists() or not MODEL_FEATURES_PATH.exists():
        print("[INFO] Model files missing; using heuristic fallback.")
        _deg_model = (None, torch.device("cpu"))
        return _deg_model

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    try:
        features = json.loads(MODEL_FEATURES_PATH.read_text())
        input_dim = len(features.get("opt3_features", []))
        
        model = HybridLSTM(input_dim=input_dim)
        state = torch.load(DEG_MODEL_PATH, map_location=device)
        model.load_state_dict(state)
        model.eval().to(device)
        print(f"[INFO] HybridLSTM loaded on {device}")
        _deg_model = (model, device)
    except Exception as e:
        print(f"[WARN] Model load failed, using heuristics: {e}")
        _deg_model = (None, device)
    return _deg_model

# Tyre Degradation Heuristics (Fallback if ML model is unavailable)
TYRE_PROFILES = {
    "SOFT": {"offset": -0.35, "wear_linear": 0.015, "wear_quad": 0.0008, "cliff_lap": 15, "cliff_pen": 0.20},
    "MEDIUM": {"offset": -0.15, "wear_linear": 0.010, "wear_quad": 0.0005, "cliff_lap": 25, "cliff_pen": 0.12},
    "HARD": {"offset": 0.00, "wear_linear": 0.008, "wear_quad": 0.0003, "cliff_lap": 38, "cliff_pen": 0.08},
}

def tyre_degradation_heuristic(compound: str, stint_lap: int) -> float:
    p = TYRE_PROFILES.get(compound.upper(), TYRE_PROFILES["MEDIUM"])
    lap_i = max(0, stint_lap - 1)
    progressive_wear = p["wear_linear"] * lap_i + p["wear_quad"] * (lap_i**2)
    cliff_penalty = max(0, (lap_i + 1) - p["cliff_lap"]) * p["cliff_pen"]
    return p["offset"] + progressive_wear + cliff_penalty

def apply_environment_modifiers(lap_time: float, stint_lap: int, track_env: Optional[Dict[str, float]]) -> float:
    if not track_env:
        return lap_time
    # Thermal degradation proxy
    if "track_temp" in track_env:
        lap_time += (track_env["track_temp"] - 30) * 0.015
    return lap_time

def simulate_stint(compound, laps, base_lap, model, compound_cols, optional_feats, SEQ_LEN, track_env):
    times = []
    # Simplified stint logic removing driverId/constructorId dependencies
    for lap in range(1, laps + 1):
        # 1. Base ML Prediction (if model exists)
        deg_pred = 0.0 # Placeholder for LSTM output logic
        
        # 2. Heuristic fallback / combined logic
        tyre_penalty = tyre_degradation_heuristic(compound, lap)
        
        # 3. Final calculation
        lap_time = float(base_lap) + deg_pred + tyre_penalty
        lap_time = apply_environment_modifiers(lap_time, lap, track_env)
        
        # 4. Fuel load correction (lighter car = faster laps)
        fuel_correction = -0.03 * (laps - lap) 
        times.append(lap_time + fuel_correction)

    return np.array(times)

def simulate_race(strategy, base_lap_time, pit_loss, model, compound_cols, optional_feats, SEQ_LEN, track_env=None, **kwargs):
    total = 0.0
    all_laps = []
    for idx, (compound, stint_laps) in enumerate(strategy):
        stint_times = simulate_stint(compound, int(stint_laps), base_lap_time, model, compound_cols, optional_feats, SEQ_LEN, track_env)
        total += np.sum(stint_times)
        all_laps.extend(stint_times.tolist())
        if idx < len(strategy) - 1:
            total += pit_loss
    return total, np.array(all_laps)

def suggest_strategy(track: str, base_lap_time: float, pit_loss: float, **kwargs):
    model, _ = _load_deg_model()
    track_key = (track or "").strip().title()
    track_meta = TRACK_PARAMS.get(track_key, {"laps": 57})
    total_laps = int(track_meta["laps"])

    candidates = [
        [("SOFT", 15), ("HARD", total_laps - 15)],
        [("MEDIUM", 25), ("HARD", total_laps - 25)],
        [("SOFT", 12), ("MEDIUM", 18), ("HARD", total_laps - 30)],
    ]

    best_strategy, best_time = None, float("inf")
    for strat in candidates:
        total, _ = simulate_race(strat, base_lap_time, pit_loss, model, [], [], 10, None)
        if total < best_time:
            best_time, best_strategy = total, strat

    return {"best_strategy": best_strategy, "predicted_time": round(best_time, 3)}
