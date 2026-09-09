"""
Backend inference module for the Content Virality Prediction system.
Integrates the improved ML models (CatBoost, Tuned XGBoost, Ensemble)
while preserving real handcrafted visual feature analysis for diagnostics & recommendations.
"""

import json
from pathlib import Path
from typing import Dict, Tuple

import joblib
import pandas as pd
from scipy import sparse

try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
except ImportError:  # pragma: no cover
    try:
        from nltk.sentiment.vader import SentimentIntensityAnalyzer
    except ImportError:  # pragma: no cover
        class SentimentIntensityAnalyzer:  # type: ignore
            def polarity_scores(self, text: str) -> dict:
                return {"neg": 0.0, "neu": 1.0, "pos": 0.0, "compound": 0.0}

from image_features import extract_from_base64_with_status

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"
CONFIG_DIR = BASE_DIR / "config"

try:
    _xgb = joblib.load(MODEL_DIR / "model_xgboost.joblib")
    _cat = joblib.load(MODEL_DIR / "model_catboost.joblib")
    _ensemble = joblib.load(MODEL_DIR / "model_ensemble.joblib")
    _tfidf = joblib.load(MODEL_DIR / "vectorizer_tfidf.joblib")
    _scaler = joblib.load(MODEL_DIR / "scaler_metadata.joblib")
    _ohe = joblib.load(MODEL_DIR / "encoder_categorical.joblib")
except Exception as e:
    raise RuntimeError(f"Failed to load ML artifacts: {e}")

with open(CONFIG_DIR / "schema.json", "r", encoding="utf-8") as f:
    _SCHEMA = json.load(f)

_sia = SentimentIntensityAnalyzer()

_META_NUMERIC = _SCHEMA["metadata_numeric_columns"]
_CAT_COLS = _SCHEMA["categorical_columns"]

_MODELS = {
    "xgboost": _xgb,
    "catboost": _cat,
    "ensemble": _ensemble,
    # Graceful fallback mapping for legacy model selections
    "random_forest": _ensemble,
    "svm": _ensemble,
}


def _row_to_features(post: dict) -> Tuple[sparse.csr_matrix, Dict[str, float], bool]:
    """Turn a single raw post dict into the fused feature vector used by the v2 models."""
    caption = str(post.get("caption", "")).strip()

    tfidf_vec = _tfidf.transform([caption])

    sentiment = _sia.polarity_scores(caption)
    sent_row = {f"sent_{k}": v for k, v in sentiment.items()}

    # Handcrafted visual features (for recommendations and image diagnostics)
    image_features, image_analysis_available = extract_from_base64_with_status(
        post.get("imageBase64", "")
    )

    meta_row = {
        "post_hour": int(post.get("post_hour", 0)),
        "day_of_week": int(post.get("day_of_week", 0)),
        "follower_count": int(post.get("follower_count", 0)),
        "early_likes": int(post.get("early_likes", 0)),
        "early_shares": int(post.get("early_shares", 0)),
        "early_comments": int(post.get("early_comments", 0)),
        "saves": int(post.get("saves", 0)),
        "reach": int(post.get("reach", 0)),
        "impressions": int(post.get("impressions", 0)),
        "caption_len": len(caption),
        "caption_word_count": len(caption.split()),
    }
    meta_row.update(sent_row)
    meta_df = pd.DataFrame([meta_row])[_META_NUMERIC + list(sent_row.keys())]
    meta_scaled = _scaler.transform(meta_df)

    cat_df = pd.DataFrame([{
        "media_type": post.get("media_type", "image"),
        "content_category": post.get("content_category", "Lifestyle"),
    }])[_CAT_COLS]
    cat_matrix = _ohe.transform(cat_df)

    feature_matrix = sparse.hstack(
        [tfidf_vec, sparse.csr_matrix(meta_scaled), cat_matrix]
    ).tocsr()

    return feature_matrix, image_features, image_analysis_available


def predict_virality(post: dict, model: str = "ensemble") -> dict:
    """
    post: dict with keys caption, post_hour, day_of_week, follower_count,
          early_likes, early_shares, early_comments, saves, reach, impressions,
          media_type, content_category, hashtags (optional), imageBase64 (optional).
    model: one of "xgboost", "catboost", "ensemble" (default)
    """
    selected_model = model.lower() if isinstance(model, str) else "ensemble"
    if selected_model not in _MODELS:
        selected_model = "ensemble"

    X, image_features, image_analysis_available = _row_to_features(post)
    clf = _MODELS[selected_model]
    proba = float(clf.predict_proba(X)[0, 1])
    pred = int(proba >= 0.5)

    return {
        "viral": pred,
        "viral_probability": round(proba, 4),
        "model": selected_model,
        "image_features": image_features if image_analysis_available else None,
        "image_analysis_available": image_analysis_available,
    }


def predict_batch(posts: list, model: str = "ensemble") -> list:
    return [predict_virality(p, model=model) for p in posts]


if __name__ == "__main__":
    sample = {
        "caption": "A golden retriever puppy playing in autumn leaves",
        "post_hour": 18,
        "day_of_week": 5,
        "follower_count": 12000,
        "early_likes": 300,
        "early_shares": 20,
        "early_comments": 15,
        "saves": 40,
        "reach": 8000,
        "impressions": 11000,
        "media_type": "reel",
        "content_category": "Lifestyle",
        "hashtags": "#dogsofinstagram #puppy",
    }
    print("Ensemble:", predict_virality(sample, "ensemble"))
    print("CatBoost:", predict_virality(sample, "catboost"))
    print("XGBoost:", predict_virality(sample, "xgboost"))