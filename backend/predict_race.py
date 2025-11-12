import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent

# Load model
race_model = joblib.load(BASE_DIR / "models" / "race_pace_predictor.pkl")

# Load lookup
LOOKUP = pd.read_csv(BASE_DIR / "Excelfiles" / "display_lookup.csv")

# Load precomputed hybrid strength features
PACE_FEATURES = pd.read_csv(BASE_DIR / "Excelfiles" / "hybrid_pace_features.csv")
PACE_FEATURES = PACE_FEATURES.drop_duplicates(["driverId","constructorId","circuitId"])


class DriverEntry(BaseModel):
    driverId: int
    constructorId: int
    grid_position: int

class RacePredictRequest(BaseModel):
    raceId: int
    circuitId: int
    drivers: list[DriverEntry]


@router.get("/driver_list")
def driver_list():
    # minimal clean display
    return LOOKUP[[
        "driverId","constructorId","code","forename","surname","team_name"
    ]].to_dict(orient="records")


@router.post("/predict_race_result")
def predict_race_result(req: RacePredictRequest):

    rows = [
        [req.raceId, d.driverId, d.constructorId, d.grid_position, req.circuitId]
        for d in req.drivers
    ]

    df = pd.DataFrame(rows, columns=[
        "raceId","driverId","constructorId","grid_position","circuitId"
    ])

    feature_cols = [
        "grid_position", "driver_strength_career", "driver_strength_season",
        "team_strength", "driver_dnf_rate", "team_dnf_rate",
        "driver_track_form", "team_track_form"
    ]

    # attach features
    df = df.merge(PACE_FEATURES, on=["driverId","constructorId","circuitId"], how="left")

    X = df[feature_cols].fillna(df[feature_cols].mean())

    pred = race_model.predict(X)

    df["predicted_finish"] = pred
    df = df.sort_values("predicted_finish").reset_index(drop=True)
    df["predicted_position"] = df.index + 1

    df = df.merge(LOOKUP, on=["driverId","constructorId"], how="left")

    return {
        "predicted_order": df[[
            "predicted_position", "driverId", "forename", "surname",
            "team_name", "predicted_finish"
        ]].to_dict(orient="records")
    }
