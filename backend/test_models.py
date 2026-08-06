import os
import joblib

MODEL_DIR = "models"

model_files = [
    "model_ensemble.joblib",
    "model_random_forest.joblib",
    "model_svm.joblib",
    "model_xgboost.joblib",
    "vectorizer_tfidf.joblib",
    "scaler_metadata.joblib",
    "encoder_categorical.joblib"
]

print("=" * 60)
print("Testing ML Models")
print("=" * 60)

for model in model_files:
    path = os.path.join(MODEL_DIR, model)

    try:
        joblib.load(path)
        print(f"✅ {model} loaded successfully")
    except Exception as e:
        print(f"❌ Failed to load {model}")
        print(e)

print("=" * 60)
print("Testing Completed")