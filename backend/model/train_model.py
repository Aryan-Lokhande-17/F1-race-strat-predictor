import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

def train_and_compare_models(rf_model_path, xgb_model_path):
    # 🛡 Compute absolute paths safely
    current_dir = os.path.dirname(__file__)               # backend/model/
    backend_dir = os.path.dirname(current_dir)            # backend/
    data_path = os.path.join(backend_dir, 'processed_data.csv')
    rf_model_path = os.path.join(backend_dir, rf_model_path)
    xgb_model_path = os.path.join(backend_dir, xgb_model_path)

    df = pd.read_csv(data_path)
    X = df.drop(columns=['Target'])
    y = df['Target']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Random Forest
    rf = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
    rf.fit(X_train, y_train)
    y_pred_rf = rf.predict(X_test)

    # XGBoost
    xgb = XGBClassifier(n_estimators=100, max_depth=5, use_label_encoder=False, eval_metric='mlogloss', random_state=42)
    xgb.fit(X_train, y_train)
    y_pred_xgb = xgb.predict(X_test)

    # Evaluate + print reports
    print("✅ Random Forest Accuracy:", accuracy_score(y_test, y_pred_rf))
    print(classification_report(y_test, y_pred_rf))

    print("✅ XGBoost Accuracy:", accuracy_score(y_test, y_pred_xgb))
    print(classification_report(y_test, y_pred_xgb))

    # Plot confusion matrices
    cm_rf = confusion_matrix(y_test, y_pred_rf)
    cm_xgb = confusion_matrix(y_test, y_pred_xgb)

    fig, axes = plt.subplots(1, 2, figsize=(12, 5))

    sns.heatmap(cm_rf, annot=True, fmt='d', cmap='Blues', ax=axes[0])
    axes[0].set_title("Random Forest Confusion Matrix")
    axes[0].set_xlabel("Predicted")
    axes[0].set_ylabel("Actual")

    sns.heatmap(cm_xgb, annot=True, fmt='d', cmap='Greens', ax=axes[1])
    axes[1].set_title("XGBoost Confusion Matrix")
    axes[1].set_xlabel("Predicted")
    axes[1].set_ylabel("Actual")

    plt.tight_layout()
    plt.show()

    # Save models
    joblib.dump(rf, rf_model_path)
    joblib.dump(xgb, xgb_model_path)
    print(f"💾 Models saved: {rf_model_path}, {xgb_model_path}")

if __name__ == "__main__":
    train_and_compare_models(
        'saved_models/rf_model.pkl',
        'saved_models/xgb_model.pkl'
    )
