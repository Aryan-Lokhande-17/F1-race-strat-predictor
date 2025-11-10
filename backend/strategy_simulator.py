import torch
import numpy as np
import joblib
import pandas as pd
from pathlib import Path

# Load driver/pace reference
BASE_DIR = Path(__file__).resolve().parent
race_model = joblib.load(BASE_DIR / "models" / "race_pace_predictor.pkl")
PACE_REF = pd.read_csv(BASE_DIR / "Excelfiles" / "hybrid_pace_features.csv")
PACE_REF = PACE_REF.drop_duplicates(["driverId", "constructorId", "circuitId"])


def apply_environment_modifiers(lap_time, compound, stint_lap, track_env):
    if not track_env:
        return lap_time

    if "track_temp" in track_env:
        dt = track_env["track_temp"] - 30
        lap_time += dt * 0.015

    if "air_temp" in track_env and stint_lap <= 3:
        da = track_env["air_temp"] - 25
        lap_time += da * 0.025

    if "wind_speed" in track_env:
        lap_time += np.random.normal(0, track_env["wind_speed"] * 0.02)

    return lap_time


def build_feature_vector(prev_deg, lap, compound, compound_cols, optional_feats, track_env):
    v = [prev_deg, lap]

    for c in compound_cols:
        v.append(1 if c == f"compound_{compound.upper()}" else 0)

    for key in optional_feats:
        v.append(track_env.get(key, 0.0) if track_env else 0.0)

    return np.array(v, dtype=np.float32)


def simulate_stint(compound, laps, base_lap, model, compound_cols, optional_feats,
                   SEQ_LEN, track_env, driverId, constructorId, circuitId):

    window = np.zeros((SEQ_LEN, len(compound_cols) + 2 + len(optional_feats)), dtype=np.float32)
    times = []

    for lap in range(1, laps + 1):
        prev_deg = times[-1] - base_lap if times else 0.0
        feat = build_feature_vector(prev_deg, lap, compound, compound_cols, optional_feats, track_env)

        window = np.vstack([window[1:], feat])
        inp = torch.tensor(window, dtype=torch.float32).unsqueeze(0)

        with torch.no_grad():
            deg_pred = model(inp).numpy()[0]

        lap_time = base_lap + deg_pred
        lap_time = apply_environment_modifiers(lap_time, compound, lap, track_env)

        # 🔥 DRIVER-ONLY PACE FACTOR
        if driverId is not None:
            row = PACE_REF[
                (PACE_REF.driverId == driverId) &
                (PACE_REF.constructorId == constructorId) &
                (PACE_REF.circuitId == circuitId)
            ]

            if len(row) > 0:
                pred_finish = race_model.predict(row[[
                    "grid_position", "driver_strength_career", "driver_strength_season",
                    "team_strength", "driver_dnf_rate", "team_dnf_rate",
                    "driver_track_form", "team_track_form"
                ]])[0]

                # Convert predicted finishing rank to lap time multiplier
                pace_factor = 1.0 + (pred_finish - 1.0) * 0.011
                lap_time *= pace_factor

        times.append(float(lap_time))

    return np.array(times)


def simulate_race(strategy, base_lap_time, pit_loss, model, compound_cols, optional_feats,
                  SEQ_LEN, track_env=None, driverId=None, constructorId=None, circuitId=None):

    total = 0.0
    all_laps = []

    for compound, stint_laps in strategy:
        stint_times = simulate_stint(
            compound,
            stint_laps,
            base_lap_time,
            model,
            compound_cols,
            optional_feats,
            SEQ_LEN,
            track_env,
            driverId,
            constructorId,
            circuitId
        )

        total += np.sum(stint_times)
        all_laps.extend(stint_times.tolist())
        total += pit_loss

    return total, np.array(all_laps)
