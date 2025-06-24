import pandas as pd
from sklearn.preprocessing import LabelEncoder, StandardScaler
import joblib
import os

def preprocess_data(input_csv, output_csv):
    # 🌟 Get absolute paths
    current_dir = os.path.dirname(__file__)                   # backend/model/
    backend_dir = os.path.dirname(current_dir)                # backend/
    save_dir = os.path.join(backend_dir, 'saved_models')      # backend/saved_models/

    # Ensure the saved_models directory exists
    os.makedirs(save_dir, exist_ok=True)

    # 1️⃣ Load data
    df = pd.read_csv(os.path.join(backend_dir, input_csv))

    # 2️⃣ Encode categorical variables
    le_driver = LabelEncoder()
    df['DriverEncoded'] = le_driver.fit_transform(df['Driver'])

    le_team = LabelEncoder()
    df['TeamEncoded'] = le_team.fit_transform(df['Team'])

    le_compound = LabelEncoder()
    df['CompoundEncoded'] = le_compound.fit_transform(df['Compound'])

    le_track = LabelEncoder()
    df['TrackEncoded'] = le_track.fit_transform(df['Track'])
    
    # 3️⃣ Fill missing values
    df['PitLap'] = df['PitLap'].fillna(0)
    df['AvgAirTemp'] = df['AvgAirTemp'].fillna(df['AvgAirTemp'].mean())
    df['AvgTrackTemp'] = df['AvgTrackTemp'].fillna(df['AvgTrackTemp'].mean())

    # 4️⃣ Select features
    feature_cols = [
        'GridPosition', 'Stint', 'PitLap', 'StintLength',
        'AvgAirTemp', 'AvgTrackTemp',
        'DriverEncoded', 'TeamEncoded', 'TrackEncoded'
    ]
    X = df[feature_cols]
    y = df['CompoundEncoded']

    # 5️⃣ Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # 6️⃣ Save encoders + scaler
    joblib.dump({
        'driver': le_driver,
        'team': le_team,
        'compound': le_compound,
        'track': le_track
    }, os.path.join(save_dir, 'encoders.pkl'))

    joblib.dump(scaler, os.path.join(save_dir, 'scaler.pkl'))

    # 7️⃣ Save processed data
    processed_df = pd.DataFrame(X_scaled, columns=feature_cols)
    processed_df['Target'] = y.values
    processed_df.to_csv(os.path.join(backend_dir, output_csv), index=False)

    print(f"✅ Preprocessed data saved to {output_csv}")

if __name__ == "__main__":
    preprocess_data("race_strategy_dataset.csv", "processed_data.csv")
