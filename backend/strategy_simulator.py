import torch
import numpy as np

def build_feature_vector(prev_deg, lap, compound, compound_cols, optional_feats, track_env):
    v = [prev_deg, lap]

    for c in compound_cols:
        v.append(1 if c == f"compound_{compound.upper()}" else 0)

    for key in optional_feats:
        v.append(track_env.get(key, 0.0) if track_env else 0.0)

    return np.array(v, dtype=np.float32)


def simulate_stint(compound, laps, base_lap, model, compound_cols, optional_feats, SEQ_LEN, track_env):
    window = np.zeros((SEQ_LEN, len(compound_cols) + 2 + len(optional_feats)), dtype=np.float32)
    times = []

    for lap in range(1, laps+1):
        prev_deg = times[-1] - base_lap if times else 0.0
        feat = build_feature_vector(prev_deg, lap, compound, compound_cols, optional_feats, track_env)

        window = np.vstack([window[1:], feat])
        inp = torch.tensor(window, dtype=torch.float32).unsqueeze(0)

        with torch.no_grad():
            deg_pred = model(inp).numpy()[0]

        lap_time = base_lap + deg_pred
        times.append(float(lap_time))

    return np.array(times)


def simulate_race(strategy, base_lap_time, pit_loss, model, compound_cols, optional_feats, SEQ_LEN, track_env=None):
    total = 0.0
    all_laps = []

    for compound, stint_laps in strategy:
        stint_times = simulate_stint(compound, stint_laps, base_lap_time, model, compound_cols, optional_feats, SEQ_LEN, track_env)
        total += np.sum(stint_times)
        all_laps.extend(stint_times.tolist())
        total += pit_loss

    return total, np.array(all_laps)
