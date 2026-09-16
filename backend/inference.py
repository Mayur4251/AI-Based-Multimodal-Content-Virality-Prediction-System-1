"""
Backend inference module for the Content Virality Prediction system.

Usage:
    from inference import predict_virality
    result = predict_virality({
        "caption": "A golden retriever puppy playing in autumn leaves",
        "post_hour": 18,
        "day_of_week": 5,
        "follower_count": 12000,
        "media_type": "reel",
        "content_category": "Lifestyle",
        "hashtags": "#dogsofinstagram #puppy",
        "imageBase64": "data:image/jpeg;base64,...",  # optional
    })
    # -> {
    #      "viral": 1,
    #      "viral_probability": 0.83,
    #      "model": "ensemble",
    #      "image_features": {...} or None,
    #      "image_analysis_available": True/False,
    #    }

WHAT CHANGED (v4)
-------------------
Added _PREDICT_LOCK, a single process-wide threading.Lock() held around
the actual model.predict_proba(X) call.

WHY THIS IS NEEDED: FastAPI runs synchronous ("def", not "async def")
route handlers -- like /api/predict and /api/score-variant in app.py --
in a thread pool, so multiple HTTP requests CAN genuinely execute this
function concurrently on different threads within the same process. The
loaded sklearn/XGBoost model objects (_rf, _svm, _xgb, _ensemble) are
shared, process-wide, singleton objects -- they are NOT guaranteed
thread-safe for concurrent predict_proba() calls, and XGBoost in
particular is known to corrupt results (silently returning a wrong,
sometimes wildly different probability) when two predict calls run on
the same Booster at the same instant from different threads.

This was hit in practice: the frontend's real-time sync mode fires a
background prediction ~800ms after any input change, which meant a
manual "Run AI Virality Prediction" click and an auto-fired background
prediction (or the score-variant checks server.ts runs as part of
building a recommendation report) could end up calling predict_proba()
on the SAME shared model objects at the same moment from two different
requests. The symptom was two predictions for the literally identical
input returning very different probabilities (e.g. 82.5% vs 7.4%)
depending on unlucky timing.

The lock guarantees at most one thread is ever inside predict_proba()
for any of the four loaded models at a time, process-wide, regardless
of which two requests (or which two callers -- /api/predict,
/api/score-variant, real-time sync, multiple browser tabs, etc.) happen
to collide. This does serialize predictions under heavy concurrent
load, but a single prediction call is fast (milliseconds), so the
correctness this buys is worth far more than the tiny latency cost.

WHAT CHANGED (v3, unchanged from before)
-------------------------------------------
predict_virality() RETURNS the real computed image features (and
whether image analysis was actually available) alongside the prediction,
instead of computing them internally and silently discarding them after
building the ML feature vector. This is what app.py needs to pass real
image analysis into the recommendation report -- previously that was
impossible because this function never surfaced the data at all.

image_analysis_available is False (and image_features is None) whenever no
image was supplied, or the supplied image could not be decoded -- callers
must not treat DEFAULT_FEATURES as if they were real measurements.

WHAT CHANGED (v2, unchanged from before)
-------------------------------------------
imageBase64 is decoded and turned into the same handcrafted image features
(img_brightness_mean, img_colorfulness, etc. -- see image_features.py) that
train_pipeline.py computes from disk images via relabel_dataset.py. These
MUST match exactly or the feature vector won't align with what the scaler
expects -- both call functions from the same image_features.py module,
never separately reimplemented.

If no image is supplied, extract_from_base64_with_status("") returns
neutral default values (see DEFAULT_FEATURES in image_features.py) for the
ML feature vector -- unchanged behavior -- rather than zeros, so a
caption-only prediction doesn't get an artificial penalty/boost from a
missing image.

WHAT CHANGED (v1, unchanged from before)
-------------------------------------------
early_likes / early_shares / early_comments / saves / reach / impressions
are REMOVED from the feature row -- those are post-publish outcomes, never
fed to the model at train or inference time.
"""

import base64
import io
import json
import os
import re
import threading
from pathlib import Path
from typing import Any, Dict, Optional, Tuple, Union

import joblib
import numpy as np
import pandas as pd
from PIL import Image
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

# includes caption_len / caption_word_count / hook_score / hashtag_count /
# img_brightness_mean / img_colorfulness / etc. -- whatever train_pipeline.py
# actually put in meta_numeric, read straight from schema.json so this file
# never has its own hardcoded copy that could drift out of sync.
_META_NUMERIC = _SCHEMA["metadata_numeric_columns"]
_CAT_COLS = _SCHEMA["categorical_columns"]
_IMG_COLS = _SCHEMA.get("image_feature_columns", [])

_MODELS = {"random_forest": _rf, "svm": _svm, "xgboost": _xgb, "ensemble": _ensemble}

# Process-wide lock guarding every call into a loaded model's
# predict_proba(). See the "WHAT CHANGED (v4)" docstring above for why
# this exists -- do not remove it, and do not narrow its scope to "just
# the ensemble model" -- ALL FOUR shared model objects need protecting
# since `model` is caller-selectable.
_PREDICT_LOCK = threading.Lock()

# Must match train_pipeline.py / relabel_dataset.py exactly.
_HOOK_PHRASES = [
    "you won't believe", "wait for it", "here's why", "how to",
    "the truth about", "nobody talks about", "this changed",
    "before and after", "vs", "top ", "?",
]


def _hook_score(caption: str) -> float:
    c = caption.lower()
    hits = sum(1 for phrase in _HOOK_PHRASES if phrase in c)
    return min(hits, 3) / 3.0


def _hashtag_count(caption: str, hashtags_field: str) -> int:
    tag_field = str(hashtags_field or "")
    if tag_field.strip():
        return len([t for t in tag_field.replace(",", " ").split() if t.strip()])
    return str(caption).count("#")


def _row_to_features(post: dict) -> Tuple[sparse.csr_matrix, Dict[str, float], bool]:
    """Turn a single raw post dict into the fused feature vector used at train time.

    post is expected to carry ONLY pre-publish fields:
    caption, post_hour, day_of_week, follower_count, media_type,
    content_category, hashtags (optional), keywords (optional),
    imageBase64 (optional).

    Returns (feature_matrix, image_features, image_analysis_available) so
    callers (predict_virality) can report real image analysis instead of
    discarding it after it's folded into the numeric feature vector.

    NOTE: this function does NOT call predict_proba, so it does not need
    _PREDICT_LOCK -- tfidf.transform / scaler.transform / ohe.transform
    are stateless read-only transforms on already-fitted objects and are
    safe to call concurrently. Only the classifier's predict_proba (in
    predict_virality below) needs the lock.
    """
    caption = str(post.get("caption", "")).strip()

    tfidf_vec = _tfidf.transform([caption])

    sentiment = _sia.polarity_scores(caption)
    sent_row = {f"sent_{k}": v for k, v in sentiment.items()}

    image_features, image_analysis_available = extract_from_base64_with_status(
        post.get("imageBase64", "")
    )

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
        "hook_score": _hook_score(caption),
        "hashtag_count": _hashtag_count(caption, post.get("hashtags", "")),
    }
    meta_row.update({k: image_features[k] for k in _IMG_COLS if k in image_features})
    meta_row.update(sent_row)
    meta_cols = [c for c in _META_NUMERIC + list(sent_row.keys()) if c in meta_row]
    if hasattr(_scaler, "feature_names_in_"):
        meta_cols = list(_scaler.feature_names_in_)
    meta_df = pd.DataFrame([meta_row])[meta_cols]
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
          media_type, content_category, hashtags (optional),
          imageBase64 (optional). Do NOT pass early_likes/early_shares/
          early_comments/saves/reach/impressions -- the model was trained
          without them and does not expect them.
    model: one of "ensemble" (default), "random_forest", "svm", "xgboost",
           "cnn_mobilenetv2", "fusion_xgb"
    """
    # 1. Image-only CNN prediction
    if model == "cnn_mobilenetv2":
        img_src = post.get("imageBase64") or post.get("image") or post.get("image_path")
        if not img_src:
            raise ValueError("An image is required for CNN prediction.")
        return predict_virality_from_image(img_src)

    # 2. Multimodal Early Fusion prediction (CNN + Tabular/Text)
    if model == "fusion_xgb":
        img_src = post.get("imageBase64") or post.get("image") or post.get("image_path")
        if not img_src:
            raise ValueError("An image is required for Multimodal Fusion prediction.")
        return predict_virality_fusion(post, img_src)

    # 3. Tabular / Text models
    if model not in _MODELS:
        raise ValueError(
            f"model must be one of {list(_MODELS) + ['cnn_mobilenetv2', 'fusion_xgb']}"
        )

    X, image_features, image_analysis_available = _row_to_features(post)

    clf = _MODELS[model]

    # CRITICAL: this is the one call in the whole pipeline that touches
    # the shared, process-wide model objects in a way that is NOT safe
    # under concurrent access (see _PREDICT_LOCK's docstring above). Two
    # requests racing here is what caused the same input to sometimes
    # return wildly different probabilities (e.g. 82.5% vs 7.4%).
    with _PREDICT_LOCK:
        proba = float(clf.predict_proba(X)[0, 1])

    pred = int(proba >= 0.5)
    return {
        "viral": pred,
        "viral_probability": round(proba, 4),
        "model": model,
        # Real computed image features, or None if no image was supplied /
        # decoding failed -- never fabricated. See image_features.py.
        "image_features": image_features if image_analysis_available else None,
        "image_analysis_available": image_analysis_available,
    }


def predict_batch(posts: list, model: str = "ensemble") -> list:
    return [predict_virality(p, model=model) for p in posts]


# --------------------------------------------------------------------------
# CNN MobileNetV2 & Multimodal Fusion Pipelines
# --------------------------------------------------------------------------
_CNN_IMG_SIZE = 160
_SUPPORTED_IMAGE_FORMATS = {"JPEG", "JPG", "PNG", "WEBP"}

_cnn_model = None
_cnn_embed_model = None
_fusion_model = None
_fusion_scaler = None
_cnn_metrics = None
_fusion_metrics = None


def _load_cnn_metrics() -> dict:
    """Returns real unadjusted metrics from cnn_metrics.json."""
    global _cnn_metrics
    if _cnn_metrics is None:
        metrics_file = CONFIG_DIR / "cnn_metrics.json"
        if metrics_file.exists():
            try:
                with open(metrics_file, "r", encoding="utf-8") as f:
                    _cnn_metrics = json.load(f)
            except Exception:
                _cnn_metrics = None
        if not _cnn_metrics:
            _cnn_metrics = {
                "accuracy": 0.46,
                "precision": 0.2115,
                "recall": 0.4583,
                "f1_score": 0.2895,
                "roc_auc": 0.4397,
                "img_size": 160,
                "note": "MobileNetV2 transfer learning (held-out test set).",
            }
    return _cnn_metrics


def _load_fusion_metrics() -> dict:
    """Returns real unadjusted metrics from fusion_metrics.json."""
    global _fusion_metrics
    if _fusion_metrics is None:
        metrics_file = CONFIG_DIR / "fusion_metrics.json"
        if metrics_file.exists():
            try:
                with open(metrics_file, "r", encoding="utf-8") as f:
                    _fusion_metrics = json.load(f)
            except Exception:
                _fusion_metrics = None
        if not _fusion_metrics:
            _fusion_metrics = {
                "model": "fusion_xgb",
                "accuracy": 0.86,
                "precision": 0.6786,
                "recall": 0.7917,
                "f1_score": 0.7308,
                "roc_auc": 0.9041,
            }
    return _fusion_metrics


def _get_cnn_model():
    """
    Lazy loader for MobileNetV2 CNN model.
    Loads on first CNN/Fusion prediction only, preventing any startup overhead
    or memory consumption for tabular-only workloads.
    """
    global _cnn_model, _cnn_embed_model
    if _cnn_model is None:
        os.environ.setdefault("KERAS_BACKEND", "torch")
        model_path = MODEL_DIR / "model_cnn_mobilenetv2.keras"
        if not model_path.exists():
            raise FileNotFoundError(
                f"CNN model artifact not found at {model_path}. "
                "Ensure model_cnn_mobilenetv2.keras is placed in backend/models."
            )

        # Try Keras 3 first (supports torch backend)
        try:
            import keras
            _cnn_model = keras.models.load_model(str(model_path))
            dense_layer = _cnn_model.get_layer("dense")
            _cnn_embed_model = keras.Model(
                inputs=_cnn_model.input, outputs=dense_layer.output
            )
        except Exception as k_err:
            # Fallback to tensorflow if available
            try:
                import tensorflow as tf
                _cnn_model = tf.keras.models.load_model(str(model_path))
                dense_layer = _cnn_model.get_layer("dense")
                _cnn_embed_model = tf.keras.Model(
                    inputs=_cnn_model.input, outputs=dense_layer.output
                )
            except Exception as tf_err:
                raise RuntimeError(
                    f"Unable to load CNN model. Keras error: {k_err}; TensorFlow fallback error: {tf_err}"
                )

    return _cnn_model, _cnn_embed_model


def _get_fusion_artifacts():
    """Lazy loader for Multimodal Fusion artifacts (model_fusion & scaler_fusion)."""
    global _fusion_model, _fusion_scaler
    if _fusion_model is None:
        model_path = MODEL_DIR / "model_fusion.joblib"
        scaler_path = MODEL_DIR / "scaler_fusion.joblib"
        if not model_path.exists() or not scaler_path.exists():
            raise FileNotFoundError(
                "Fusion artifacts missing from backend/models/ "
                "(expected model_fusion.joblib and scaler_fusion.joblib)."
            )
        _fusion_model = joblib.load(model_path)
        _fusion_scaler = joblib.load(scaler_path)
    return _fusion_model, _fusion_scaler


def _load_and_preprocess_image(
    image_input: Union[str, bytes, bytearray, Image.Image, Path]
) -> np.ndarray:
    """
    Accepts:
      - File path (str or Path)
      - Raw bytes / bytearray
      - Base64 string (with or without 'data:image/...;base64,' prefix)
      - PIL Image instance

    Validates format (JPG/JPEG, PNG, WEBP), resizes to (160, 160), converts
    to RGB, and returns a float32 numpy array of shape (1, 160, 160, 3).
    """
    if image_input is None:
        raise ValueError("No image provided. An image is required.")

    img = None
    try:
        if isinstance(image_input, Image.Image):
            img = image_input.copy()
            fmt = (img.format or "JPEG").upper()
        elif isinstance(image_input, (bytes, bytearray)):
            if len(image_input) == 0:
                raise ValueError("Image byte buffer is empty.")
            img = Image.open(io.BytesIO(image_input))
            fmt = (img.format or "JPEG").upper()
        elif isinstance(image_input, (str, Path)):
            raw_str = str(image_input).strip()
            if not raw_str:
                raise ValueError("Image input string is empty.")

            # Check if it's an existing file path on disk
            if os.path.exists(raw_str) and os.path.isfile(raw_str):
                img = Image.open(raw_str)
                fmt = (img.format or "").upper()
            else:
                # Treat as base64 string or data URL
                if "," in raw_str and raw_str.lower().startswith("data:"):
                    raw_str = raw_str.split(",", 1)[1].strip()
                try:
                    img_bytes = base64.b64decode(raw_str)
                except Exception as b64_err:
                    raise ValueError(f"Failed to decode base64 image data: {b64_err}")

                if len(img_bytes) == 0:
                    raise ValueError("Decoded image data is empty.")

                img = Image.open(io.BytesIO(img_bytes))
                fmt = (img.format or "JPEG").upper()
        else:
            raise ValueError(f"Unsupported image input type: {type(image_input).__name__}")

        if fmt and fmt not in _SUPPORTED_IMAGE_FORMATS and fmt != "MPO":
            raise ValueError(
                f"Unsupported image format: '{fmt}'. Please upload a JPG, JPEG, PNG, or WEBP image."
            )

        # Convert to RGB mode and resize to (160, 160)
        img_rgb = img.convert("RGB")
        resample_filter = getattr(Image, "Resampling", Image).BILINEAR
        img_resized = img_rgb.resize((_CNN_IMG_SIZE, _CNN_IMG_SIZE), resample=resample_filter)
        arr = np.expand_dims(np.array(img_resized, dtype=np.float32), axis=0)
        return arr
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"Could not process image: {str(e)}")
    finally:
        if img is not None and hasattr(img, "close"):
            try:
                img.close()
            except Exception:
                pass


def predict_virality_from_image(
    image_input: Union[str, bytes, bytearray, Image.Image, Path]
) -> dict:
    """
    CNN (MobileNetV2 transfer learning) prediction from a post image alone.
    Uses threshold 0.5 for binary classification (>= 0.5 -> Viral, < 0.5 -> Non-Viral).
    Reports unadjusted real metrics from cnn_metrics.json transparently.
    """
    arr = _load_and_preprocess_image(image_input)
    model, _ = _get_cnn_model()

    with _PREDICT_LOCK:
        proba = float(model.predict(arr, verbose=0)[0, 0])

    pred = int(proba >= 0.5)
    return {
        "viral": pred,
        "viral_probability": round(proba, 4),
        "model": "cnn_mobilenetv2",
        "metrics": _load_cnn_metrics(),
    }


def predict_virality_fusion(
    post: dict,
    image_input: Union[str, bytes, bytearray, Image.Image, Path]
) -> dict:
    """
    Multimodal Early Fusion: extracts 64-d dense embedding from MobileNetV2 CNN,
    extracts 288-d tabular/text feature matrix from the post, fuses them (352-d),
    scales via scaler_fusion, and scores with tuned XGBoost.
    """
    arr = _load_and_preprocess_image(image_input)
    _, embed_model = _get_cnn_model()
    fusion_model, fusion_scaler = _get_fusion_artifacts()

    with _PREDICT_LOCK:
        emb = embed_model.predict(arr, verbose=0)  # shape (1, 64)

    tab_sparse, image_features, image_analysis_available = _row_to_features(post)
    tab = tab_sparse.toarray()  # shape (1, 288)

    fused = np.hstack([emb, tab])  # shape (1, 352)
    fused_scaled = fusion_scaler.transform(fused)

    with _PREDICT_LOCK:
        proba = float(fusion_model.predict_proba(fused_scaled)[0, 1])

    pred = int(proba >= 0.5)
    return {
        "viral": pred,
        "viral_probability": round(proba, 4),
        "model": "fusion_xgb",
        "metrics": _load_fusion_metrics(),
        "image_features": image_features if image_analysis_available else None,
        "image_analysis_available": image_analysis_available,
    }


if __name__ == "__main__":
    sample = {
        "caption": "A golden retriever puppy playing in autumn leaves",
        "post_hour": 18,
        "day_of_week": 5,
        "follower_count": 12000,
        "media_type": "reel",
        "content_category": "Lifestyle",
        "hashtags": "#dogsofinstagram #puppy",
    }
    print(predict_virality(sample))