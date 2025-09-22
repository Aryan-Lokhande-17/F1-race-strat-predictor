import fastf1
import pandas as pd
import json
from datetime import datetime
import os

# Enable FastF1 cache for better performance
fastf1.Cache.enable_cache('cache')

def get_current_season_info():
    """Get current season schedule and race information"""
    try:
        # Get current year
        current_year = datetime.now().year
        
        # Get the schedule for current season
        schedule = fastf1.get_event_schedule(current_year)
        
        # Find current or next race
        now = pd.Timestamp.now()
        upcoming_races = schedule[schedule['Session5Date'] >= now]
        
        if len(upcoming_races) > 0:
            current_race = upcoming_races.iloc[0]
        else:
            # If no upcoming races, get the last race of the season
            current_race = schedule.iloc[-1]
        
        race_info = {
            'track_name': current_race['EventName'],
            'location': current_race['Location'],
            'country': current_race['Country'],
            'round_number': int(current_race['RoundNumber']),
            'total_rounds': len(schedule),
            'race_date': current_race['Session5Date'].strftime('%Y-%m-%d') if pd.notna(current_race['Session5Date']) else None
        }
        
        return race_info
        
    except Exception as e:
        print(f"Error fetching race info: {e}")
        return None

def get_track_info(year, round_number):
    """Get detailed track information"""
    try:
        # Load the race session
        session = fastf1.get_session(year, round_number, 'R')
        session.load()
        
        # Get track info from session
        track_info = {
            'track_length': session.event['TrackLength'] if 'TrackLength' in session.event else None,
            'lap_count': session.event['TotalLaps'] if 'TotalLaps' in session.event else None,
            'turn_count': None,  # This might not be directly available
            'drs_zones': [],  # Would need to be manually added or from another source
            'sectors': 3  # Standard F1 has 3 sectors
        }
        
        return track_info
        
    except Exception as e:
        print(f"Error fetching track info: {e}")
        return None

def get_most_successful_driver(year=None):
    """Calculate most successful driver based on wins"""
    try:
        if year is None:
            year = datetime.now().year
            
        # Get all race results for the year
        schedule = fastf1.get_event_schedule(year)
        driver_wins = {}
        
        for _, race in schedule.iterrows():
            try:
                session = fastf1.get_session(year, race['RoundNumber'], 'R')
                session.load()
                
                # Get race results
                results = session.results
                if len(results) > 0:
                    winner = results.iloc[0]  # First position is the winner
                    driver_name = f"{winner['FirstName']} {winner['LastName']}"
                    driver_wins[driver_name] = driver_wins.get(driver_name, 0) + 1
                    
            except Exception as e:
                print(f"Error processing race {race['RoundNumber']}: {e}")
                continue
        
        if driver_wins:
            most_successful = max(driver_wins, key=driver_wins.get)
            return {
                'driver': most_successful,
                'wins': driver_wins[most_successful],
                'all_wins': driver_wins
            }
        
        return None
        
    except Exception as e:
        print(f"Error calculating most successful driver: {e}")
        return None

def get_current_drivers():
    """Get current F1 drivers from the latest session"""
    try:
        # Get current year
        current_year = datetime.now().year
        
        # Get the schedule
        schedule = fastf1.get_event_schedule(current_year)
        
        # Find the most recent completed race or current race
        now = pd.Timestamp.now()
        completed_races = schedule[schedule['Session5Date'] < now]
        
        if len(completed_races) > 0:
            # Use the most recent completed race
            race_event = completed_races.iloc[-1]
        else:
            # Use the first race of the season if no races completed yet
            race_event = schedule.iloc[0]
        
        # Load the race session
        session = fastf1.get_session(current_year, race_event['RoundNumber'], 'R')
        session.load()
        
        # Get driver information
        drivers_data = []
        
        for driver_number in session.drivers:
            driver_info = session.get_driver(driver_number)
            
            # Get driver results for points (this is simplified)
            driver_data = {
                'id': str(driver_number),
                'name': f"{driver_info['FirstName']} {driver_info['LastName']}",
                'team': driver_info['TeamName'],
                'number': int(driver_number),
                'nationality': driver_info['CountryCode'],
                'abbreviation': driver_info['Abbreviation']
            }
            
            drivers_data.append(driver_data)
        
        return drivers_data
        
    except Exception as e:
        print(f"Error fetching drivers: {e}")
        return None

def get_historical_races(year):
    """Get all races for a specific year"""
    try:
        schedule = fastf1.get_event_schedule(year)
        races = []
        
        for _, race in schedule.iterrows():
            race_data = {
                'round_number': int(race['RoundNumber']),
                'event_name': race['EventName'],
                'location': race['Location'],
                'country': race['Country'],
                'date': race['Session5Date'].strftime('%Y-%m-%d') if pd.notna(race['Session5Date']) else None
            }
            races.append(race_data)
        
        return races
        
    except Exception as e:
        print(f"Error fetching historical races: {e}")
        return None

def main():
    """Main function to fetch and save F1 data"""
    print("Fetching F1 data...")
    
    # Create data directory if it doesn't exist
    os.makedirs('public/data', exist_ok=True)
    
    # Get race info
    race_info = get_current_season_info()
    if race_info:
        print(f"Current race: {race_info['track_name']} (Round {race_info['round_number']}/{race_info['total_rounds']})")
        
        # Get track info for current race
        track_info = get_track_info(datetime.now().year, race_info['round_number'])
        if track_info:
            race_info['track_info'] = track_info
    
    # Get drivers
    drivers = get_current_drivers()
    if drivers:
        print(f"Found {len(drivers)} drivers")
    
    # Get most successful driver
    most_successful = get_most_successful_driver()
    if most_successful:
        print(f"Most successful driver: {most_successful['driver']} with {most_successful['wins']} wins")
    
    # Get historical races for current year
    current_year = datetime.now().year
    historical_races = get_historical_races(current_year)
    
    # Save data to JSON files for the API to use
    if race_info:
        with open('public/data/race_info.json', 'w') as f:
            json.dump(race_info, f, indent=2)
    
    if drivers:
        with open('public/data/drivers_data.json', 'w') as f:
            json.dump(drivers, f, indent=2)
    
    if most_successful:
        with open('public/data/most_successful_driver.json', 'w') as f:
            json.dump(most_successful, f, indent=2)
    
    if historical_races:
        with open('public/data/historical_races.json', 'w') as f:
            json.dump({str(current_year): historical_races}, f, indent=2)
    
    print("Data fetching complete!")

if __name__ == "__main__":
    main()
