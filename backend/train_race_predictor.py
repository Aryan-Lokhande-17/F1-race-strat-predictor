import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
from lightgbm import LGBMRegressor
import joblib

# Load engineered dataset
df = pd.read_csv("backend/excelfiles/hybrid_pace_features.csv")

# Core modeling features
FEATURES = [
    "grid",
    "driver_strength_career", "driver_strength_season",
    "team_strength",
    "driver_dnf_rate", "team_dnf_rate",
    "driver_track_form", "team_track_form"
]

TARGET = "finishing_position"

X = df[FEATURES].astype(float)
y = df[TARGET].astype(float)

# Train/test split by year (avoid leakage across seasons)
train = df["year"] <= 2021
test = df["year"] >= 2022

X_train, y_train = X[train], y[train]
X_test, y_test = X[test], y[test]

model = LGBMRegressor(
    n_estimators=800,
    learning_rate=0.03,
    num_leaves=45,
    subsample=0.85,
    colsample_bytree=0.8,
    reg_alpha=0.1,
    reg_lambda=0.3
)

model.fit(X_train, y_train)

pred = model.predict(X_test)
mae = mean_absolute_error(y_test, pred)
print(f"\n✅ Race Model MAE: {mae:.3f}")

# Save model + feature list
joblib.dump(model, "backend/models/race_pace_predictor.pkl")
pd.Series(FEATURES).to_csv("backend/models/race_model_features.txt", index=False)

print("\nModel saved → backend/models/race_pace_predictor.pkl")
