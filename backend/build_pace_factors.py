import pandas as pd
import numpy as np

# Load data
RESULTS = pd.read_csv("backend/excelfiles/results.csv")
DRIVERS = pd.read_csv("backend/excelfiles/drivers.csv")
CONSTRUCTORS = pd.read_csv("backend/excelfiles/constructors.csv")
RACES = pd.read_csv("backend/excelfiles/races.csv")

# Rename for clarity
CONSTRUCTORS = CONSTRUCTORS.rename(columns={"name": "team_name"})
RACES = RACES.rename(columns={"name": "race_name"})

# Merge core tables
df = RESULTS.merge(DRIVERS, on="driverId", how="left") \
            .merge(CONSTRUCTORS, on="constructorId", how="left") \
            .merge(RACES[["raceId","year","round","race_name","circuitId"]], on="raceId", how="left")

# Rename nationality fields
df = df.rename(columns={
    "nationality_x": "driver_nationality",
    "nationality_y": "team_nationality"
})

# Keep hybrid era only
df = df[df["year"] >= 2014].copy()

# Convert finishing position
df["finishing_position"] = df["positionOrder"].astype(int)

# Compute baseline features
df["driver_strength_career"] = df.groupby("driverId")["finishing_position"].transform("mean")
df["driver_strength_season"] = df.groupby(["driverId","year"])["finishing_position"].transform("mean")
df["team_strength"] = df.groupby("constructorId")["finishing_position"].transform("mean")

# DNF
df["dnf"] = (df["statusId"] != 1).astype(int)
df["driver_dnf_rate"] = df.groupby("driverId")["dnf"].transform("mean")
df["team_dnf_rate"] = df.groupby("constructorId")["dnf"].transform("mean")

# Track form
df["driver_track_form"] = df.groupby(["driverId","circuitId"])["finishing_position"].transform("mean")
df["team_track_form"]   = df.groupby(["constructorId","circuitId"])["finishing_position"].transform("mean")

# Final selected columns
keep = [
    "raceId", "driverId", "constructorId",
    "code", "surname", "driver_nationality",
    "team_name", "team_nationality",
    "year", "round", "race_name", "circuitId",
    "grid", "finishing_position",
    "driver_strength_career", "driver_strength_season",
    "team_strength", "driver_dnf_rate", "team_dnf_rate",
    "driver_track_form", "team_track_form"
]

df_final = df[keep].fillna(df.mean(numeric_only=True))

df_final.to_csv("backend/excelfiles/hybrid_pace_features.csv", index=False)

print("Saved → backend/excelfiles/hybrid_pace_features.csv")
print("Rows:", len(df_final))
