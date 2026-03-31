"""Professional-grade F1 strategy backend.

Run:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Literal, Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

# Optional FastF1 import (works offline with synthetic fallback)
try:
    import fastf1  # type: ignore
    from fastf1.core import Session  # type: ignore
except Exception:  # pragma: no cover
    fastf1 = None
    Session = object

BASE_DIR = Path(__file__).resolve().parent
CACHE_DIR = BASE_DIR / ".fastf1_cache"

COMPOUND_BASE_PACE = {"SOFT": 0.0, "MEDIUM": 0.35, "HARD": 0.75}
COMPOUND_DEG = {"SOFT": 0.095, "MEDIUM": 0.062, "HARD": 0.046}


class CompareRequest(BaseModel):
    year: int = Field(default=2024, ge=2018)
    event: str = Field(default="Bahrain Grand Prix")
    session: str = Field(default="R")
    driver: str = Field(default="VER")
    track_temp_c: float = Field(default=32.0)
    air_temp_c: float = Field(default=26.0)
    fuel_load_kg: float = Field(default=28.3, ge=5.0, le=120.0)
    total_laps: int = Field(default=57, ge=10, le=90)


class StrategyCard(BaseModel):
    name: Literal["Default", "Alternate"]
    pit_stops: int
    pit_laps: List[int]
    compounds: List[str]
    total_time_s: float
    total_time_fmt: str
    lap_numbers: List[int]
    predicted_lap_times: List[float]
    smoothed_prediction: List[float]
    reference_actual_lap_times: List[float]


class CompareResponse(BaseModel):
    race: str
    generated_at_utc: str
    session_forecast: Dict[str, float]
    fuel_load: Dict[str, float]
    default_strategy: StrategyCard
    alternate_strategy: StrategyCard
    delta_seconds: float


@dataclass
class TrainedModel:
    pipeline: Pipeline
    train_rows: int


class FastF1DataService:
    def __init__(self, cache_dir: Path) -> None:
        self.cache_dir = cache_dir
        self._cache_enabled = False
        self._enable_cache()

    def _enable_cache(self) -> None:
        if fastf1 is None:
            return
        try:
            self.cache_dir.mkdir(parents=True, exist_ok=True)
            fastf1.Cache.enable_cache(str(self.cache_dir))
            self._cache_enabled = True
        except Exception:
            self._cache_enabled = False

    def load_driver_laps(
        self,
        year: int,
        event: str,
        session_code: str,
        driver: str,
    ) -> pd.DataFrame:
        """Load laps with robust fallback for rate limits and API/data issues."""
        if fastf1 is None:
            return self.synthetic_laps(driver=driver)

        try:
            sess: Session = fastf1.get_session(year, event, session_code)
            sess.load(laps=True, telemetry=False, weather=True)
            laps = sess.laps.pick_drivers(driver).copy()
            if laps.empty:
                return self.synthetic_laps(driver=driver)

            laps = laps[["LapNumber", "LapTime", "Compound", "TyreLife", "Stint"]].copy()
            laps["LapTimeSeconds"] = laps["LapTime"].dt.total_seconds()
            laps = laps.dropna(subset=["LapTimeSeconds", "Compound", "LapNumber"]).reset_index(drop=True)
            if laps.empty:
                return self.synthetic_laps(driver=driver)
            return laps
        except Exception as exc:
            if "RateLimitExceeded" in str(exc) or "429" in str(exc):
                return self.synthetic_laps(driver=driver)
            return self.synthetic_laps(driver=driver)

    @staticmethod
    def synthetic_laps(driver: str, n_laps: int = 45) -> pd.DataFrame:
        rng = np.random.default_rng(abs(hash(driver)) % (2**32))
        compounds = np.where(np.arange(n_laps) < 15, "SOFT", np.where(np.arange(n_laps) < 30, "MEDIUM", "HARD"))
        tyre_life = np.concatenate([np.arange(1, 16), np.arange(1, 16), np.arange(1, n_laps - 30 + 1)])
        base = 92.2
        deg = np.array([COMPOUND_DEG[c] for c in compounds])
        lap = np.arange(1, n_laps + 1)
        lap_times = base + np.array([COMPOUND_BASE_PACE[c] for c in compounds]) + deg * tyre_life + 0.012 * lap
        lap_times += rng.normal(0, 0.08, size=n_laps)
        return pd.DataFrame(
            {
                "LapNumber": lap,
                "LapTimeSeconds": lap_times,
                "Compound": compounds,
                "TyreLife": tyre_life,
                "Stint": np.where(lap <= 15, 1, np.where(lap <= 30, 2, 3)),
            }
        )


def engineer_features(laps: pd.DataFrame, track_temp: float, air_temp: float) -> pd.DataFrame:
    df = laps.copy()
    df["lap_number"] = df["LapNumber"].astype(int)
    df["tyre_age"] = df["TyreLife"].fillna(1).astype(float)
    df["compound"] = df["Compound"].astype(str).str.upper()
    df["track_temp"] = float(track_temp)
    df["air_temp"] = float(air_temp)
    # estimated fuel load proxy; used to capture mechanical wear + mass effect
    max_lap = max(1, int(df["lap_number"].max()))
    df["estimated_fuel_load"] = (max_lap - df["lap_number"]) * 1.7
    # explicit degradation channels
    df["thermal_degradation"] = df["tyre_age"] * (df["track_temp"] / 35.0)
    df["mechanical_wear"] = df["tyre_age"] * (1.0 + (df["lap_number"] / max_lap) * 0.15)
    return df


def train_lap_time_model(train_df: pd.DataFrame) -> TrainedModel:
    features = ["tyre_age", "compound", "track_temp", "air_temp", "estimated_fuel_load", "lap_number", "thermal_degradation", "mechanical_wear"]
    target = "LapTimeSeconds"

    X = train_df[features].copy()
    y = train_df[target].astype(float).values

    pre = ColumnTransformer(
        transformers=[
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore"),
                ["compound"],
            )
        ],
        remainder="passthrough",
    )

    model = RandomForestRegressor(
        n_estimators=240,
        max_depth=10,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )

    pipe = Pipeline([("prep", pre), ("rf", model)])
    pipe.fit(X, y)
    return TrainedModel(pipeline=pipe, train_rows=len(train_df))


def format_race_time(total_seconds: float) -> str:
    minutes = int(total_seconds // 60)
    seconds = int(total_seconds % 60)
    millis = int(round((total_seconds - int(total_seconds)) * 1000))
    return f"{minutes:02d}:{seconds:02d}.{millis:03d}"


def moving_average(values: np.ndarray, window: int = 3) -> np.ndarray:
    if len(values) < window:
        return values.copy()
    series = pd.Series(values)
    return series.rolling(window=window, min_periods=1, center=True).mean().to_numpy()


def simulate_stint_laps(
    model: Pipeline,
    compounds: List[str],
    pit_laps: List[int],
    total_laps: int,
    track_temp: float,
    air_temp: float,
    fuel_load_kg: float,
) -> pd.DataFrame:
    rows: List[Dict[str, float | int | str]] = []
    cut_points = sorted([p for p in pit_laps if 1 < p < total_laps])

    stint_start = 1
    compound_idx = 0
    for lap in range(1, total_laps + 1):
        if cut_points and lap > cut_points[0]:
            cut_points.pop(0)
            stint_start = lap
            compound_idx = min(compound_idx + 1, len(compounds) - 1)

        tyre_age = lap - stint_start + 1
        compound = compounds[compound_idx]
        # rough fuel effect: ~0.03s per kg, burns ~1.7kg/lap
        remaining_fuel = max(0.0, fuel_load_kg - 1.7 * (lap - 1))
        fuel_penalty = 0.03 * remaining_fuel

        rows.append(
            {
                "lap_number": lap,
                "tyre_age": float(tyre_age),
                "compound": compound,
                "track_temp": float(track_temp),
                "air_temp": float(air_temp),
                "estimated_fuel_load": remaining_fuel,
                "thermal_degradation": float(tyre_age) * (float(track_temp) / 35.0),
                "mechanical_wear": float(tyre_age) * (1.0 + (lap / max(1, total_laps)) * 0.15),
                "fuel_penalty": fuel_penalty,
            }
        )

    sim = pd.DataFrame(rows)
    pred = model.predict(sim[["tyre_age", "compound", "track_temp", "air_temp", "estimated_fuel_load", "lap_number", "thermal_degradation", "mechanical_wear"]])
    sim["predicted_lap_time"] = pred + sim["fuel_penalty"]
    sim["smoothed_prediction"] = moving_average(sim["predicted_lap_time"].to_numpy(), window=5)
    return sim


def default_strategy(total_laps: int) -> Dict[str, List[int] | List[str]]:
    p1 = int(total_laps * 0.34)
    p2 = int(total_laps * 0.68)
    return {"compounds": ["MEDIUM", "HARD", "HARD"], "pit_laps": [p1, p2]}


def alternate_strategy(total_laps: int) -> Dict[str, List[int] | List[str]]:
    p1 = int(total_laps * 0.22)
    p2 = int(total_laps * 0.55)
    return {"compounds": ["SOFT", "MEDIUM", "HARD"], "pit_laps": [p1, p2]}


def build_strategy_card(
    name: Literal["Default", "Alternate"],
    strategy: Dict[str, List[int] | List[str]],
    simulator_df: pd.DataFrame,
    reference_actual: np.ndarray,
) -> StrategyCard:
    total_time = float(simulator_df["predicted_lap_time"].sum())
    return StrategyCard(
        name=name,
        pit_stops=len(strategy["pit_laps"]),
        pit_laps=list(strategy["pit_laps"]),
        compounds=list(strategy["compounds"]),
        total_time_s=round(total_time, 3),
        total_time_fmt=format_race_time(total_time),
        lap_numbers=simulator_df["lap_number"].astype(int).tolist(),
        predicted_lap_times=np.round(simulator_df["predicted_lap_time"].to_numpy(), 3).tolist(),
        smoothed_prediction=np.round(simulator_df["smoothed_prediction"].to_numpy(), 3).tolist(),
        reference_actual_lap_times=np.round(reference_actual, 3).tolist(),
    )


def compare_strategies(req: CompareRequest, service: FastF1DataService) -> CompareResponse:
    raw_laps = service.load_driver_laps(req.year, req.event, req.session, req.driver)
    model_df = engineer_features(raw_laps, req.track_temp_c, req.air_temp_c)
    model_df["LapTimeSeconds"] = raw_laps["LapTimeSeconds"].astype(float).values

    trained = train_lap_time_model(model_df)
    reference_actual = np.interp(
        np.arange(1, req.total_laps + 1),
        raw_laps["LapNumber"].astype(int).to_numpy(),
        raw_laps["LapTimeSeconds"].astype(float).to_numpy(),
    )

    d_strategy = default_strategy(req.total_laps)
    a_strategy = alternate_strategy(req.total_laps)

    d_sim = simulate_stint_laps(
        trained.pipeline,
        compounds=list(d_strategy["compounds"]),
        pit_laps=list(d_strategy["pit_laps"]),
        total_laps=req.total_laps,
        track_temp=req.track_temp_c,
        air_temp=req.air_temp_c,
        fuel_load_kg=req.fuel_load_kg,
    )
    a_sim = simulate_stint_laps(
        trained.pipeline,
        compounds=list(a_strategy["compounds"]),
        pit_laps=list(a_strategy["pit_laps"]),
        total_laps=req.total_laps,
        track_temp=req.track_temp_c,
        air_temp=req.air_temp_c,
        fuel_load_kg=req.fuel_load_kg,
    )

    default_card = build_strategy_card("Default", d_strategy, d_sim, reference_actual)
    alternate_card = build_strategy_card("Alternate", a_strategy, a_sim, reference_actual)

    return CompareResponse(
        race=req.event,
        generated_at_utc=datetime.utcnow().isoformat() + "Z",
        session_forecast={"track_temp_c": req.track_temp_c, "air_temp_c": req.air_temp_c},
        fuel_load={"kg": req.fuel_load_kg, "equivalent_laps": round(req.fuel_load_kg / 1.82, 1)},
        default_strategy=default_card,
        alternate_strategy=alternate_card,
        delta_seconds=round(alternate_card.total_time_s - default_card.total_time_s, 3),
    )


service = FastF1DataService(cache_dir=CACHE_DIR)
app = FastAPI(title="F1 Strategy Predictor API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/strategy/compare", response_model=CompareResponse)
def strategy_compare(req: CompareRequest) -> CompareResponse:
    try:
        return compare_strategies(req, service)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Strategy comparison failed: {exc}") from exc
