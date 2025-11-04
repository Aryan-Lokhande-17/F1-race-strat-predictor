from pathlib import Path

# Define the README content in Markdown format
readme_content = """# 🏎️ Tyre Degradation & Race Strategy Prediction Model

## 1. Data Gathering
- We are creating a model that:
  - Predicts **tyre degradation**.
  - Suggests **race-specific tyre strategies**.
  - Predicts **race winners** based on multiple factors such as:
    - Starting grid
    - Quali performance
    - Performance run data / tyre degradation data
    - Drivers’ past statistics on that track

- **Initial Approach:**
  - We tried using **FastF1**, but due to its API limit set at **500 requests/hour**, it wasn’t viable since our dataset exceeded this limit significantly.

- **Final Solution:**
  - After some research, we switched to **OpenF1** for data gathering.
  - OpenF1 proved to be much more effective with its **API rate limit of 10 requests/second**, making it far more useful for large-scale data collection.

---

## 2. Data Preprocessing
- During the initial preprocessing runs, **almost half of the data was discarded** due to missing values.

- We experimented with **three methods** to handle missing data:

  **a) Global Median:**
  - Takes the global average and fills missing values.
  - Not viable since different drivers generate vastly different data, and the car’s performance also matters.

  **b) Time-Series Interpolation:**
  - Fills gaps by drawing a straight line between the last known and next known value.
  - Example:
    - Lap 4 temp = 25°C
    - Lap 6 temp = 26°C
    - Lap 5 is filled with 25.5°C
  - Works well for smoothly changing data like `air_temperature` or `track_temperature`.
  - Performs poorly for **performance run data**.

  **c) Group Median (Final Choice):**
  - Takes the median **within a defined group**.
  - Grouping factors:
    - `session_id` (e.g., FP1, Sprint Quali, etc.)
    - `driver_number` (e.g., 44 for Lewis Hamilton 🐐)
  - This method provided the most logical and performance-consistent imputation.
"""

# Save to a markdown file
readme_path = Path("/mnt/data/tyre_degradation_readme.md")
readme_path.write_text(readme_content)

readme_path
