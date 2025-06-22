import fastf1
import pandas as pd

fastf1.Cache.enable_cache('cache')

races = [
    'Bahrain', 'Saudi Arabia', 'Chinese', 'Japanese', 'Miami',
    'Spanish', 'Austrian', 'British', 'Dutch', 'Monza', 'Abu Dhabi'
]

data_list = []

for race in races:
    try:
        session = fastf1.get_session(2024, race, 'R')
        session.load()
        print(f"✅ Loaded {race}")
    except Exception as e:
        print(f"❌ Could not load {race}: {e}")
        continue

    weather = session.weather_data
    avg_air_temp = weather['AirTemp'].mean() if weather is not None else None
    avg_track_temp = weather['TrackTemp'].mean() if weather is not None else None

    results = session.results.set_index('Abbreviation')
    laps = session.laps

    if laps.empty:
        continue

    for drv in laps['Driver'].unique():
        drv_laps = laps.pick_driver(drv).sort_values('LapNumber')

        stint_num = 1
        current_compound = None
        stint_lap_count = 0
        pit_lap = None

        for idx, lap in drv_laps.iterrows():
            compound = lap['Compound']
            lap_num = lap['LapNumber']

            if current_compound is None:
                # First stint starts
                current_compound = compound
                stint_lap_count = 1
                pit_lap = None
            elif compound != current_compound:
                # Compound change = new stint
                data_list.append({
                    'Track': race,
                    'Driver': drv,
                    'Team': results.loc[drv]['TeamName'] if drv in results.index else None,
                    'GridPosition': results.loc[drv]['GridPosition'] if drv in results.index else None,
                    'Stint': stint_num,
                    'Compound': current_compound,
                    'StintLength': stint_lap_count,
                    'PitLap': pit_lap,
                    'AvgAirTemp': avg_air_temp,
                    'AvgTrackTemp': avg_track_temp
                })
                stint_num += 1
                current_compound = compound
                stint_lap_count = 1
                pit_lap = lap_num
            else:
                stint_lap_count += 1

        # Add the final stint
        if stint_lap_count > 0:
            data_list.append({
                'Track': race,
                'Driver': drv,
                'Team': results.loc[drv]['TeamName'] if drv in results.index else None,
                'GridPosition': results.loc[drv]['GridPosition'] if drv in results.index else None,
                'Stint': stint_num,
                'Compound': current_compound,
                'StintLength': stint_lap_count,
                'PitLap': pit_lap,
                'AvgAirTemp': avg_air_temp,
                'AvgTrackTemp': avg_track_temp
            })

# Create DataFrame
df = pd.DataFrame(data_list)

# Save to CSV
df.to_csv('race_strategy_dataset.csv', index=False)

print("📁 Saved dataset as 'race_strategy_dataset.csv'")
