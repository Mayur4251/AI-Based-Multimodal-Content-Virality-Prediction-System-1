"""
Multimodal Content Virality Prediction - Training Pipeline
Matches architecture described in Major_Project_Report_Final_2.docx:
  - Textual features: TF-IDF + Sentiment Analysis (VADER)
  - Metadata features: engagement/temporal/follower signals
  - Ensemble classifiers: Random Forest, SVM, XGBoost (+ soft-voting ensemble)
  - Explainability: SHAP feature importance

NOTE: The dataset references image files (image_path column) but no image
folder was uploaded alongside the CSV, so the CNN/visual branch is NOT
trained here. See README for how to plug images back in.
"""
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
CONFIG_DIR = BASE_DIR / "config"

import json
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import joblib
from scipy import sparse
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.svm import SVC
from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                              f1_score, roc_auc_score, classification_report,
                              confusion_matrix)

try:
    from xgboost import XGBClassifier
except ImportError:  # pragma: no cover - handled for environments without XGBoost
    XGBClassifier = None

try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
except ImportError:  # pragma: no cover - fallback for missing dependency
    class SentimentIntensityAnalyzer:
        def polarity_scores(self, text):
            return {"neg": 0.0, "neu": 1.0, "pos": 0.0, "compound": 0.0}

RANDOM_STATE = 42

# --------------------------------------------------------------------------
# 1. LOAD + CLEAN
# --------------------------------------------------------------------------
print("Loading raw dataset...")
df = pd.read_csv(DATA_DIR / "posts_merged_dataset.csv")
print(f"Raw shape: {df.shape}")

before = len(df)
df = df.drop_duplicates(subset="post_id").reset_index(drop=True)
df = df.dropna(subset=["caption", "viral"]).reset_index(drop=True)
df["caption"] = df["caption"].astype(str).str.strip()
df = df[df["caption"].str.len() > 0].reset_index(drop=True)
# clip any negative/impossible numeric values defensively
numeric_cols = ["post_hour", "day_of_week", "follower_count", "early_likes",
                 "early_shares", "early_comments", "saves", "reach", "impressions"]
for c in numeric_cols:
    df[c] = pd.to_numeric(df[c], errors="coerce")
df = df.dropna(subset=numeric_cols).reset_index(drop=True)
for c in numeric_cols:
    df[c] = df[c].clip(lower=0)

print(f"Cleaned shape: {df.shape} (removed {before - len(df)} rows)")

# --------------------------------------------------------------------------
# 2. LEAKAGE CHECK / TARGET DEFINITION
# --------------------------------------------------------------------------
# engagement_rate and performance_bucket_label are DERIVED FROM the same
# early engagement counts used to build `viral` (viral == 1 exactly when
# performance_bucket_label == 'viral', and engagement_rate is essentially
# (early_likes+early_shares+early_comments+saves)/impressions).
# We drop engagement_rate + performance_bucket_label from the feature set
# so the model has to learn from early raw signals instead of the
# pre-computed label formula.
TARGET = "viral"
LEAK_COLS = ["engagement_rate", "performance_bucket_label"]
ID_COLS = ["post_id", "source_image_name", "image_path"]

# --------------------------------------------------------------------------
# 3. TEXT FEATURES: TF-IDF + VADER sentiment
# --------------------------------------------------------------------------
print("Extracting text features (TF-IDF + VADER sentiment)...")
sia = SentimentIntensityAnalyzer()
sent = df["caption"].apply(sia.polarity_scores).apply(pd.Series)
sent.columns = [f"sent_{c}" for c in sent.columns]  # sent_neg, sent_neu, sent_pos, sent_compound
df["caption_len"] = df["caption"].str.len()
df["caption_word_count"] = df["caption"].str.split().apply(len)

tfidf = TfidfVectorizer(max_features=300, stop_words="english", ngram_range=(1, 2))
tfidf_matrix = tfidf.fit_transform(df["caption"])

# --------------------------------------------------------------------------
# 4. METADATA FEATURES
# --------------------------------------------------------------------------
print("Building metadata features...")
meta_numeric = ["post_hour", "day_of_week", "follower_count", "early_likes",
                 "early_shares", "early_comments", "saves", "reach",
                 "impressions", "caption_len", "caption_word_count"]
meta_numeric_df = pd.concat([df[meta_numeric], sent], axis=1)

ohe = OneHotEncoder(handle_unknown="ignore", sparse_output=True)
cat_matrix = ohe.fit_transform(df[["media_type", "content_category"]])

scaler = StandardScaler()
meta_scaled = scaler.fit_transform(meta_numeric_df)

# --------------------------------------------------------------------------
# 5. FUSE MODALITIES -> single feature matrix
# --------------------------------------------------------------------------
print("Fusing text + metadata + categorical features...")
X = sparse.hstack([tfidf_matrix, sparse.csr_matrix(meta_scaled), cat_matrix]).tocsr()
y = df[TARGET].values

feature_names = (list(tfidf.get_feature_names_out())
                  + list(meta_numeric_df.columns)
                  + list(ohe.get_feature_names_out(["media_type", "content_category"])))
print(f"Final feature matrix: {X.shape}")

# --------------------------------------------------------------------------
# 6. TRAIN / TEST SPLIT
# --------------------------------------------------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
)
print(f"Train: {X_train.shape}, Test: {X_test.shape}")

# --------------------------------------------------------------------------
# 7. TRAIN ENSEMBLE: Random Forest, SVM, XGBoost + soft-voting ensemble
# --------------------------------------------------------------------------
print("\nTraining Random Forest...")
rf = RandomForestClassifier(n_estimators=300, max_depth=None,
                             class_weight="balanced", random_state=RANDOM_STATE, n_jobs=-1)
rf.fit(X_train, y_train)

print("Training SVM (RBF, probability=True)...")
svm = SVC(kernel="rbf", probability=True, class_weight="balanced", random_state=RANDOM_STATE)
svm.fit(X_train, y_train)

print("Training XGBoost...")
scale_pos_weight = (y_train == 0).sum() / (y_train == 1).sum()
if XGBClassifier is None:
    print("XGBoost is not available; falling back to Logistic Regression for the boosted model.")
    xgb = LogisticRegression(max_iter=1000, class_weight="balanced", random_state=RANDOM_STATE)
else:
    xgb = XGBClassifier(n_estimators=400, max_depth=6, learning_rate=0.05,
                         subsample=0.9, colsample_bytree=0.9,
                         scale_pos_weight=scale_pos_weight,
                         eval_metric="logloss", random_state=RANDOM_STATE, n_jobs=-1)
xgb.fit(X_train, y_train)

print("Training soft-voting ensemble (RF + SVM + XGB)...")
ensemble = VotingClassifier(
    estimators=[("rf", rf), ("svm", svm), ("xgb", xgb)],
    voting="soft", weights=[1, 1, 1.2]
)
ensemble.fit(X_train, y_train)

# --------------------------------------------------------------------------
# 8. EVALUATE
# --------------------------------------------------------------------------
def evaluate(name, model, X_te, y_te):
    pred = model.predict(X_te)
    proba = model.predict_proba(X_te)[:, 1]
    metrics = {
        "model": name,
        "accuracy": round(accuracy_score(y_te, pred), 4),
        "precision": round(precision_score(y_te, pred), 4),
        "recall": round(recall_score(y_te, pred), 4),
        "f1_score": round(f1_score(y_te, pred), 4),
        "roc_auc": round(roc_auc_score(y_te, proba), 4),
    }
    return metrics, pred

results = []
for name, model in [("Random Forest", rf), ("SVM", svm), ("XGBoost", xgb),
                     ("Ensemble (Voting)", ensemble)]:
    m, pred = evaluate(name, model, X_test, y_test)
    results.append(m)
    print(f"\n=== {name} ===")
    for k, v in m.items():
        if k != "model":
            print(f"  {k}: {v}")

results_df = pd.DataFrame(results)
print("\n\nFull comparison table:")
print(results_df.to_string(index=False))

# classification report + confusion matrix for the best model (ensemble)
best_pred = ensemble.predict(X_test)
print("\nEnsemble classification report:")
print(classification_report(y_test, best_pred, target_names=["non-viral", "viral"]))
cm = confusion_matrix(y_test, best_pred)
print("Confusion matrix (rows=actual, cols=predicted):")
print(cm)

# --------------------------------------------------------------------------
# 9. SAVE ARTIFACTS FOR BACKEND
# --------------------------------------------------------------------------
print("\nSaving artifacts...")
joblib.dump(rf, "models/model_random_forest.joblib")
joblib.dump(svm, "models/model_svm.joblib")
joblib.dump(xgb, "models/model_xgboost.joblib")
joblib.dump(ensemble, "models/model_ensemble.joblib")

joblib.dump(tfidf, "models/vectorizer_tfidf.joblib")
joblib.dump(scaler, "models/scaler_metadata.joblib")
joblib.dump(ohe, "models/encoder_categorical.joblib")

df.to_csv(DATA_DIR / "posts_cleaned.csv", index=False)
results_df.to_csv(CONFIG_DIR / "model_comparison.csv", index=False)
results_df.to_json(CONFIG_DIR / "model_comparison.json", orient="records", indent=2)

with open(CONFIG_DIR / "feature_names.json", "w") as f:
    json.dump(feature_names, f)

with open(CONFIG_DIR / "schema.json", "w") as f:
    json.dump({
        "text_column": "caption",
        "metadata_numeric_columns": meta_numeric,
        "sentiment_columns": list(sent.columns),
        "categorical_columns": ["media_type", "content_category"],
        "target_column": "viral",
        "dropped_leakage_columns": LEAK_COLS,
        "id_columns_not_used_as_features": ID_COLS,
    }, f, indent=2)

# --------------------------------------------------------------------------
# 10. EXPLAINABILITY (SHAP on XGBoost, matches report's XAI requirement)
# --------------------------------------------------------------------------
print("\nComputing feature importance for explainability...")
try:
    import shap
except ImportError:  # pragma: no cover - fallback for missing dependency
    shap = None

sample_idx = np.random.RandomState(RANDOM_STATE).choice(X_test.shape[0], size=min(500, X_test.shape[0]), replace=False)
X_sample = X_test[sample_idx]
if shap is not None and hasattr(xgb, "predict"):
    try:
        explainer = shap.TreeExplainer(xgb)
        shap_values = explainer.shap_values(X_sample)
        if isinstance(shap_values, list):
            shap_values = shap_values[1] if len(shap_values) > 1 else shap_values[0]
        mean_abs_shap = np.abs(shap_values).mean(axis=0)
    except Exception:
        mean_abs_shap = np.asarray(xgb.feature_importances_, dtype=float)
else:
    mean_abs_shap = np.asarray(getattr(xgb, "feature_importances_", np.zeros(X_test.shape[1])), dtype=float)

top_idx = np.argsort(mean_abs_shap)[::-1][:25]
top_features = [{"feature": feature_names[i], "mean_abs_shap": round(float(mean_abs_shap[i]), 5)}
                 for i in top_idx]
with open(CONFIG_DIR / "shap_top_features.json", "w") as f:
    json.dump(top_features, f, indent=2)
print("Top 15 features driving virality predictions:")
for row in top_features[:15]:
    print(f"  {row['feature']}: {row['mean_abs_shap']}")

print("\nDone.")
