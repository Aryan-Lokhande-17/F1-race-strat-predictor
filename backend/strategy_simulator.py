# backend/strategy_simulator.py (strategy-only, force-applied on main)
import json
from pathlib import Path
from typing import Dict, Optional

import numpy as np
import torch

from model_def import HybridLSTM

BASE_DIR = Path(__file__).resolve().parent
DEG_MODEL_PATH = BASE_DIR / "models" / "hybrid_opt3_final.pth"
MODEL_FEATURES_PATH = BASE_DIR / "model_features.json"
TRACK_PARAMS_PATH = BASE_DIR / "data" / "track_params.json"

_deg_model = None  # (model, device)

if TRACK_PARAMS_PATH.exists():
    TRACK_PARAMS = json.loads(TRACK_PARAMS_PATH.read_text())
else:
    TRACK_PARAMS = {}


def _startup_reminder():
    print("=== Strategy simulator startup ===")
    print(f"degradation model present: {DEG_MODEL_PATH.exists()}")
    print("winner prediction intentionally removed")
    print("=================================")


_startup_reminder()


def _load_deg_model():
    global _deg_model
    if _deg_model is not None:
        return _deg_model

    if not DEG_MODEL_PATH.exists() or not MODEL_FEATURES_PATH.exists():
        _deg_model = (None, torch.device("cpu"))
        return _deg_model

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    try:
        features = json.loads(MODEL_FEATURES_PATH.read_text())
        input_dim = len(features.get("opt3_features", []))
        if input_dim <= 0:
            raise ValueError("model_features.json missing opt3_features")

        model = HybridLSTM(input_dim=input_dim)
        state = torch.load(DEG_MODEL_PATH, map_location=device)
        model.load_state_dict(state)
        model.eval().to(device)
        _deg_model = (model, device)
        return _deg_model
    except Exception:
        _deg_model = (None, device)
        return _deg_model


TYRE_PROFILES = {
    "SOFT": {"offset": -0.35, "wear_linear": 0.015, "wear_quad": 0.0008, "cliff_lap": 15, "cliff_pen": 0.20},
    "MEDIUM": {"offset": -0.15, "wear_linear": 0.010, "wear_quad": 0.0005, "cliff_lap": 25, "cliff_pen": 0.12},
    "HARD": {"offset": 0.00, "wear_linear": 0.008, "wear_quad": 0.0003, "cliff_lap": 38, "cliff_pen": 0.08},
}


def tyre_degradation(compound: str, stint_lap: int) -> float:
    p = TYRE_PROFILES.get(compound.upper(), TYRE_PROFILES["MEDIUM"])
    lap_i = max(0, stint_lap - 1)
    base_offset = p["offset"]
    progressive_wear = p["wear_linear"] * lap_i + p["wear_quad"] * (lap_i * lap_i)
    cliff_penalty = max(0, (lap_i + 1) - p["cliff_lap"]) * p["cliff_pen"]
    return base_offset + progressive_wear + cliff_penalty


def apply_environment_modifiers(lap_time: float, stint_lap: int, track_env: Optional[Dict[str, float]]) -> float:
    if not track_env:
        return lap_time
    if "track_temp" in track_env:
        lap_time += (track_env["track_temp"] - 30) * 0.015
    if "air_temp" in track_env and stint_lap <= 3:
        lap_time += (track_env["air_temp"] - 25) * 0.025
    if "wind_speed" in track_env:
        lap_time += float(track_env["wind_speed"]) * 0.01
    return lap_time


def build_feature_vector(prev_deg, lap, compound, compound_cols, optional_feats, track_env):
    v = [prev_deg, lap]
    for c in compound_cols:
        v.append(1 if c == f"compound_{compound.upper()}" else 0)
    for key in optional_feats:
        v.append(track_env.get(key, 0.0) if track_env else 0.0)
    return np.array(v, dtype=np.float32)


def simulate_stint(compound, laps, base_lap, model, compound_cols, optional_feats, SEQ_LEN, track_env):
    device = torch.device("cpu")
    if model is not None and hasattr(model, "lstm") and hasattr(model.lstm, "input_size"):
        input_size = int(model.lstm.input_size)
    else:
        input_size = len(compound_cols) + 2 + len(optional_feats)

    window = np.zeros((SEQ_LEN, input_size), dtype=np.float32)
    times = []

    for lap in range(1, laps + 1):
        prev_deg = (times[-1] - base_lap) if times else 0.0
        feat = build_feature_vector(prev_deg, lap, compound, compound_cols, optional_feats, track_env)
        feat = np.pad(feat, (0, max(0, input_size - len(feat))))[:input_size]
        window = np.vstack([window[1:], feat])

        if model is not None:
            try:
                inp = torch.tensor(window, dtype=torch.float32).unsqueeze(0).to(device)
                with torch.no_grad():
                    out = model(inp)
                deg_pred = float(out.detach().cpu().numpy().ravel()[-1])
            except Exception:
                deg_pred = 0.0
        else:
            deg_pred = 0.0

        tyre_penalty = tyre_degradation(compound, lap)
        lap_time = float(base_lap) + deg_pred + tyre_penalty
        lap_time = apply_environment_modifiers(lap_time, lap, track_env)
        times.append(lap_time)

    return np.array(times)


def simulate_race(strategy, base_lap_time, pit_loss, model, compound_cols, optional_feats, SEQ_LEN, track_env=None, driverId=None, constructorId=None, circuitId=None):
    total = 0.0
    all_laps = []
    for idx, (compound, stint_laps) in enumerate(strategy):
        stint_laps = int(stint_laps)
        if stint_laps <= 0:
            continue
        stint_times = simulate_stint(compound, stint_laps, base_lap_time, model, compound_cols, optional_feats, SEQ_LEN, track_env)
        total += np.sum(stint_times)
        all_laps.extend(stint_times.tolist())
        if idx < len(strategy) - 1:
            total += pit_loss
    return total, np.array(all_laps)


def suggest_strategy(track: str, base_lap_time: float, pit_loss: float, driverId: int, constructorId: int, circuitId: int):
    model, _device = _load_deg_model()
    compound_cols = [f"compound_{c}" for c in ["SOFT", "MEDIUM", "HARD"]]
    optional_feats = ["track_temp", "air_temp", "wind_speed"]
    seq_len = 10

    track_key = (track or "").strip().title()
    track_meta = TRACK_PARAMS.get(track_key, {})
    total_laps = int(track_meta.get("laps", 57 if track_key == "Bahrain" else 50))

    track_env = {"track_temp": 30, "air_temp": 26, "wind_speed": 2.0}

    candidates = [
        [("SOFT", 12), ("MEDIUM", total_laps - 12)],
        [("SOFT", 10), ("MEDIUM", 20), ("HARD", total_laps - 30)],
        [("MEDIUM", total_laps // 2), ("HARD", total_laps - (total_laps // 2))],
        [("SOFT", 15), ("HARD", total_laps - 15)],
    ]

    best_strategy, best_time = None, float("inf")
    for strat in candidates:
        if any(stint_laps <= 0 for _, stint_laps in strat):
            continue
        total, _ = simulate_race(
            strat,
            base_lap_time,
            pit_loss,
            model,
            compound_cols,
            optional_feats,
            seq_len,
            track_env,
        )
        if total < best_time:
            best_time, best_strategy = total, strat

    if best_strategy is None:
        return {"best_strategy": None, "predicted_time": None}
    return {"best_strategy": best_strategy, "predicted_time": round(best_time, 3)}
