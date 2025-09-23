import fastf1
import pandas as pd

# Enable FastF1 cache
fastf1.Cache.enable_cache("cache")


def extract_lap_data(session):
    try:
        session.load(laps=True, weather=True, telemetry=False, messages=True)
    except Exception as e:
        print(f"❌ Failed to load {session.event['EventName']} {session.event.year}: {e}")
        return pd.DataFrame()

    laps = session.laps.copy()
    if laps.empty:
        print(f"❌ No lap data for {session.event['EventName']} {session.event.year}")
        return pd.DataFrame()

    # Map tyre compounds
    compound_map = {
        "SOFT": "C5", "MEDIUM": "C3", "HARD": "C1",
        "C0": "C0", "C1": "C1", "C2": "C2", "C3": "C3", "C4": "C4", "C5": "C5", "C6": "C6",
        "INTERMEDIATE": "INTER", "WET": "WET"
    }
    laps["CompoundMapped"] = laps["Compound"].map(compound_map).fillna(laps["Compound"])

    # Merge track status safely
    track_status = session.track_status.copy()
    if not track_status.empty and "Time" in track_status.columns:
        track_status = track_status.rename(columns={"Status": "TrackStatus"})
        laps = pd.merge_asof(laps.sort_values("LapStartTime"),
                             track_status.sort_values("Time")[["Time", "TrackStatus"]],
                             left_on="LapStartTime", right_on="Time",
                             direction="backward")
        laps.drop(columns=["Time"], inplace=True, errors="ignore")
    else:
        laps["TrackStatus"] = pd.NA

    # Merge weather safely
    weather = session.weather_data.copy()
    if not weather.empty and "Time" in weather.columns:
        weather = weather.rename(columns={"TrackTemp": "TrackTemp_C", "AirTemp": "AirTemp_C"})
        laps = pd.merge_asof(laps.sort_values("LapStartTime"),
                             weather.sort_values("Time")[["Time", "AirTemp_C", "TrackTemp_C", "Rainfall"]],
                             left_on="LapStartTime", right_on="Time",
                             direction="backward")
        laps.drop(columns=["Time"], inplace=True, errors="ignore")
    else:
        laps["AirTemp_C"] = pd.NA
        laps["TrackTemp_C"] = pd.NA
        laps["Rainfall"] = pd.NA

    # Select useful columns that exist
    cols = [
        "Driver", "LapNumber", "LapTime", "Stint", "CompoundMapped",
        "TrackStatus", "AirTemp_C", "TrackTemp_C", "Rainfall", "IsAccurate"
    ]
    available_cols = [c for c in cols if c in laps.columns]
    return laps[available_cols].copy()


def build_dataset(start_year=2024, end_year=2025):
    all_data = []
    missing_races = []  # Track missing races

    for year in range(start_year, end_year + 1):
        print(f"\n📅 Loading season {year}")
        try:
            schedule = fastf1.get_event_schedule(year, backend="ergast")
        except Exception as e:
            print(f"⚠️ Failed to load schedule for {year}: {e}")
            schedule = None

        if schedule is None or schedule.empty:
            rounds = range(1, 25)
        else:
            rounds = schedule["RoundNumber"].unique()

        for rnd in rounds:
            try:
                session = fastf1.get_session(year, int(rnd), "R")
                print(f"📡 Loading {session.event['EventName']} {year}")
                lap_data = extract_lap_data(session)
                if not lap_data.empty:
                    lap_data.loc[:, "Year"] = year
                    lap_data.loc[:, "Round"] = rnd
                    lap_data.loc[:, "EventName"] = session.event["EventName"]
                    all_data.append(lap_data)
                    print(f"✅ Loaded {len(lap_data)} laps for {session.event['EventName']} {year}")
                else:
                    print(f"❌ No lap data for {session.event['EventName']} {year}")
                    missing_races.append((year, rnd, session.event['EventName']))
            except Exception as e:
                print(f"❌ Failed round {rnd} {year}: {e}")
                missing_races.append((year, rnd, f"Round {rnd}"))

    if not all_data:
        print("⚠️ No data collected!")
        return pd.DataFrame()

    dataset = pd.concat(all_data, ignore_index=True)
    dataset.to_csv("race_dataset_24_25.csv", index=False)
    print(f"\n💾 Dataset saved: {len(dataset)} laps total")

    # Print or save missing races
    if missing_races:
        print("\n⚠️ Missing races:")
        for m in missing_races:
            print(f"Year: {m[0]}, Round: {m[1]}, Event: {m[2]}")
        pd.DataFrame(missing_races, columns=["Year", "Round", "EventName"]).to_csv("missing_races_24_25.csv", index=False)

    return dataset


if __name__ == "__main__":
    dataset = build_dataset(2018, 2025)
