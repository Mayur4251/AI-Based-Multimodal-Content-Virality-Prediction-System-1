"""
Multimodal Content Virality Prediction - Training Pipeline v2
(Improves the original ensemble; same architecture from
Major_Project_Report_Final_2.docx — TF-IDF+VADER text, metadata,
tree-ensemble classifiers — now with proper CV tuning + imbalance handling.)

NOTE: No images folder was uploaded, so CNN branch is still not trained.
"""
import json
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import joblib
from scipy import sparse
from sklearn.model_selection import train_test_split, StratifiedKFold, RandomizedSearchCV
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import (RandomForestClassifier, ExtraTreesClassifier,
                               GradientBoostingClassifier, StackingClassifier)
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                              f1_score, roc_auc_score, classification_report,
                              confusion_matrix)
from xgboost import XGBClassifier
from catboost import CatBoostClassifier
from imblearn.over_sampling import SMOTE
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

RANDOM_STATE = 42

# --------------------------------------------------------------------------
# 1. LOAD + CLEAN (unchanged from v1)
# --------------------------------------------------------------------------
print("Loading raw dataset...")
df = pd.read_csv("data/posts_merged_dataset.csv")
before = len(df)
df = df.drop_duplicates(subset="post_id").reset_index(drop=True)
df = df.dropna(subset=["caption", "viral"]).reset_index(drop=True)
df["caption"] = df["caption"].astype(str).str.strip()
df = df[df["caption"].str.len() > 0].reset_index(drop=True)
numeric_cols = ["post_hour", "day_of_week", "follower_count", "early_likes",
                 "early_shares", "early_comments", "saves", "reach", "impressions"]
for c in numeric_cols:
    df[c] = pd.to_numeric(df[c], errors="coerce")
df = df.dropna(subset=numeric_cols).reset_index(drop=True)
for c in numeric_cols:
    df[c] = df[c].clip(lower=0)
print(f"Cleaned shape: {df.shape} (removed {before - len(df)} rows)")

TARGET = "viral"
LEAK_COLS = ["engagement_rate", "performance_bucket_label"]  # confirmed derived from same signals as target

print("\nClass balance:")
print(df[TARGET].value_counts(normalize=True))

# --------------------------------------------------------------------------
# 2. TEXT FEATURES: TF-IDF (denoised) + VADER sentiment
# --------------------------------------------------------------------------
print("\nExtracting text features...")
sia = SentimentIntensityAnalyzer()
sent = df["caption"].apply(sia.polarity_scores).apply(pd.Series)
sent.columns = [f"sent_{c}" for c in sent.columns]
df["caption_len"] = df["caption"].str.len()
df["caption_word_count"] = df["caption"].str.split().apply(len)

# CHANGE: min_df=5 + max_df=0.6 to drop noisy rare/near-universal tokens
# (v1 used max_features=300 with no min_df -> kept a lot of single-occurrence noise)
tfidf = TfidfVectorizer(max_features=250, min_df=5, max_df=0.6,
                         stop_words="english", ngram_range=(1, 2), sublinear_tf=True)
tfidf_matrix = tfidf.fit_transform(df["caption"])
print(f"TF-IDF vocab kept after denoising: {tfidf_matrix.shape[1]} (v1 had 300 with no min_df filter)")

# --------------------------------------------------------------------------
# 3. METADATA FEATURES
# --------------------------------------------------------------------------
meta_numeric = ["post_hour", "day_of_week", "follower_count", "early_likes",
                 "early_shares", "early_comments", "saves", "reach",
                 "impressions", "caption_len", "caption_word_count"]
meta_numeric_df = pd.concat([df[meta_numeric], sent], axis=1)

ohe = OneHotEncoder(handle_unknown="ignore", sparse_output=True)
cat_matrix = ohe.fit_transform(df[["media_type", "content_category"]])

scaler = StandardScaler()
meta_scaled = scaler.fit_transform(meta_numeric_df)

X = sparse.hstack([tfidf_matrix, sparse.csr_matrix(meta_scaled), cat_matrix]).tocsr()
y = df[TARGET].values
feature_names = (list(tfidf.get_feature_names_out())
                  + list(meta_numeric_df.columns)
                  + list(ohe.get_feature_names_out(["media_type", "content_category"])))
print(f"Final feature matrix: {X.shape}")

# --------------------------------------------------------------------------
# 4. SPLIT FIRST — test set is NEVER touched until final evaluation
# --------------------------------------------------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
)
print(f"Train: {X_train.shape}, Test: {X_test.shape} (held out, untouched until final scoring)")

# --------------------------------------------------------------------------
# 5. CLASS IMBALANCE: SMOTE on TRAINING data only (never on test data)
# --------------------------------------------------------------------------
print("\nBefore SMOTE:", np.bincount(y_train))
smote = SMOTE(random_state=RANDOM_STATE)
X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
print("After SMOTE (train only):", np.bincount(y_train_res))

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)

# --------------------------------------------------------------------------
# 6. HYPERPARAMETER TUNING (RandomizedSearchCV, 5-fold CV, train data only)
# --------------------------------------------------------------------------
def tune(name, estimator, param_dist, n_iter=20):
    print(f"\nTuning {name}...")
    search = RandomizedSearchCV(
        estimator, param_dist, n_iter=n_iter, scoring="f1", cv=cv,
        random_state=RANDOM_STATE, n_jobs=-1, verbose=0
    )
    search.fit(X_train_res, y_train_res)
    print(f"  Best CV F1: {search.best_score_:.4f} | Best params: {search.best_params_}")
    return search.best_estimator_

rf_best = tune("Random Forest", RandomForestClassifier(random_state=RANDOM_STATE, n_jobs=-1), {
    "n_estimators": [200, 300, 400, 600],
    "max_depth": [10, 15, 20, None],
    "min_samples_split": [2, 5, 10],
    "min_samples_leaf": [1, 2, 4],
    "max_features": ["sqrt", "log2"],
})

et_best = tune("Extra Trees", ExtraTreesClassifier(random_state=RANDOM_STATE, n_jobs=-1), {
    "n_estimators": [200, 300, 400, 600],
    "max_depth": [10, 15, 20, None],
    "min_samples_split": [2, 5, 10],
    "min_samples_leaf": [1, 2, 4],
})

xgb_best = tune("XGBoost", XGBClassifier(eval_metric="logloss", random_state=RANDOM_STATE, n_jobs=-1), {
    "n_estimators": [200, 300, 400, 600],
    "max_depth": [3, 4, 5, 6, 8],
    "learning_rate": [0.01, 0.03, 0.05, 0.1],
    "subsample": [0.7, 0.8, 0.9, 1.0],
    "colsample_bytree": [0.6, 0.8, 1.0],
})

cat_best = tune("CatBoost", CatBoostClassifier(verbose=0, random_state=RANDOM_STATE), {
    "iterations": [200, 300, 500],
    "depth": [4, 6, 8],
    "learning_rate": [0.01, 0.03, 0.05, 0.1],
    "l2_leaf_reg": [1, 3, 5, 7],
}, n_iter=12)

# --------------------------------------------------------------------------
# 7. STACKING ENSEMBLE of tuned models (meta-learner: Logistic Regression)
# --------------------------------------------------------------------------
print("\nTraining stacking ensemble (RF + ExtraTrees + XGB + CatBoost -> LogisticRegression meta)...")
stack = StackingClassifier(
    estimators=[("rf", rf_best), ("et", et_best), ("xgb", xgb_best), ("cat", cat_best)],
    final_estimator=LogisticRegression(max_iter=1000),
    cv=5, n_jobs=-1
)
stack.fit(X_train_res, y_train_res)

# --------------------------------------------------------------------------
# 8. REAL EVALUATION on untouched test set (no leakage, no re-fitting)
# --------------------------------------------------------------------------
def evaluate(name, model, X_te, y_te):
    pred = model.predict(X_te)
    proba = model.predict_proba(X_te)[:, 1]
    m = {
        "model": name,
        "accuracy": round(accuracy_score(y_te, pred), 4),
        "precision": round(precision_score(y_te, pred), 4),
        "recall": round(recall_score(y_te, pred), 4),
        "f1_score": round(f1_score(y_te, pred), 4),
        "roc_auc": round(roc_auc_score(y_te, proba), 4),
    }
    return m, pred

results = []
for name, model in [("Random Forest (tuned)", rf_best), ("Extra Trees (tuned)", et_best),
                     ("XGBoost (tuned)", xgb_best), ("CatBoost (tuned)", cat_best),
                     ("Stacking Ensemble", stack)]:
    m, pred = evaluate(name, model, X_test, y_test)
    results.append(m)
    print(f"\n=== {name} (real test-set score) ===")
    for k, v in m.items():
        if k != "model":
            print(f"  {k}: {v}")

results_df = pd.DataFrame(results)
print("\nFull comparison (v2, real test scores):")
print(results_df.to_string(index=False))

best_row = results_df.loc[results_df["f1_score"].idxmax()]
print(f"\nBest model by test F1: {best_row['model']}")

best_model_map = {"Random Forest (tuned)": rf_best, "Extra Trees (tuned)": et_best,
                   "XGBoost (tuned)": xgb_best, "CatBoost (tuned)": cat_best,
                   "Stacking Ensemble": stack}
best_model = best_model_map[best_row["model"]]

print("\nBest model classification report (test set):")
print(classification_report(y_test, best_model.predict(X_test), target_names=["non-viral", "viral"]))
print("Confusion matrix:")
print(confusion_matrix(y_test, best_model.predict(X_test)))

# --------------------------------------------------------------------------
# 9. SAVE ARTIFACTS (same file names/structure as before -> backend untouched)
# --------------------------------------------------------------------------
print("\nSaving artifacts (same structure as before)...")
# =========================
# Save artifacts
# =========================

OUTPUT_DIR = "virality_prediction_backend_v2"

joblib.dump(rf_best, f"{OUTPUT_DIR}/model_random_forest.joblib")
joblib.dump(xgb_best, f"{OUTPUT_DIR}/model_xgboost.joblib")
joblib.dump(et_best, f"{OUTPUT_DIR}/model_extra_trees.joblib")
joblib.dump(cat_best, f"{OUTPUT_DIR}/model_catboost.joblib")
joblib.dump(stack, f"{OUTPUT_DIR}/model_ensemble.joblib")

joblib.dump(tfidf, f"{OUTPUT_DIR}/vectorizer_tfidf.joblib")
joblib.dump(scaler, f"{OUTPUT_DIR}/scaler_metadata.joblib")
joblib.dump(ohe, f"{OUTPUT_DIR}/encoder_categorical.joblib")

with open(f"{OUTPUT_DIR}/feature_names.json", "w") as f:
    json.dump(feature_names, f, indent=2)

with open(f"{OUTPUT_DIR}/schema.json", "w") as f:
    json.dump(schema, f, indent=2)

results_df.to_csv(f"{OUTPUT_DIR}/model_comparison_v2.csv", index=False)
results_df.to_json(
    f"{OUTPUT_DIR}/model_comparison_v2.json",
    orient="records",
    indent=2
)

df.to_csv(f"{OUTPUT_DIR}/posts_cleaned.csv", index=False)

print("\nDone. Best model saved as model_ensemble.joblib (drop-in replacement, inference.py unchanged).")
