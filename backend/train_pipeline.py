"""
Multimodal Content Virality Prediction - Training Pipeline (FIXED, v3)
Matches architecture described in Major_Project_Report_Final_2.docx:
  - Textual features: TF-IDF + Sentiment Analysis (VADER) + hook/hashtag signals
  - Image features: handcrafted (brightness, colorfulness, edge density, etc.)
    -- see image_features.py. Computed by build_flickr8k_dataset.py and
    carried through in posts_relabeled.csv.
  - Metadata features: PRE-PUBLISH ONLY (timing/follower signals -- no
    post-publish engagement counts)
  - Ensemble classifiers: Random Forest, SVM, XGBoost (+ soft-voting ensemble)
  - Explainability: SHAP feature importance

WHAT CHANGED IN v3
--------------------
posts_relabeled.csv is now built from build_flickr8k_dataset.py, which pairs
675 REAL images with their REAL Flickr8k captions -- each image can appear
in up to 5 rows (one per caption). A plain random train/test split would let
the SAME image appear in both train and test with a different caption,
leaking information and inflating every metric below. The split is now a
GroupShuffleSplit on `image_id`, so all rows for a given image stay
entirely in train OR entirely in test, never both. This is the only
functional change from v2 -- everything else (leakage-column exclusion,
image feature inclusion, SHAP) is unchanged.

Note: GroupShuffleSplit does not support stratify=y the way train_test_split
did. With ~3375 rows and a base viral rate around 0.30-0.40, class balance
between the resulting train/test sets should still be reasonably close, but
it's no longer guaranteed exact -- check the printed class balance below if
you want to confirm.

WHAT CHANGED FROM THE ORIGINAL PIPELINE (v1)
----------------------------------------------------------------------
1. Trains on data/posts_relabeled.csv instead of posts_merged_dataset.csv,
   because the original `viral` label was derived from random engagement
   numbers with no real link to caption/content.
2. early_likes, early_shares, early_comments, saves, reach, impressions are
   REMOVED from the feature set entirely. A real user does not have these
   numbers before publishing, so the model must never see them.
3. Adds hook_score and hashtag_count as legitimate pre-publish text signals.
"""
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
CONFIG_DIR = BASE_DIR / "config"

# Point this at the relabeled file produced by build_flickr8k_dataset.py.
DATA_FILE = DATA_DIR / "posts_relabeled.csv"

import json
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import joblib
from scipy import sparse
from sklearn.model_selection import GroupShuffleSplit
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

try:
    from image_features import FEATURE_NAMES as IMG_FEATURE_NAMES
except ImportError as e:
    raise SystemExit(
        "image_features.py not found next to train_pipeline.py. "
        "Copy it into backend/ first."
    ) from e

RANDOM_STATE = 42

HOOK_PHRASES = [
    "you won't believe", "wait for it", "here's why", "how to",
    "the truth about", "nobody talks about", "this changed",
    "before and after", "vs", "top ", "?",
]


def hook_score(caption: str) -> float:
    c = caption.lower()
    hits = sum(1 for phrase in HOOK_PHRASES if phrase in c)
    return min(hits, 3) / 3.0


def hashtag_count(row) -> int:
    tag_field = str(row.get("hashtags", "") or "")
    if tag_field.strip():
        return len([t for t in tag_field.replace(",", " ").split() if t.strip()])
    return str(row.get("caption", "")).count("#")


# --------------------------------------------------------------------------
# 1. LOAD + CLEAN
# --------------------------------------------------------------------------
print(f"Loading raw dataset from {DATA_FILE.name} ...")
if not DATA_FILE.exists():
    raise SystemExit(
        f"{DATA_FILE} not found. Run build_flickr8k_dataset.py first to "
        f"generate it."
    )
df = pd.read_csv(DATA_FILE)
print(f"Raw shape: {df.shape}")

missing_img_cols = [c for c in IMG_FEATURE_NAMES if c not in df.columns]
if missing_img_cols:
    raise SystemExit(
        f"posts_relabeled.csv is missing image feature columns {missing_img_cols}. "
        f"Re-run build_flickr8k_dataset.py to regenerate it with image "
        f"features included."
    )

if "image_id" not in df.columns:
    raise SystemExit(
        "posts_relabeled.csv is missing the `image_id` column needed for a "
        "group-aware train/test split. Re-run build_flickr8k_dataset.py."
    )

before = len(df)
df = df.drop_duplicates(subset="post_id").reset_index(drop=True)
df = df.dropna(subset=["caption", "viral"]).reset_index(drop=True)
df["caption"] = df["caption"].astype(str).str.strip()
df = df[df["caption"].str.len() > 0].reset_index(drop=True)

# Only clip/validate PRE-PUBLISH numeric columns. Engagement columns may
# still exist in the CSV (e.g. for the recommendation engine / analytics
# dashboard) but are intentionally excluded from numeric_cols / features.
numeric_cols = ["post_hour", "day_of_week", "follower_count"]
for c in numeric_cols:
    df[c] = pd.to_numeric(df[c], errors="coerce")
df = df.dropna(subset=numeric_cols).reset_index(drop=True)
for c in numeric_cols:
    df[c] = df[c].clip(lower=0)

# Image feature columns should already be clean numeric floats from
# build_flickr8k_dataset.py, but coerce defensively in case of manual edits.
for c in IMG_FEATURE_NAMES:
    df[c] = pd.to_numeric(df[c], errors="coerce")
df[IMG_FEATURE_NAMES] = df[IMG_FEATURE_NAMES].fillna(
    df[IMG_FEATURE_NAMES].median(numeric_only=True)
)

print(f"Cleaned shape: {df.shape} (removed {before - len(df)} rows)")
print(f"Unique images: {df['image_id'].nunique()} "
      f"(avg {len(df) / df['image_id'].nunique():.1f} rows/image)")

# --------------------------------------------------------------------------
# 2. LEAKAGE / EXCLUDED COLUMNS
# --------------------------------------------------------------------------
TARGET = "viral"
EXCLUDED_COLS = [
    "engagement_rate", "performance_bucket_label",
    "early_likes", "early_shares", "early_comments",
    "saves", "reach", "impressions",
    "viral_probability",  # only present in relabeled file as a debug column
]
ID_COLS = ["post_id", "image_id", "image_name", "image_path"]

# --------------------------------------------------------------------------
# 3. TEXT FEATURES: TF-IDF + VADER sentiment + hook/hashtag signals
# --------------------------------------------------------------------------
print("Extracting text features (TF-IDF + VADER sentiment + hooks)...")
sia = SentimentIntensityAnalyzer()
sent = df["caption"].apply(sia.polarity_scores).apply(pd.Series)
sent.columns = [f"sent_{c}" for c in sent.columns]  # sent_neg, sent_neu, sent_pos, sent_compound
df["caption_len"] = df["caption"].str.len()
df["caption_word_count"] = df["caption"].str.split().apply(len)
df["hook_score"] = df["caption"].apply(hook_score)
df["hashtag_count"] = df.apply(hashtag_count, axis=1)

tfidf = TfidfVectorizer(max_features=300, stop_words="english", ngram_range=(1, 2))
tfidf_matrix = tfidf.fit_transform(df["caption"])

# --------------------------------------------------------------------------
# 4. METADATA FEATURES (pre-publish only) -- now includes image features
# --------------------------------------------------------------------------
print("Building metadata features (pre-publish only, incl. image features)...")
meta_numeric = (
    ["post_hour", "day_of_week", "follower_count",
     "caption_len", "caption_word_count", "hook_score", "hashtag_count"]
    + IMG_FEATURE_NAMES
)
meta_numeric_df = pd.concat([df[meta_numeric], sent], axis=1)

ohe = OneHotEncoder(handle_unknown="ignore", sparse_output=True)
cat_matrix = ohe.fit_transform(df[["media_type", "content_category"]])

scaler = StandardScaler()
meta_scaled = scaler.fit_transform(meta_numeric_df)

# --------------------------------------------------------------------------
# 5. FUSE MODALITIES -> single feature matrix
# --------------------------------------------------------------------------
print("Fusing text + image + metadata + categorical features...")
X = sparse.hstack([tfidf_matrix, sparse.csr_matrix(meta_scaled), cat_matrix]).tocsr()
y = df[TARGET].values
groups = df["image_id"].values

feature_names = (list(tfidf.get_feature_names_out())
                  + list(meta_numeric_df.columns)
                  + list(ohe.get_feature_names_out(["media_type", "content_category"])))
print(f"Final feature matrix: {X.shape}")
assert not any(col in feature_names for col in EXCLUDED_COLS), (
    "A post-publish/leakage column ended up in the feature set -- check "
    "meta_numeric above."
)

# --------------------------------------------------------------------------
# 6. TRAIN / TEST SPLIT -- GROUP-AWARE (by image_id)
# --------------------------------------------------------------------------
# Each real image can appear in up to 5 rows (one per Flickr8k caption). A
# plain random split could put the same image in both train and test with
# a different caption -- the model would partly be recognising the image
# rather than generalising, inflating every metric below. GroupShuffleSplit
# keeps every row for a given image_id entirely on one side of the split.
gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=RANDOM_STATE)
train_idx, test_idx = next(gss.split(X, y, groups=groups))
X_train, X_test = X[train_idx], X[test_idx]
y_train, y_test = y[train_idx], y[test_idx]

train_images = set(groups[train_idx])
test_images = set(groups[test_idx])
overlap = train_images & test_images
print(f"Train: {X_train.shape}, Test: {X_test.shape}")
print(f"Unique images -- train: {len(train_images)}, test: {len(test_images)}, "
      f"overlap: {len(overlap)} (must be 0)")
print(f"Class balance -- train viral rate: {y_train.mean():.3f}, "
      f"test viral rate: {y_test.mean():.3f}")
assert len(overlap) == 0, "Image leaked across train/test split -- this should never happen."

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
if results_df["roc_auc"].max() < 0.6:
    print(
        "\nWARNING: best ROC-AUC is still close to 0.5 (coin flip). "
        "This means there's still not enough genuine signal linking your "
        "features to the label -- revisit build_flickr8k_dataset.py's "
        "weights before trusting this model."
    )

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
MODELS_DIR.mkdir(parents=True, exist_ok=True)
CONFIG_DIR.mkdir(parents=True, exist_ok=True)

joblib.dump(rf, MODELS_DIR / "model_random_forest.joblib")
joblib.dump(svm, MODELS_DIR / "model_svm.joblib")
joblib.dump(xgb, MODELS_DIR / "model_xgboost.joblib")
joblib.dump(ensemble, MODELS_DIR / "model_ensemble.joblib")

joblib.dump(tfidf, MODELS_DIR / "vectorizer_tfidf.joblib")
joblib.dump(scaler, MODELS_DIR / "scaler_metadata.joblib")
joblib.dump(ohe, MODELS_DIR / "encoder_categorical.joblib")

df.to_csv(DATA_DIR / "posts_cleaned.csv", index=False)
results_df.to_csv(CONFIG_DIR / "model_comparison.csv", index=False)
results_df.to_json(CONFIG_DIR / "model_comparison.json", orient="records", indent=2)

with open(CONFIG_DIR / "feature_names.json", "w") as f:
    json.dump(feature_names, f)

with open(CONFIG_DIR / "schema.json", "w") as f:
    json.dump({
        "text_column": "caption",
        "metadata_numeric_columns": meta_numeric,
        "image_feature_columns": IMG_FEATURE_NAMES,
        "sentiment_columns": list(sent.columns),
        "categorical_columns": ["media_type", "content_category"],
        "target_column": "viral",
        "excluded_columns": EXCLUDED_COLS,
        "id_columns_not_used_as_features": ID_COLS,
        "split_strategy": "GroupShuffleSplit on image_id (test_size=0.2) -- "
                           "prevents the same image appearing in both train "
                           "and test across its multiple captions.",
        "note": "early_likes/early_shares/early_comments/saves/reach/impressions "
                "are POST-PUBLISH outcomes and are never used as features, "
                "at train time or inference time. Image features are "
                "handcrafted (see image_features.py), computed identically "
                "at train and inference time.",
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

img_in_top25 = [row for row in top_features if row["feature"].startswith("img_")]
print(f"\n{len(img_in_top25)} image feature(s) appear in the top 25 -- "
      f"if this is 0, the image genuinely has little influence on this "
      f"training run and you may want to revisit the image_score weight "
      f"in build_flickr8k_dataset.py.")
print(
    "\nSanity check: none of the top features should be early_likes/"
    "early_shares/early_comments/saves/reach/impressions -- they were "
    "never in the feature set, so they cannot appear here."
)

print("\nDone.")