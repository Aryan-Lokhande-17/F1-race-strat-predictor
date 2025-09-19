import os
import pandas as pd
import joblib
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns

def analyze_models():
    current_dir = os.path.dirname(__file__)                
    backend_dir = os.path.dirname(current_dir)             
    data_path = os.path.join(backend_dir, "processed_data.csv")
    rf_model_path = os.path.join(backend_dir, "saved_models", "rf_model.pkl")
    xgb_model_path = os.path.join(backend_dir, "saved_models", "xgb_model.pkl")

    df = pd.read_csv(data_path)
    X = df.drop(columns=['Target'])
    y = df['Target']

    rf = joblib.load(rf_model_path)
    xgb = joblib.load(xgb_model_path)

    y_pred_rf = rf.predict(X)
    y_pred_xgb = xgb.predict(X)

    print("✅ Random Forest Accuracy:", accuracy_score(y, y_pred_rf))
    print(classification_report(y, y_pred_rf))

    print("✅ XGBoost Accuracy:", accuracy_score(y, y_pred_xgb))
    print(classification_report(y, y_pred_xgb))

    cm_rf = confusion_matrix(y, y_pred_rf)
    cm_xgb = confusion_matrix(y, y_pred_xgb)

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

if __name__ == "__main__":
    analyze_models()
