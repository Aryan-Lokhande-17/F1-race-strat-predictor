# backend/strategy_simulator.py
import os
from pathlib import Path
import numpy as np
import pandas as pd
import joblib
import torch
from typing import List, Tuple, Dict, Optional

BASE_DIR = Path(__file__).resolve().parent

# -------------------------
# Models & references
# -------------------------
RACE_MODEL_PATH = BASE_DIR / "models" / "race_pace_predictor.pkl"
race_model = None
if RACE_MODEL_PATH.exists():
    try:
        race_model = joblib.load(RACE_MODEL_PATH)
    except Exception as e:
        print(f"[WARN] Failed to load joblib race model: {e}")

DEG_MODEL_PATH = BASE_DIR / "models" / "hybrid_opt3_final.pth"
_deg_model = None  # (model, device)

PACE_REF_PATH = BASE_DIR / "Excelfiles" / "hybrid_pace_features.csv"
if PACE_REF_PATH.exists():
    PACE_REF = pd.read_csv(PACE_REF_PATH).drop_duplicates(
        ["driverId", "constructorId", "circuitId"]
    )
else:
    PACE_REF = pd.DataFrame()

# -------------------------
# Startup summary
# -------------------------
def _startup_reminder():
    print("=== Simulator startup summary ===")
    print(f"race_model (joblib) present: {RACE_MODEL_PATH.exists()}")
    print(f"degradation model (pth) present: {DEG_MODEL_PATH.exists()}")
    print(f"pace reference present: {PACE_REF_PATH.exists()} | rows: {len(PACE_REF)}")
    print("=================================")

_startup_reminder()


# -------------------------
# Model loader
# -------------------------
def _load_deg_model():
    global _deg_model
    if _deg_model is not None:
        return _deg_model

    if not DEG_MODEL_PATH.exists():
        print("[INFO] Degradation model file not found, fallback heuristics will be used.")
        _deg_model = (None, torch.device("cpu"))
        return _deg_model

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    try:
        # Try direct torch.jit or standard model
        model = torch.jit.load(str(DEG_MODEL_PATH), map_location=device)
        model.eval().to(device)
        print(f"[INFO] Loaded scripted degradation model on {device}")
        _deg_model = (model, device)
        return _deg_model
    except Exception as e:
        print(f"[WARN] Could not fully load deg model: {e}")
        _deg_model = (None, device)
        return _deg_model


# -------------------------
# Tyre degradation + environment
# -------------------------
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

def apply_environment_modifiers(lap_time, compound, stint_lap, track_env):
    if not track_env:
        return lap_time
    if "track_temp" in track_env:
        lap_time += (track_env["track_temp"] - 30) * 0.015
    if "air_temp" in track_env and stint_lap <= 3:
        lap_time += (track_env["air_temp"] - 25) * 0.025
    if "wind_speed" in track_env:
        lap_time += np.random.normal(0, track_env["wind_speed"] * 0.02)
    return lap_time


# -------------------------
# Simulation logic
# -------------------------
def build_feature_vector(prev_deg, lap, compound, compound_cols, optional_feats, track_env):
    v = [prev_deg, lap]
    for c in compound_cols:
        v.append(1 if c == f"compound_{compound.upper()}" else 0)
    for key in optional_feats:
        v.append(track_env.get(key, 0.0) if track_env else 0.0)
    v.append(0.0)
    return np.array(v, dtype=np.float32)


def simulate_stint(compound, laps, base_lap, model, compound_cols, optional_feats,
                   SEQ_LEN, track_env, driverId, constructorId, circuitId):
    device = torch.device("cpu")
    input_size = getattr(model, "input_dim", len(compound_cols) + 3 + len(optional_feats))
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
                out_np = out.detach().cpu().numpy()
                deg_pred = float(out_np.ravel()[-1])
            except Exception as e:
                print(f"[WARN] deg model inference error (lap {lap}): {e}")
                deg_pred = 0.0
        else:
            deg_pred = 0.0

        tyre_penalty = tyre_degradation(compound, lap)
        lap_time = float(base_lap) + deg_pred + tyre_penalty
        lap_time = apply_environment_modifiers(lap_time, compound, lap, track_env)

        # Driver/team modifiers
        if driverId and race_model is not None and len(PACE_REF) > 0:
            row = PACE_REF[
                (PACE_REF.driverId == driverId)
                & (PACE_REF.constructorId == constructorId)
                & (PACE_REF.circuitId == circuitId)
            ]
            if len(row) > 0:
                try:
                    pred_finish = race_model.predict(
                        row[[
                            "grid_position", "driver_strength_career", "driver_strength_season",
                            "team_strength", "driver_dnf_rate", "team_dnf_rate",
                            "driver_track_form", "team_track_form"
                        ]]
                    )[0]
                    pace_factor = 1.0 + (pred_finish - 1.0) * 0.011
                    lap_time *= pace_factor
                except Exception as e:
                    print(f"[WARN] pace factor failed: {e}")

        times.append(lap_time)

    return np.array(times)


def simulate_race(strategy, base_lap_time, pit_loss, model, compound_cols, optional_feats,
                  SEQ_LEN, track_env=None, driverId=None, constructorId=None, circuitId=None):
    total = 0.0
    all_laps = []
    for idx, (compound, stint_laps) in enumerate(strategy):
        stint_times = simulate_stint(compound, stint_laps, base_lap_time, model,
                                     compound_cols, optional_feats, SEQ_LEN,
                                     track_env, driverId, constructorId, circuitId)
        total += np.sum(stint_times)
        all_laps.extend(stint_times.tolist())
        if idx < len(strategy) - 1:
            total += pit_loss
    return total, np.array(all_laps)


# -------------------------
# New: Best Strategy Suggestion
# -------------------------
def suggest_strategy(track: str, base_lap_time: float, pit_loss: float,
                     driverId: int, constructorId: int, circuitId: int):
    """Auto-evaluate candidate strategies using degradation + pace model."""
    model, device = _load_deg_model()
    compound_cols = [f"compound_{c}" for c in ["SOFT", "MEDIUM", "HARD"]]
    optional_feats = ["track_temp", "air_temp", "wind_speed"]
    SEQ_LEN = 10

    track_env = {"track_temp": 30, "air_temp": 26, "wind_speed": 2.0}
    total_laps = 57 if track.lower() == "bahrain" else 50

    candidates = [
        [("SOFT", 12), ("MEDIUM", total_laps - 12)],
        [("SOFT", 10), ("MEDIUM", 20), ("HARD", total_laps - 30)],
        [("MEDIUM", total_laps // 2), ("HARD", total_laps // 2)],
        [("SOFT", 15), ("HARD", total_laps - 15)],
    ]

    best_strategy, best_time = None, float("inf")

    for strat in candidates:
        try:
            total, _ = simulate_race(strat, base_lap_time, pit_loss, model,
                                     compound_cols, optional_feats, SEQ_LEN,
                                     track_env, driverId, constructorId, circuitId)
            if total < best_time:
                best_time, best_strategy = total, strat
        except Exception as e:
            print(f"[WARN] Strategy eval failed: {e}")

    return {"best_strategy": best_strategy, "predicted_time": round(best_time, 3)}
    