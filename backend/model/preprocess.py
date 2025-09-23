import pandas as pd
from sklearn.preprocessing import LabelEncoder, StandardScaler
import joblib
import os

def preprocess_race_dataset(input_csv, output_csv):
    # Paths
    current_dir = os.path.dirname(__file__)         # backend/model/
    save_dir = os.path.join(current_dir, 'saved_models')
    os.makedirs(save_dir, exist_ok=True)

    # 1️⃣ Load dataset
    print("📂 Loading dataset...")
    df = pd.read_csv(os.path.join(current_dir, input_csv))
    print("Original shape:", df.shape)

    # --------------------------
    # 2️⃣ Handle missing values
    # --------------------------
    numeric_cols = ['LapNumber', 'Stint', 'AirTemp_C', 'TrackTemp_C', 'Rainfall']
    for col in numeric_cols:
        if col not in df.columns:
            df[col] = 0
        df[col] = pd.to_numeric(df[col], errors='coerce')
        df[col].fillna(df[col].mean(), inplace=True)

    # Encode compound column (target)
    if 'CompoundMapped' not in df.columns:
        df['CompoundMapped'] = "Unknown"
    df['CompoundMapped'] = df['CompoundMapped'].astype(str).fillna("Unknown")

    # --------------------------
    # 3️⃣ Encode categorical columns
    # --------------------------
    categorical_cols = ['Driver', 'EventName']
    encoders = {}

    for col in categorical_cols:
        le = LabelEncoder()
        df[col + 'Encoded'] = le.fit_transform(df[col].astype(str))
        encoders[col] = le

    # Target encoding
    le_compound = LabelEncoder()
    df['Target'] = le_compound.fit_transform(df['CompoundMapped'])
    encoders['CompoundMapped'] = le_compound

    # --------------------------
    # 4️⃣ Select features
    # --------------------------
    feature_cols = [
        'LapNumber', 'Stint', 'AirTemp_C', 'TrackTemp_C', 'Rainfall',
        'DriverEncoded', 'EventNameEncoded'
    ]
    X = df[feature_cols]
    y = df['Target']

    # --------------------------
    # 5️⃣ Scale numeric features
    # --------------------------
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # --------------------------
    # 6️⃣ Save encoders and scaler
    # --------------------------
    joblib.dump(encoders, os.path.join(save_dir, 'encoders.pkl'))
    joblib.dump(scaler, os.path.join(save_dir, 'scaler.pkl'))

    # --------------------------
    # 7️⃣ Save processed data
    # --------------------------
    processed_df = pd.DataFrame(X_scaled, columns=feature_cols)
    processed_df['Target'] = y.values
    processed_df.to_csv(os.path.join(current_dir, output_csv), index=False)

    print(f"✅ Preprocessed dataset saved to {output_csv}")
    print("Processed shape:", processed_df.shape)


if __name__ == "__main__":
    preprocess_race_dataset("race_dataset_complete.csv", "processed_race_dataset.csv")
