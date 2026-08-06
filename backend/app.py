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

recommendation_engine = RecommendationEngine(dataset_path=str(BASE_DIR / "data" / "posts_cleaned.csv"))

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
class PredictionRequest(BaseModel):
    caption: str
    post_hour: int
    day_of_week: int
    follower_count: int
    early_likes: int
    early_shares: int
    early_comments: int
    saves: int
    reach: int
    impressions: int
    media_type: str
    content_category: str
    platform: str = "Instagram"
    model: str = "ensemble"


# -------------------------------
# Home API
# -------------------------------
@app.get("/")
def home():
    return {
        "message": "Virality Prediction Backend Running Successfully"
    }


# -------------------------------
# Prediction API
# -------------------------------
@app.post("/api/predict")
def predict(data: PredictionRequest):
    try:
        post_payload = {
            "caption": data.caption,
            "post_hour": data.post_hour,
            "day_of_week": data.day_of_week,
            "follower_count": data.follower_count,
            "early_likes": data.early_likes,
            "early_shares": data.early_shares,
            "early_comments": data.early_comments,
            "saves": data.saves,
            "reach": data.reach,
            "impressions": data.impressions,
            "media_type": data.media_type,
            "content_category": data.content_category,
            "platform": data.platform,
        }
        result = predict_virality(post_payload, model=data.model)
        recommendation_report = recommendation_engine.generate_report(post_payload, result)

        return {
            "success": True,
            "prediction": result,
            "recommendation_report": recommendation_report,
            "recommendations": recommendation_report.get("priority_actions", []),
            "explainable_ai": recommendation_report.get("explainability", {})
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))