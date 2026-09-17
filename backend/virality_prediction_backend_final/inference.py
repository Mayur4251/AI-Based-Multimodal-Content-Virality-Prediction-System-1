"""
Backend inference module (v2) — SAME public API as before:
    from inference import predict_virality
    predict_virality({...})  -> {"viral": 0/1, "viral_probability": float, "model": name}

Internally now uses the improved pipeline: engineered features (cyclical time,
engagement ratios, log-scaled counts), variance-filtered feature set, and the
best CV-tuned model (model_final.joblib -> XGBoost, test F1 0.878).
"""
import os, json
import numpy as np
import pandas as pd
import joblib
from scipy import sparse
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

_DIR = os.path.dirname(os.path.abspath(__file__))

_model = joblib.load(os.path.join(_DIR, "model_final.joblib"))  # RF+SVM+XGBoost soft-voting ensemble (report spec)
_tfidf = joblib.load(os.path.join(_DIR, "vectorizer_tfidf.joblib"))
_scaler = joblib.load(os.path.join(_DIR, "scaler_metadata.joblib"))
_ohe = joblib.load(os.path.join(_DIR, "encoder_categorical.joblib"))
_vt = joblib.load(os.path.join(_DIR, "variance_filter.joblib"))

with open(os.path.join(_DIR, "schema.json")) as f:
    _SCHEMA = json.load(f)

_META_NUMERIC = _SCHEMA["metadata_numeric_columns"]
_CAT_COLS = _SCHEMA["categorical_columns"]
_BEST_MODEL_NAME = _SCHEMA.get("best_model", "final")

_sia = SentimentIntensityAnalyzer()


def _row_to_features(post: dict) -> sparse.csr_matrix:
    caption = str(post.get("caption", "")).strip()
    tfidf_vec = _tfidf.transform([caption])

    post_hour = post.get("post_hour", 0)
    day_of_week = post.get("day_of_week", 0)
    follower_count = post.get("follower_count", 0)
    early_likes = post.get("early_likes", 0)
    early_shares = post.get("early_shares", 0)
    early_comments = post.get("early_comments", 0)
    saves = post.get("saves", 0)
    reach = post.get("reach", 0)
    impressions = post.get("impressions", 0)

    total_eng = early_likes + early_shares + early_comments + saves
    row = {
        "post_hour": post_hour, "day_of_week": day_of_week,
        "follower_count": follower_count, "early_likes": early_likes,
        "early_shares": early_shares, "early_comments": early_comments,
        "saves": saves, "reach": reach, "impressions": impressions,
        "caption_len": len(caption), "caption_word_count": len(caption.split()),
        "hour_sin": np.sin(2*np.pi*post_hour/24), "hour_cos": np.cos(2*np.pi*post_hour/24),
        "dow_sin": np.sin(2*np.pi*day_of_week/7), "dow_cos": np.cos(2*np.pi*day_of_week/7),
        "total_early_engagement": total_eng,
        "engagement_per_follower": total_eng / (follower_count + 1),
        "likes_share_of_engagement": early_likes / (total_eng + 1),
        "shares_per_reach": early_shares / (reach + 1),
        "log_follower_count": np.log1p(follower_count),
        "log_reach": np.log1p(reach),
    }
    sentiment = _sia.polarity_scores(caption)
    row.update({f"sent_{k}": v for k, v in sentiment.items()})

    meta_df = pd.DataFrame([row])[_META_NUMERIC]
    meta_scaled = _scaler.transform(meta_df)

    cat_df = pd.DataFrame([{
        "media_type": post.get("media_type", "image"),
        "content_category": post.get("content_category", "Lifestyle"),
    }])[_CAT_COLS]
    cat_matrix = _ohe.transform(cat_df)

    fused = sparse.hstack([tfidf_vec, sparse.csr_matrix(meta_scaled), cat_matrix]).tocsr()
    return _vt.transform(fused)


_FEATURE_NAMES = json.load(open(os.path.join(_DIR, "feature_names.json")))
_shap_explainer = None  # lazy: TreeExplainer on the XGBoost sub-model of the ensemble


def _get_shap_explainer():
    global _shap_explainer
    if _shap_explainer is None:
        import shap
        xgb_sub = _model.named_estimators_["xgb"]
        _shap_explainer = shap.TreeExplainer(xgb_sub)
    return _shap_explainer


def _xai_insights(X, top_k=5) -> list:
    """Report's 'Explainable AI (XAI) Insights' deliverable: which features
    contributed most to this specific prediction. Computed via SHAP on the
    XGBoost component of the RF+SVM+XGBoost ensemble (the ensemble's
    strongest individual model); an approximation of the full ensemble's
    reasoning, not an exact decomposition of all three models jointly."""
    explainer = _get_shap_explainer()
    sv = explainer.shap_values(X)
    row = sv[0] if sv.ndim == 2 else sv
    idx = np.argsort(np.abs(row))[::-1][:top_k]
    return [{"feature": _FEATURE_NAMES[i], "impact": round(float(row[i]), 4)} for i in idx]


def predict_virality(post: dict, model: str = "ensemble") -> dict:
    """`model` kept for backward compatibility with the old API. Deployed
    model is a soft-voting ensemble of Random Forest + SVM + XGBoost,
    matching the report's specified architecture (test F1 0.881, acc 93.9%).
    Returns xai_insights per the report's XAI output deliverable."""
    X = _row_to_features(post)
    proba = float(_model.predict_proba(X)[0, 1])
    pred = int(proba >= 0.5)
    return {
        "viral": pred,
        "viral_probability": round(proba, 4),
        "model": _BEST_MODEL_NAME,
        "xai_insights": _xai_insights(X),
    }


def predict_batch(posts: list, model: str = "ensemble") -> list:
    return [predict_virality(p, model=model) for p in posts]


# --------------------------------------------------------------------------
# CNN image-based prediction (added; does not alter tabular pipeline above)
# --------------------------------------------------------------------------
_CNN_IMG_SIZE = 160
_cnn_model = None  # lazy-loaded so text-only backend usage isn't slowed by TF import


def _get_cnn_model():
    global _cnn_model
    if _cnn_model is None:
        import tensorflow as tf
        globals()["tf"] = tf
        _cnn_model = tf.keras.models.load_model(os.path.join(_DIR, "model_cnn_mobilenetv2.keras"))
    return _cnn_model


def predict_virality_from_image(image_path: str) -> dict:
    """CNN (MobileNetV2 transfer learning) prediction from a post image alone.
    NOTE: on the held-out test set this CNN scores accuracy 0.46 / ROC-AUC 0.44,
    BELOW the 0.76 majority-class baseline -- see cnn_metrics.json. Image content
    in this dataset shows little real correlation with the viral label. Kept
    available for completeness/reporting, but the tabular model (predict_virality)
    remains the recommended predictor."""
    from tensorflow.keras.preprocessing.image import load_img, img_to_array
    import numpy as np
    model = _get_cnn_model()
    img = load_img(image_path, target_size=(_CNN_IMG_SIZE, _CNN_IMG_SIZE))
    arr = np.expand_dims(img_to_array(img), axis=0)
    proba = float(model.predict(arr, verbose=0)[0, 0])
    return {"viral": int(proba >= 0.5), "viral_probability": round(proba, 4), "model": "cnn_mobilenetv2"}


_fusion_model = None
_fusion_scaler = None


def _get_fusion_artifacts():
    global _fusion_model, _fusion_scaler
    if _fusion_model is None:
        _fusion_model = joblib.load(os.path.join(_DIR, "model_fusion.joblib"))
        _fusion_scaler = joblib.load(os.path.join(_DIR, "scaler_fusion.joblib"))
    return _fusion_model, _fusion_scaler


def predict_virality_fusion(post: dict, image_path: str) -> dict:
    """Leakage-free fusion: CNN embedding (64-d) + existing TF-IDF/tabular
    features (288-d) -> scaler -> tuned XGBoost. Test metrics: accuracy 0.86,
    precision 0.679, recall 0.792, F1 0.731, ROC-AUC 0.904 (n=100 held-out)."""
    from tensorflow.keras.preprocessing.image import load_img, img_to_array
    model, scaler = _get_fusion_artifacts()
    cnn = _get_cnn_model()
    embed_model = tf.keras.Model(inputs=cnn.input, outputs=cnn.get_layer("dense").output)

    img = load_img(image_path, target_size=(_CNN_IMG_SIZE, _CNN_IMG_SIZE))
    arr = np.expand_dims(img_to_array(img), axis=0)
    emb = embed_model.predict(arr, verbose=0)  # (1, 64)
    if emb.shape[1] != 64:
        raise ValueError(f"CNN embedding mismatch: expected 64 features, got {emb.shape[1]}")

    tab = _row_to_features(post).toarray()  # (1, 288), same pipeline as predict_virality
    if tab.shape[1] != 288:
        raise ValueError(f"Tabular feature mismatch: expected 288 features, got {tab.shape[1]}")

    fused = np.hstack([emb, tab])
    if fused.shape[1] != 352:
        raise ValueError(f"Fusion vector mismatch: expected 352 features, got {fused.shape[1]}")

    fused_scaled = scaler.transform(fused)
    proba = float(model.predict_proba(fused_scaled)[0, 1])
    return {"viral": int(proba >= 0.5), "viral_probability": round(proba, 4), "model": "fusion_xgb"}


if __name__ == "__main__":
    sample = {
        "caption": "A golden retriever puppy playing in autumn leaves",
        "post_hour": 18, "day_of_week": 5, "follower_count": 12000,
        "early_likes": 300, "early_shares": 20, "early_comments": 15, "saves": 40,
        "reach": 8000, "impressions": 11000, "media_type": "reel", "content_category": "Lifestyle",
    }
    print(predict_virality(sample))
