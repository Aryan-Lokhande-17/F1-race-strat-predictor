from typing import List, Dict, Any
import math
import numpy as np
from strategy_simulator import simulate_race

def _clamp(v, lo, hi):
    return max(lo, min(hi, v))

def _unique(seq):
    seen = set(); out = []
    for item in seq:
        key = (tuple(item["compounds"]), tuple(item["pit_laps"]))
        if key not in seen:
            seen.add(key); out.append(item)
    return out

def candidate_plans(race_laps: int, compounds: List[str]) -> List[Dict[str, Any]]:
    cands: List[Dict[str, Any]] = []

    if "SOFT" in compounds:   cands.append({"compounds": ["SOFT"], "pit_laps": []})
    if "MEDIUM" in compounds: cands.append({"compounds": ["MEDIUM"], "pit_laps": []})
    if "HARD" in compounds:   cands.append({"compounds": ["HARD"], "pit_laps": []})

    two_stop_templates = [
        ["SOFT","MEDIUM","HARD"] if "SOFT" in compounds else ["MEDIUM","MEDIUM","HARD"],
        ["MEDIUM","HARD","HARD"],
        ["SOFT","SOFT","HARD"] if "SOFT" in compounds else ["MEDIUM","MEDIUM","HARD"]
    ]

    three_stop_templates = [
        ["SOFT","MEDIUM","MEDIUM","HARD"] if "SOFT" in compounds else ["MEDIUM","MEDIUM","MEDIUM","HARD"],
        ["SOFT","SOFT","MEDIUM","HARD"] if "SOFT" in compounds else ["MEDIUM","MEDIUM","HARD","HARD"]
    ]

    p1c2 = int(0.33 * race_laps); p2c2 = int(0.66 * race_laps)
    p1c3 = int(0.25 * race_laps); p2c3 = int(0.50 * race_laps); p3c3 = int(0.75 * race_laps)

    for tmpl in two_stop_templates:
        for d1 in [-3,-2,-1,0,1,2,3]:
            for d2 in [-3,-2,-1,0,1,2,3]:
                p1 = _clamp(p1c2 + d1, 10, race_laps-24)
                p2 = _clamp(p2c2 + d2, p1+8, race_laps-8)
                cands.append({"compounds": tmpl, "pit_laps": [p1, p2]})

    for tmpl in three_stop_templates:
        for d1 in [-2,-1,0,1,2]:
            for d2 in [-2,-1,0,1,2]:
                for d3 in [-2,-1,0,1,2]:
                    p1 = _clamp(p1c3 + d1, 8,  race_laps-30)
                    p2 = _clamp(p2c3 + d2, p1+7, race_laps-18)
                    p3 = _clamp(p3c3 + d3, p2+7, race_laps-6)
                    cands.append({"compounds": tmpl, "pit_laps": [p1, p2, p3]})

    return _unique(cands)

def plan_to_strategy(plan: Dict[str, Any], race_laps: int) -> List[tuple]:
    if not plan["pit_laps"]:
        return [(plan["compounds"][0], race_laps)]
    cuts = sorted(plan["pit_laps"])
    lengths = [cuts[0]] + [cuts[i]-cuts[i-1] for i in range(1, len(cuts))] + [race_laps - cuts[-1] + 1 - 1]
    # last term fixes off-by-one so total laps = race_laps
    while sum(lengths) < race_laps:
        lengths[-1] += 1
    while sum(lengths) > race_laps and lengths[-1] > 1:
        lengths[-1] -= 1
    return list(zip(plan["compounds"], lengths))

def evaluate_plans(race_laps: int,
                   compounds: List[str],
                   base_lap: float,
                   pit_loss: float,
                   model,
                   compound_cols,
                   optional_feats,
                   seq_len: int,
                   track_env: dict | None,
                   top_k: int = 5) -> Dict[str, Any]:
    plans = candidate_plans(race_laps, compounds)
    scored = []
    for p in plans:
        strategy = plan_to_strategy(p, race_laps)
        total, laps = simulate_race(
            strategy, base_lap, pit_loss,
            model, compound_cols, optional_feats, seq_len,
            track_env=track_env
        )
        scored.append({
            "compounds": p["compounds"],
            "pit_laps": p["pit_laps"],
            "strategy": strategy,
            "total_race_time": float(total),
            "lap_times": np.round(laps, 3).tolist()
        })
    scored.sort(key=lambda x: x["total_race_time"])
    return {
        "best": scored[0],
        "top": scored[:top_k],
        "evaluated": len(scored)
    }
