# F1 Strategy Predictor — 2025 Data-Centric Edition

This project focused on race strategy and tyre degradation modeling.


---

## Why this matters in F1

A seemingly small degradation shift (e.g., **+0.2s/lap**) compounds rapidly:

- Over **50 laps** = **+10 seconds**
- Over a pit-window phase = undercut/overcut opportunity gain/loss

That is why this project prioritizes **lap-time evolution** and **degradation-aware strategy timing** rather than winner classification.

---

## Architecture

### Data Engineering (2025 season)

Use notebook: `backend/notebooks/data_retrieval_2025.ipynb`.

It retrieves **completed 2025 Race sessions only** and exports:

- `TyreLife`
- `Compound`
- `TrackStatus`
- `LapTimeSeconds`
- `FuelLoadKgEst` (estimated)
- `AirTemp`
- `TrackTemp`
- thermal/mechanical wear indices

Output dataset:

- `backend/data/strategy_2025_race_only.csv`

### Backend

- Primary API: `backend/main.py`
- Model: `RandomForestRegressor`
- Modeling focus: relation among
  - `TyreLife`
  - `Compound`
  - `TrackTemp`
  - (plus fuel and wear proxies)
  to predict lap-time evolution.

### Frontend

- Streamlit UI: `frontend/streamlit_app.py`
- F1 dark theme
- Main KPI: **Total Race Time Delta** between Default and Alternate strategy

---

## Thermal Degradation vs Mechanical Wear Logic

The model uses two explicit degradation channels:

1. **Thermal degradation**
   - increases with tyre life and track temperature
   - proxy: `TyreLife * (TrackTemp / 35)`

2. **Mechanical wear**
   - increases with tyre life and lap progression/load effects
   - proxy: `TyreLife * (1 + LapNumber/max_lap * 0.15)`

These are used alongside compound and fuel proxies to shape lap-time prediction curves.

---

## Setup (.venv)

```bash
cd /workspace/F1-race-strat-predictor
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -r backend/requirements.txt
```

---

## Run order (important)

### 1) Retrieve 2025 data first

```bash
cd backend/notebooks
jupyter notebook data_retrieval_2025.ipynb
```

Run all cells to produce `backend/data/strategy_2025_race_only.csv`.

### 2) Start backend API

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3) Launch Streamlit UI

```bash
cd frontend
streamlit run streamlit_app.py
```

---

## API

### `POST /strategy/compare`

Example payload:

```json
{
  "year": 2025,
  "event": "Bahrain Grand Prix",
  "session": "R",
  "driver": "VER",
  "track_temp_c": 32,
  "air_temp_c": 26,
  "fuel_load_kg": 28.3,
  "total_laps": 57
}
```

Response includes:

- `default_strategy`
- `alternate_strategy`
- `delta_seconds` (primary KPI)

---

## PR Sync

This branch is a conflict-resolution refresh derived from the strategy-only mainline state.

## Notes

- Pipeline is modular and plug-and-play for 2025 race sessions.
- If FastF1 calls fail/rate-limit, backend falls back to synthetic race-like laps so UI remains operational.
