"""
Backend inference module for the Content Virality Prediction system.

Usage:
    from inference import predict_virality
    result = predict_virality({
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
    })
    # -> {"viral": 1, "viral_probability": 0.83, "model": "ensemble"}

All artifacts (models/vectorizer/scaler/encoder) are loaded once at import
time from the same directory as this file.
"""

import json
import joblib
import pandas as pd
from scipy import sparse

from pathlib import Path

try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
except ImportError:  # pragma: no cover
    try:
        from nltk.sentiment.vader import SentimentIntensityAnalyzer
    except ImportError:  # pragma: no cover
        class SentimentIntensityAnalyzer:  # type: ignore
            def polarity_scores(self, text: str) -> dict:
                return {"neg": 0.0, "neu": 1.0, "pos": 0.0, "compound": 0.0}

BASE_DIR = Path(__file__).resolve().parent

MODEL_DIR = BASE_DIR / "models"

CONFIG_DIR = BASE_DIR / "config"

try:
    _rf = joblib.load(MODEL_DIR / "model_random_forest.joblib")
    _svm = joblib.load(MODEL_DIR / "model_svm.joblib")
    _xgb = joblib.load(MODEL_DIR / "model_xgboost.joblib")
    _ensemble = joblib.load(MODEL_DIR / "model_ensemble.joblib")
    _tfidf = joblib.load(MODEL_DIR / "vectorizer_tfidf.joblib")
    _scaler = joblib.load(MODEL_DIR / "scaler_metadata.joblib")
    _ohe = joblib.load(MODEL_DIR / "encoder_categorical.joblib")
except Exception as e:
    raise RuntimeError(f"Failed to load ML artifacts: {e}")

with open(CONFIG_DIR / "schema.json", "r", encoding="utf-8") as f:
    _SCHEMA = json.load(f)

_sia = SentimentIntensityAnalyzer()

_META_NUMERIC = _SCHEMA["metadata_numeric_columns"]  # includes caption_len / caption_word_count
_CAT_COLS = _SCHEMA["categorical_columns"]

_MODELS = {"random_forest": _rf, "svm": _svm, "xgboost": _xgb, "ensemble": _ensemble}


def _row_to_features(post: dict) -> sparse.csr_matrix:
    """Turn a single raw post dict into the fused feature vector used at train time."""
    caption = str(post.get("caption", "")).strip()

    tfidf_vec = _tfidf.transform([caption])

    sentiment = _sia.polarity_scores(caption)
    sent_row = {f"sent_{k}": v for k, v in sentiment.items()}

    meta_row = {
        "post_hour": post.get("post_hour", 0),
        "day_of_week": post.get("day_of_week", 0),
        "follower_count": post.get("follower_count", 0),
        "early_likes": post.get("early_likes", 0),
        "early_shares": post.get("early_shares", 0),
        "early_comments": post.get("early_comments", 0),
        "saves": post.get("saves", 0),
        "reach": post.get("reach", 0),
        "impressions": post.get("impressions", 0),
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

    return sparse.hstack([tfidf_vec, sparse.csr_matrix(meta_scaled), cat_matrix]).tocsr()


def predict_virality(post: dict, model: str = "ensemble") -> dict:
    """
    post: dict with keys caption, post_hour, day_of_week, follower_count,
          early_likes, early_shares, early_comments, saves, reach,
          impressions, media_type, content_category
    model: one of "random_forest", "svm", "xgboost", "ensemble" (default)
    """
    if model not in _MODELS:
        raise ValueError(f"model must be one of {list(_MODELS)}")
    X = _row_to_features(post)
    clf = _MODELS[model]
    proba = float(clf.predict_proba(X)[0, 1])
    pred = int(proba >= 0.5)
    return {"viral": pred, "viral_probability": round(proba, 4), "model": model}


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
    }
    print(predict_virality(sample))
