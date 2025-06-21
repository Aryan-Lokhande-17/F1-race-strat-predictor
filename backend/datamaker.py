import fastf1
import pandas as pd

# Enable FastF1 cache
fastf1.Cache.enable_cache('cache')

# List of races you want
races = [
    'Bahrain', 'Saudi Arabia', 'Chinese', 'Japanese',
    'Miami', 'Spanish', 'Austrian', 'British',
    'Dutch', 'Monza', 'Abu Dhabi'
]

year = 2024
all_stints = []

for race in races:
    try:
        print(f"Loading {race} {year}...")
        session = fastf1.get_session(year, race, 'R')
        session.load()
        
        laps = session.laps.copy()
        results = session.results.set_index('DriverNumber')
        
        # Get stint summary: one row = one stint for a driver
        stint_data = laps.groupby(['Driver', 'Stint']).agg({
            'Compound': 'first',
            'LapNumber': ['min', 'max']
        })
        
        stint_data.columns = ['Compound', 'StintStartLap', 'StintEndLap']
        stint_data = stint_data.reset_index()
        
        # Add grid position and track name
        stint_data['Track'] = race
        stint_data['GridPosition'] = stint_data['Driver'].map(
            lambda drv: results.loc[session.get_driver(drv)['DriverNumber']]['GridPosition']
            if session.get_driver(drv)['DriverNumber'] in results.index else None
        )
        
        # Compute stint length
        stint_data['StintLength'] = stint_data['StintEndLap'] - stint_data['StintStartLap'] + 1
        
        # Keep columns we want
        stint_data = stint_data[['Track', 'Driver', 'GridPosition', 'Stint', 'Compound', 'StintLength']]
        
        all_stints.append(stint_data)
        
    except Exception as e:
        print(f"❌ Failed to load {race} {year}: {e}")

# Combine all
df = pd.concat(all_stints, ignore_index=True)

# Save to CSV
df.to_csv("f1_2024_stint_data.csv", index=False)

print("\n✅ Dataset saved as f1_2024_stint_data.csv")
