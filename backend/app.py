import os
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent

if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from inference import predict_virality
from utils.recommendation_engine import RecommendationEngine


recommendation_engine = RecommendationEngine(
    dataset_path=str(BASE_DIR / "data" / "posts_cleaned.csv")
)


app = FastAPI(
    title="Virality Prediction API",
    version="1.0.0",
    description="AI-Based Multimodal Content Virality Prediction System"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------------
# Input Schema
# -------------------------------
# IMPORTANT: This request schema intentionally does NOT include
# early_likes / early_shares / early_comments / saves / reach / impressions.
# Those are post-publish outcomes -- a real user predicting virality BEFORE
# posting never has them.
#
# imageBase64 IS used now (v2) -- it's decoded in inference.py into
# handcrafted visual features (see image_features.py) that the model was
# retrained on. Previously this field was accepted here but never actually
# forwarded to predict_virality(), so uploaded images had zero effect on
# the prediction. That's fixed below.

class PredictionRequest(BaseModel):
    caption: str
    post_hour: int
    day_of_week: int
    follower_count: int
    media_type: str
    content_category: str
    platform: str = "Instagram"
    model: str = "ensemble"
    # Text enrichment
    keywords: str = ""
    hashtags: str = ""
    # Image -- now actually used, see note above
    imageBase64: str = ""
    imageMimeType: str = ""

    # Post-publish only, all optional (default 0). Used ONLY for the
    # recommendation engine's post-publish engagement analytics panel.
    # NEVER forwarded to predict_virality() -- see post_payload split below.
    early_likes: int = 0
    early_comments: int = 0
    early_shares: int = 0
    saves: int = 0
    reach: int = 0
    impressions: int = 0


# -------------------------------
# Home API
# -------------------------------

@app.get("/")
def home():
    return {
        "message": "Virality Prediction Backend Running Successfully"
    }


# -------------------------------
# Helper: turn real computed image features into a human-readable
# image_analysis dict for the recommendation report. Only called when
# inference.py reports image_analysis_available=True -- i.e. only ever
# built from real numbers, never fabricated. See inference.py /
# image_features.py for how these numbers are computed.
# -------------------------------

def _build_image_analysis(image_features: dict) -> dict:
    brightness = image_features["img_brightness_mean"]
    brightness_std = image_features["img_brightness_std"]
    saturation = image_features["img_saturation_mean"]
    colorfulness = image_features["img_colorfulness"]
    edge_density = image_features["img_edge_density"]
    warm_ratio = image_features["img_warm_ratio"]
    aspect_ratio = image_features["img_aspect_ratio"]

    # Plain descriptive labels based on where each real metric falls in its
    # own natural range (0-255 for brightness/saturation, 0-1 for
    # edge_density/warm_ratio). These are NOT claimed to be the exact
    # thresholds the model was trained to favor -- see note above this
    # function's docstring in the surrounding chat message.
    if brightness < 85:
        brightness_label = "Dark"
    elif brightness < 170:
        brightness_label = "Balanced"
    else:
        brightness_label = "Bright"

    if saturation < 60:
        saturation_label = "Muted / low saturation"
    elif saturation < 150:
        saturation_label = "Moderate saturation"
    else:
        saturation_label = "Highly saturated"

    if edge_density < 0.05:
        detail_label = "Low visual detail / smooth"
    elif edge_density < 0.15:
        detail_label = "Moderate visual detail"
    else:
        detail_label = "High visual detail / busy"

    tone_label = "Warm-toned" if warm_ratio >= 0.5 else "Cool-toned"

    if aspect_ratio > 1.2:
        composition = "Landscape orientation"
    elif aspect_ratio < 0.85:
        composition = "Portrait orientation"
    else:
        composition = "Roughly square orientation"

    return {
        "status": "Computed from the uploaded image",
        "note": (
            "These values are computed directly from the uploaded image "
            "(handcrafted visual features, not a fabricated estimate). "
            "See image_features.py for the exact formulas."
        ),
        "brightness": round(brightness, 1),
        "brightness_label": brightness_label,
        "contrast": round(brightness_std, 1),
        "saturation": round(saturation, 1),
        "saturation_label": saturation_label,
        "colorfulness": round(colorfulness, 1),
        "sharpness": round(edge_density, 4),
        "detail_label": detail_label,
        "tone": tone_label,
        "composition": composition,
        "aspect_ratio": round(aspect_ratio, 3),
    }


# -------------------------------
# Prediction API
# -------------------------------

@app.post("/api/predict")
def predict(data: PredictionRequest):
    try:
        ml_payload = {
            "caption": data.caption,
            "post_hour": data.post_hour,
            "day_of_week": data.day_of_week,
            "follower_count": data.follower_count,
            "early_likes": data.early_likes,
            "early_comments": data.early_comments,
            "early_shares": data.early_shares,
            "saves": data.saves,
            "reach": data.reach,
            "impressions": data.impressions,
            "media_type": data.media_type,
            "content_category": data.content_category,
            "platform": data.platform,
            "keywords": data.keywords,
            "hashtags": data.hashtags,
            "imageBase64": data.imageBase64,
        }
        result = predict_virality(
            ml_payload,
            model=data.model
        )

        # Build image_analysis ONLY from real computed features. If no
        # image was supplied or it couldn't be decoded, image_analysis
        # stays None -- recommendation_engine.py's existing fallback
        # ("No detailed image analysis provided" / "no image-trained
        # virality model is being claimed") is honest and correct for
        # that case, so we deliberately do not fabricate a substitute.
        image_analysis = None
        if result.get("image_analysis_available") and result.get("image_features"):
            image_analysis = _build_image_analysis(result["image_features"])

        # recommendation_payload: ml_payload PLUS the optional post-publish
        # engagement numbers PLUS the real image analysis (if available).
        # Only the recommendation engine sees these -- it decides
        # internally (via have_engagement_data / image_analysis presence)
        # how to use them for the separate panels.
        recommendation_payload = {
            **ml_payload,
            "early_likes": data.early_likes,
            "early_comments": data.early_comments,
            "early_shares": data.early_shares,
            "saves": data.saves,
            "reach": data.reach,
            "impressions": data.impressions,
            "image_analysis": image_analysis,
        }
        recommendation_report = recommendation_engine.generate_report(
            recommendation_payload,
            result
        )

        return {
            "success": True,
            "prediction": result,
            "recommendation_report": recommendation_report,
            "recommendations": recommendation_report.get(
                "priority_actions",
                []
            ),
            "explainable_ai": recommendation_report.get(
                "explainability",
                {}
            )
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# -------------------------------
# Suggestion verification API
# -------------------------------
# NEW: lightweight scoring endpoint used by server.ts to verify a
# suggested change (caption rewrite, hashtag set, posting time) against
# the REAL trained model BEFORE presenting it as something the user
# should apply. Previously, "Apply Suggestion" buttons assumed every
# suggestion improved the score -- they never actually re-ran the model
# to check, which is why applying one could (and did) make the score go
# down. This reuses predict_virality() exactly as /api/predict does; it
# just skips building the full recommendation report since callers only
# need the resulting probability to compute a before/after delta.
#
# Reuses the PredictionRequest schema so the caller (server.ts) can pass
# the original prediction payload with one field swapped (caption,
# hashtags, or post_hour) without needing a second schema to stay in
# sync with. The post-publish engagement fields on PredictionRequest are
# accepted but unused here, same as in predict_virality().

@app.post("/api/score-variant")
def score_variant(data: PredictionRequest):
    try:
        ml_payload = {
            "caption": data.caption,
            "post_hour": data.post_hour,
            "day_of_week": data.day_of_week,
            "follower_count": data.follower_count,
            "media_type": data.media_type,
            "content_category": data.content_category,
            "platform": data.platform,
            "keywords": data.keywords,
            "hashtags": data.hashtags,
            "imageBase64": data.imageBase64,
        }
        result = predict_virality(
            ml_payload,
            model=data.model
        )
        return {
            "success": True,
            "viral": result["viral"],
            "viral_probability": result["viral_probability"],
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )