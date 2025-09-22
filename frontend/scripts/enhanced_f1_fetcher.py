import fastf1
import pandas as pd
import json
from datetime import datetime
import os
import requests
from PIL import Image
import io

# Enable FastF1 cache for better performance
fastf1.Cache.enable_cache('cache')

def get_track_image_url(track_name, year):
    """
    Generate a track layout image URL or placeholder
    In a real implementation, you might use F1 official APIs or track databases
    """
    # You could integrate with services like:
    # - F1 official media APIs
    # - Racing circuit databases
    # - Custom track layout generators
    
    track_images = {
        "Monaco Grand Prix": f"/placeholder.svg?height=300&width=500",
        "Silverstone Grand Prix": f"/placeholder.svg?height=300&width=500",
        "Monza Grand Prix": f"/placeholder.svg?height=300&width=500",
        "Spa-Francorchamps Grand Prix": f"/placeholder.svg?height=300&width=500",
        # Add more tracks as needed
    }
    
    return track_images.get(track_name, f"/placeholder.svg?height=300&width=500")

def get_enhanced_track_info(year, round_number):
    """Get detailed track information with enhanced data"""
    try:
        # Load the race session
        session = fastf1.get_session(year, round_number, 'R')
        session.load()
        
        # Get basic track info
        event = session.event
        
        track_info = {
            'track_length': float(event.get('TrackLength', 0)) if event.get('TrackLength') else None,
            'lap_count': int(event.get('TotalLaps', 0)) if event.get('TotalLaps') else None,
            'turn_count': get_turn_count(event['EventName']),  # Custom function for turn counts
            'sectors': 3,  # Standard F1 has 3 sectors
            'drs_zones': get_drs_zones(event['EventName']),  # Custom function for DRS zones
            'track_image_url': get_track_image_url(event['EventName'], year),
            'track_type': get_track_type(event['EventName']),  # Street, permanent, etc.
            'lap_record': get_lap_record(event['EventName']),  # Historical lap record
        }
        
        return track_info
        
    except Exception as e:
        print(f"Error fetching enhanced track info: {e}")
        return None

def get_turn_count(track_name):
    """Get number of turns for specific tracks"""
    turn_counts = {
        "Monaco Grand Prix": 19,
        "Silverstone Grand Prix": 18,
        "Monza Grand Prix": 11,
        "Spa-Francorchamps Grand Prix": 19,
        "Suzuka Grand Prix": 18,
        "Circuit de Barcelona-Catalunya": 16,
        "Red Bull Ring": 10,
        "Hungaroring": 14,
        "Circuit de Spa-Francorchamps": 19,
        "Autodromo Nazionale di Monza": 11,
        # Add more tracks
    }
    return turn_counts.get(track_name, None)

def get_drs_zones(track_name):
    """Get DRS zones for specific tracks"""
    drs_zones = {
        "Monaco Grand Prix": ["Main straight"],
        "Silverstone Grand Prix": ["Hangar straight", "Wellington straight"],
        "Monza Grand Prix": ["Main straight", "Back straight"],
        "Spa-Francorchamps Grand Prix": ["Kemmel straight", "Main straight"],
        # Add more tracks
    }
    return drs_zones.get(track_name, [])

def get_track_type(track_name):
    """Classify track type"""
    street_circuits = ["Monaco Grand Prix", "Singapore Grand Prix", "Las Vegas Grand Prix", "Miami Grand Prix"]
    if track_name in street_circuits:
        return "Street Circuit"
    return "Permanent Circuit"

def get_lap_record(track_name):
    """Get lap record information (this would need a database in real implementation)"""
    lap_records = {
        "Monaco Grand Prix": {"time": "1:12.909", "driver": "Lewis Hamilton", "year": 2021},
        "Silverstone Grand Prix": {"time": "1:27.097", "driver": "Max Verstappen", "year": 2020},
        "Monza Grand Prix": {"time": "1:21.046", "driver": "Rubens Barrichello", "year": 2004},
    }
    return lap_records.get(track_name, None)

def get_historical_race_results(year, round_number):
    """Get detailed race results for historical analysis"""
    try:
        session = fastf1.get_session(year, round_number, 'R')
        session.load()
        
        results = session.results
        race_results = []
        
        for idx, result in results.iterrows():
            race_result = {
                'position': int(result['Position']) if pd.notna(result['Position']) else None,
                'driver': f"{result['FirstName']} {result['LastName']}",
                'team': result['TeamName'],
                'time': str(result['Time']) if pd.notna(result['Time']) else None,
                'points': int(result['Points']) if pd.notna(result['Points']) else 0,
                'status': result['Status'] if pd.notna(result['Status']) else 'Finished'
            }
            race_results.append(race_result)
        
        return race_results
        
    except Exception as e:
        print(f"Error fetching race results: {e}")
        return None

def main():
    """Enhanced main function with comprehensive data fetching"""
    print("Fetching enhanced F1 data...")
    
    # Create data directory if it doesn't exist
    os.makedirs('public/data', exist_ok=True)
    
    current_year = datetime.now().year
    
    # Get current race info with enhanced track data
    race_info = get_current_season_info()
    if race_info:
        enhanced_track_info = get_enhanced_track_info(current_year, race_info['round_number'])
        if enhanced_track_info:
            race_info['track_info'] = enhanced_track_info
        
        print(f"Enhanced race info: {race_info['track_name']} with {len(enhanced_track_info.get('drs_zones', []))} DRS zones")
    
    # Get all other data as before
    drivers = get_current_drivers()
    most_successful = get_most_successful_driver()
    historical_races = get_historical_races(current_year)
    
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
    
    print("Enhanced data fetching complete!")

def get_current_season_info():
    """Get current season schedule and race information"""
    try:
        current_year = datetime.now().year
        schedule = fastf1.get_event_schedule(current_year)
        
        now = pd.Timestamp.now()
        upcoming_races = schedule[schedule['Session5Date'] >= now]
        
        if len(upcoming_races) > 0:
            current_race = upcoming_races.iloc[0]
        else:
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

def get_current_drivers():
    """Get current F1 drivers from the latest session"""
    try:
        current_year = datetime.now().year
        schedule = fastf1.get_event_schedule(current_year)
        
        now = pd.Timestamp.now()
        completed_races = schedule[schedule['Session5Date'] < now]
        
        if len(completed_races) > 0:
            race_event = completed_races.iloc[-1]
        else:
            race_event = schedule.iloc[0]
        
        session = fastf1.get_session(current_year, race_event['RoundNumber'], 'R')
        session.load()
        
        drivers_data = []
        
        for driver_number in session.drivers:
            driver_info = session.get_driver(driver_number)
            
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

def get_most_successful_driver(year=None):
    """Calculate most successful driver based on wins"""
    try:
        if year is None:
            year = datetime.now().year
            
        schedule = fastf1.get_event_schedule(year)
        driver_wins = {}
        
        for _, race in schedule.iterrows():
            try:
                session = fastf1.get_session(year, race['RoundNumber'], 'R')
                session.load()
                
                results = session.results
                if len(results) > 0:
                    winner = results.iloc[0]
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

if __name__ == "__main__":
    main()
