import pandas as pd

# Load data
RESULTS = pd.read_csv("backend/Excelfiles/results.csv")
DRIVERS = pd.read_csv("backend/Excelfiles/drivers.csv")
CONSTRUCTORS = pd.read_csv("backend/Excelfiles/constructors.csv")

# Rename team name field
CONSTRUCTORS = CONSTRUCTORS.rename(columns={"name": "team_name"})

# We take the most recent constructor a driver used (max raceId = latest)
latest_team = RESULTS.sort_values("raceId").groupby("driverId").tail(1)[["driverId", "constructorId"]]

# Merge driver → team
lookup = DRIVERS.merge(latest_team, on="driverId", how="left")

# Merge constructor → team name
lookup = lookup.merge(CONSTRUCTORS[["constructorId", "team_name"]], on="constructorId", how="left")

# Keep display fields
lookup = lookup[["driverId", "code", "forename", "surname", "number", "constructorId", "team_name"]]

# Save
lookup.to_csv("backend/Excelfiles/display_lookup.csv", index=False)

print("✅ Saved → backend/Excelfiles/display_lookup.csv")
print("Rows:", len(lookup))
