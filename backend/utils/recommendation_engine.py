# backend/utils/recommendation_engine.py

from typing import Dict, List, Any, Optional
import re

# ====================== HASHTAG LIBRARY ======================
HASHTAG_LIBRARY = {
    "professional": [
        "#ProfessionalGrowth", "#CareerGrowth", "#SuccessMindset",
        "#Leadership", "#BusinessLife", "#CorporateLife",
        "#WorkHard", "#Motivation", "#Entrepreneur", "#LinkedInTips"
    ],
    "lifestyle": [
        "#Lifestyle", "#DailyLife", "#SelfCare", "#Inspiration",
        "#Mindset", "#PositiveVibes", "#GoodVibes", "#LifeGoals"
    ],
    "fitness": [
        "#FitnessMotivation", "#GymLife", "#Workout", "#HealthyLifestyle",
        "#FitFam", "#NoDaysOff", "#TrainHard", "#FitnessJourney"
    ],
    "travel": [
        "#TravelGram", "#Wanderlust", "#Explore", "#TravelDiaries",
        "#Adventure", "#TravelPhotography", "#InstaTravel"
    ],
    "food": [
        "#Foodie", "#FoodPhotography", "#Yummy", "#FoodLover",
        "#InstaFood", "#Delicious", "#HomeCooking"
    ],
    "default": [
        "#Inspiration", "#Motivation", "#DailyLife", "#Growth",
        "#Mindset", "#Success", "#PositiveVibes"
    ]
}

OPTIMAL_POSTING_TIMES = {
    "instagram": {
        "best_window": "6:00 PM – 9:00 PM",
        "reason": "Most people in professional and lifestyle niches are active after work.",
        "expected_boost": "+15–18%"
    },
    "linkedin": {
        "best_window": "8:00 AM – 10:00 AM",
        "reason": "Professionals usually check LinkedIn in the morning.",
        "expected_boost": "+20%"
    },
    "twitter": {
        "best_window": "12:00 PM – 3:00 PM",
        "reason": "Midday is the peak scrolling window on Twitter/X.",
        "expected_boost": "+12%"
    },
    "default": {
        "best_window": "6:00 PM – 9:00 PM",
        "reason": "Evening hours give the highest engagement for most platforms.",
        "expected_boost": "+15%"
    }
}


class RecommendationEngine:
    """Compatibility wrapper for the backend API and tests."""

    def __init__(self, dataset_path: Optional[str] = None) -> None:
        self.dataset_path = dataset_path

    def generate_report(self, post_payload: Dict[str, Any], prediction: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        caption = str(post_payload.get("caption") or "")
        platform = str(post_payload.get("platform") or "Instagram")
        current_hashtags = post_payload.get("hashtags") or []
        if not isinstance(current_hashtags, list):
            current_hashtags = []

        post_time = post_payload.get("post_time") or post_payload.get("post_hour") or "8:13"
        if isinstance(post_time, int):
            post_time = f"{post_time}:00"

        likes = int(post_payload.get("early_likes") or 0)
        comments = int(post_payload.get("early_comments") or 0)
        shares = int(post_payload.get("early_shares") or 0)
        saves = int(post_payload.get("saves") or 0)

        virality_score = 46.0
        if prediction:
            virality_value = prediction.get("viral_probability", prediction.get("virality", prediction.get("score", 46.0)))
            if isinstance(virality_value, (int, float)):
                virality_score = float(virality_value) * 100 if 0.0 <= float(virality_value) <= 1.0 else float(virality_value)

        content_score = prediction.get("content_score", 37.3) if prediction else 37.3
        image_analysis = post_payload.get("image_analysis")

        report = build_full_recommendation(
            caption=caption,
            platform=platform,
            current_hashtags=current_hashtags,
            post_time=str(post_time),
            likes=likes,
            comments=comments,
            shares=shares,
            saves=saves,
            virality_score=virality_score,
            content_score=float(content_score or 37.3),
            image_analysis=image_analysis,
        )

        report["priority_actions"] = report.get("final_action_plan", {}).get("today", [])
        report["hashtag_analysis"] = report["suggested_hashtags"]
        report["action_plan"] = report.get("final_action_plan", {}).get("today", [])
        report["top_factors"] = report["explainable_ai"]
        report["explainability"] = {
            "top_factors": report["explainable_ai"],
            "action_plan": report.get("final_action_plan", {}).get("today", []),
            "hashtag_analysis": report["suggested_hashtags"],
        }
        return report


def detect_content_category(caption: str, keywords: List[str] = None) -> str:
    text = (caption or "").lower()
    if keywords:
        text += " " + " ".join(k.lower() for k in keywords)

    if any(w in text for w in ["professional", "career", "business", "corporate", "suit", "office", "leadership", "attire", "work"]):
        return "professional"
    if any(w in text for w in ["gym", "workout", "fitness", "train", "muscle", "exercise"]):
        return "fitness"
    if any(w in text for w in ["travel", "trip", "vacation", "explore", "destination", "flight"]):
        return "travel"
    if any(w in text for w in ["food", "recipe", "delicious", "cook", "restaurant", "meal"]):
        return "food"
    if any(w in text for w in ["lifestyle", "selfcare", "mindset", "daily", "routine"]):
        return "lifestyle"
    return "default"


def analyze_caption(caption: str) -> Dict[str, Any]:
    caption = caption or ""
    words = caption.split()
    word_count = len(words)
    char_count = len(caption)

    has_question = "?" in caption
    has_cta = any(phrase in caption.lower() for phrase in [
        "tag", "comment", "share", "what do you think", "drop", "let me know",
        "tell me", "your thoughts", "👇", "link in bio", "save this"
    ])
    has_emoji = bool(re.search(r'[\U0001F300-\U0001F9FF]', caption))
    has_story = word_count > 20 and any(w in caption.lower() for w in ["i", "my", "me", "today", "learned", "realized"])

    problems = []
    if word_count < 12:
        problems.append(f"Caption is very short ({word_count} words). Longer captions with context perform better.")
    elif word_count < 18:
        problems.append(f"Caption is a bit short ({word_count} words). Adding a bit more context helps.")

    if not has_question:
        problems.append("No question asked — questions are one of the best ways to get comments.")
    if not has_cta:
        problems.append("No clear call-to-action (no invitation to tag, comment, or share).")
    if not has_emoji:
        problems.append("No emojis used. 1–2 relevant emojis can make the caption feel more human.")
    if not has_story and word_count < 25:
        problems.append("Caption mostly describes the photo instead of telling a short personal story.")

    score = 100
    if word_count < 12: score -= 30
    elif word_count < 18: score -= 15
    if not has_question: score -= 18
    if not has_cta: score -= 15
    if not has_emoji: score -= 8
    if not has_story: score -= 10
    score = max(25, score)

    return {
        "current_caption": caption,
        "word_count": word_count,
        "char_count": char_count,
        "recommended_length": "18–30 words",
        "current_score": score,
        "problems": problems,
        "has_cta": has_cta,
        "has_emoji": has_emoji,
        "has_question": has_question,
        "has_story": has_story,
        "expected_improvement": "+15% to +20%"
    }


def generate_ai_caption(caption: str, category: str, problems: List[str]) -> Dict[str, Any]:
    """Generate a better caption based on the actual problems found."""
    base = caption.strip()
    if not base:
        base = "Ready for the next chapter."

    # Start with the original idea and improve it
    if category == "professional":
        improved = (
            f"{base}\n\n"
            "Professional growth isn’t about looking perfect — it’s about showing up consistently.\n\n"
            "What’s one lesson that helped you grow in your career?\n\n"
            "Tag someone who’s building something meaningful. 💼"
        )
    elif category == "fitness":
        improved = (
            f"{base}\n\n"
            "Progress is built one session at a time.\n\n"
            "What’s one habit you’re locking in this week?\n\n"
            "Tag your workout partner. 💪"
        )
    else:
        improved = (
            f"{base}\n\n"
            "Small moments create big feelings.\n\n"
            "What do you think?\n\n"
            "Tag someone who needs to see this. ✨"
        )

    return {
        "ai_suggested_caption": improved,
        "engagement_boost": "+17%",
        "comments_boost": "+15%"
    }


def get_suggested_hashtags(category: str, current_hashtags: List[str] = None) -> Dict[str, Any]:
    library = HASHTAG_LIBRARY.get(category, HASHTAG_LIBRARY["default"])
    current = [h if h.startswith("#") else f"#{h}" for h in (current_hashtags or [])]
    recommended = [tag for tag in library if tag not in current][:6]

    reason = f"These hashtags match the {category} theme of your post and will help the right people find it."
    if len(current) == 0:
        reason = "You currently have no hashtags. Adding 5–6 relevant ones will significantly improve discoverability."
    elif len(current) < 4:
        reason = f"You only used {len(current)} hashtag(s). Adding a few more relevant ones will help reach."

    return {
        "current": current,
        "recommended": recommended,
        "reason": reason,
        "expected_boost": "+15% to +20%"
    }


def analyze_posting_time(current_time: str, platform: str = "instagram") -> Dict[str, Any]:
    platform = (platform or "instagram").lower()
    optimal = OPTIMAL_POSTING_TIMES.get(platform, OPTIMAL_POSTING_TIMES["default"])

    performance = "Below Average"
    hour_str = (current_time or "").split(":")[0] if current_time else ""
    try:
        hour = int(hour_str)
        if 18 <= hour <= 21:
            performance = "Good"
        elif 8 <= hour <= 10:
            performance = "Average"
    except:
        pass

    return {
        "current_time": current_time or "Not specified",
        "performance": performance,
        "recommended_window": optimal["best_window"],
        "reason": optimal["reason"],
        "expected_boost": optimal["expected_boost"]
    }


def analyze_engagement(likes: int, comments: int, shares: int, saves: int) -> Dict[str, Any]:
    def status(val, low, mid):
        if val <= low: return "Very Low"
        if val <= mid: return "Low"
        return "Okay"

    return {
        "likes": {
            "value": likes,
            "status": status(likes, 50, 150),
            "note": f"You currently have {likes} likes. Early likes are extremely important for reach."
        },
        "comments": {
            "value": comments,
            "status": status(comments, 5, 15),
            "note": f"{comments} comments so far. A good question usually increases this number."
        },
        "shares": {
            "value": shares,
            "status": "Very Low" if shares == 0 else "Low",
            "note": "No shares yet. Content that feels useful or emotional gets shared more."
        },
        "saves": {
            "value": saves,
            "status": "Very Low" if saves == 0 else "Low",
            "note": "No saves yet. People save posts that contain tips, quotes, or useful information."
        },
        "recommended_actions": [
            "Share the post to your Instagram Story immediately after publishing",
            "Send it to your Close Friends list",
            "Reply to every comment in the first hour",
            "Pin a thoughtful question as your first comment",
            "Ask a clear question in the caption itself",
            "Make the post feel useful or emotionally resonant so people want to share it",
            "Add something people would want to save (a tip, quote, or checklist)"
        ],
        "expected_improvement": "+18% to +25%"
    }


def generate_ai_reasoning(
    caption: str,
    category: str,
    virality_score: float,
    content_score: float,
    hashtag_count: int,
    posting_time: Dict,
    platform: str,
    caption_analysis: Dict
) -> str:
    parts = []

    # Opening based on category
    if category == "professional":
        parts.append("Your image gives a clean, professional first impression — that is a real strength for career and business content.")
    else:
        parts.append("Your post has a clear visual focus.")

    # Caption feedback
    if caption_analysis["word_count"] < 15:
        parts.append(f"The caption is quite short ({caption_analysis['word_count']} words) and mostly describes what is in the photo.")
    if not caption_analysis["has_question"]:
        parts.append("There is no question, so people have less reason to leave a comment.")
    if not caption_analysis["has_cta"]:
        parts.append("There is also no clear invitation to engage (tag, share, or reply).")

    # Hashtags
    if hashtag_count == 0:
        parts.append("You have not added any hashtags yet.")
    elif hashtag_count < 4:
        parts.append(f"You only used {hashtag_count} hashtag(s), which limits how many new people can discover the post.")

    # Timing
    if posting_time["performance"] in ["Below Average", "Very Low"]:
        parts.append(
            f"Posting at {posting_time['current_time']} is not the strongest window for {platform}. "
            f"The better window is usually {posting_time['recommended_window']}."
        )

    # Closing recommendation
    parts.append(
        f"If you rewrite the caption to include a short personal line + a question + a clear call-to-action, "
        f"add 5–6 relevant hashtags, and post in the recommended time window, "
        f"the predicted virality can realistically move from {virality_score:.0f}% toward 55–60%, "
        f"and the overall content score from {content_score:.0f} into the mid-50s."
    )

    return " ".join(parts)


def generate_top_improvements(
    caption_analysis: Dict,
    hashtag_analysis: Dict,
    posting_time: Dict,
    category: str
) -> List[Dict[str, Any]]:
    improvements = []

    # 1. Caption
    improvements.append({
        "rank": 1,
        "title": "Rewrite the Caption",
        "why": "Your current caption does not invite interaction. Adding a short story + question + CTA is the highest-leverage change.",
        "how": "Use the improved caption generated in the Caption Analysis section, or write your own version with a question.",
        "impact": "+15% to +20%",
        "difficulty": "Easy",
        "time_required": "2–3 minutes",
        "stars": 5
    })

    # 2. Early engagement
    improvements.append({
        "rank": 2,
        "title": "Push Early Engagement",
        "why": "The first 45–60 minutes decide how far Instagram will push the post.",
        "how": "Share to Story → Send to Close Friends → Reply to every comment quickly → Pin a question.",
        "impact": "+10% to +15%",
        "difficulty": "Easy",
        "time_required": "First hour after posting",
        "stars": 5
    })

    # 3. Hashtags
    improvements.append({
        "rank": 3,
        "title": "Add Relevant Hashtags",
        "why": f"Your post fits the {category} category. Matching hashtags help the right audience find it.",
        "how": f"Add these: {', '.join(hashtag_analysis['recommended'][:5])}",
        "impact": "+12% to +18%",
        "difficulty": "Easy",
        "time_required": "1 minute",
        "stars": 5
    })

    # 4. Timing
    if posting_time["performance"] != "Good":
        improvements.append({
            "rank": 4,
            "title": "Post at a Better Time",
            "why": posting_time["reason"],
            "how": f"Schedule or post between {posting_time['recommended_window']}.",
            "impact": posting_time["expected_boost"],
            "difficulty": "Easy",
            "time_required": "Just choose a different time",
            "stars": 4
        })

    # 5. Format
    improvements.append({
        "rank": 5,
        "title": "Consider a Different Format",
        "why": "Static images currently receive less algorithmic distribution than Reels or carousels.",
        "how": "If the content allows, turn it into a short Reel or a simple 2–3 slide carousel.",
        "impact": "+15% to +25%",
        "difficulty": "Medium",
        "time_required": "Depends on the content",
        "stars": 4
    })

    return improvements


def generate_final_action_plan(
    hashtag_analysis: Dict,
    posting_time: Dict,
    virality: float
) -> Dict[str, Any]:
    return {
        "today": [
            "Rewrite the caption (add a short personal line + a question + a clear CTA)",
            f"Add these hashtags: {', '.join(hashtag_analysis['recommended'][:5])}",
            f"Post between {posting_time['recommended_window']}",
            "Share to your Story immediately after publishing",
            "Reply to every comment in the first hour"
        ],
        "expected_results": {
            "engagement": "+15% to +22%",
            "reach": "+12% to +20%",
            "comments": "+15% to +25%",
            "shares": "+10%+",
            "virality_from": f"{virality:.0f}%",
            "virality_to": "55–60%"
        }
    }


def generate_explainable_ai() -> List[Dict[str, Any]]:
    return [
        {"name": "Early Likes & Comments", "influence": 35, "description": "Strong activity in the first hour is the biggest signal for further distribution."},
        {"name": "Saves", "influence": 20, "description": "Saves tell the algorithm the content has lasting value."},
        {"name": "Caption Quality", "influence": 18, "description": "Captions that ask questions and invite replies increase comments and watch time."},
        {"name": "Posting Time", "influence": 12, "description": "Posting when your audience is active gives a stronger initial push."},
        {"name": "Hashtags", "influence": 8, "description": "Relevant hashtags help new people discover the post."},
        {"name": "Media Format", "influence": 7, "description": "Reels and carousels currently get more distribution than static images."}
    ]


def build_full_recommendation(
    caption: str,
    platform: str = "instagram",
    current_hashtags: List[str] = None,
    post_time: str = "8:13",
    likes: int = 56,
    comments: int = 5,
    shares: int = 0,
    saves: int = 0,
    virality_score: float = 46.0,
    content_score: float = 37.3,
    image_analysis: Optional[Dict] = None
) -> Dict[str, Any]:

    current_hashtags = current_hashtags or []
    category = detect_content_category(caption, current_hashtags)
    caption_analysis = analyze_caption(caption)
    ai_caption = generate_ai_caption(caption, category, caption_analysis["problems"])
    hashtag_analysis = get_suggested_hashtags(category, current_hashtags)
    posting_time = analyze_posting_time(post_time, platform)
    engagement = analyze_engagement(likes, comments, shares, saves)

    ai_reasoning = generate_ai_reasoning(
        caption=caption,
        category=category,
        virality_score=virality_score,
        content_score=content_score,
        hashtag_count=len(current_hashtags),
        posting_time=posting_time,
        platform=platform,
        caption_analysis=caption_analysis
    )

    top_improvements = generate_top_improvements(
        caption_analysis, hashtag_analysis, posting_time, category
    )

    action_plan = generate_final_action_plan(
        hashtag_analysis, posting_time, virality_score
    )

    # Dynamic strengths
    strengths = []
    if category == "professional":
        strengths.append("Clean professional visual that builds trust")
    if caption_analysis["word_count"] >= 10:
        strengths.append("Caption is on-topic and readable")
    if any(w in (caption or "").lower() for w in ["ready", "professional", "growth", "career"]):
        strengths.append("Positive and forward-looking tone")
    if not strengths:
        strengths.append("Clear subject in the image")

    # Dynamic weaknesses (built only from actual problems)
    weaknesses = list(caption_analysis["problems"])
    if len(current_hashtags) < 4:
        weaknesses.append(f"Only {len(current_hashtags)} hashtag(s) used")
    if posting_time["performance"] != "Good":
        weaknesses.append(f"Posting time ({post_time}) is not ideal for {platform}")
    if likes < 80:
        weaknesses.append(f"Only {likes} likes so far — early engagement needs help")
    if comments < 8:
        weaknesses.append(f"Only {comments} comments — a question would help")
    if shares == 0:
        weaknesses.append("No shares yet")
    if saves == 0:
        weaknesses.append("No saves yet")
    weaknesses.append("Static image format receives less distribution than Reels or carousels")

    return {
        "category": category,
        "ai_reasoning": ai_reasoning,
        "caption_analysis": {
            **caption_analysis,
            **ai_caption
        },
        "suggested_hashtags": hashtag_analysis,
        "posting_time": posting_time,
        "engagement_analysis": engagement,
        "image_analysis": image_analysis or {
            "brightness": "N/A",
            "contrast": "N/A",
            "sharpness": "N/A",
            "faces": "No image provided",
            "composition": "Unknown",
            "color_harmony": "N/A",
            "suggestions": ["Upload an image for detailed visual analysis"],
            "expected_improvement": "+0%"
        },
        "top_improvements": top_improvements,
        "ai_content_coach": {
            "current_virality": f"{virality_score:.0f}%",
            "projected_virality": "55–60%",
            "message": ai_reasoning
        },
        "explainable_ai": generate_explainable_ai(),
        "final_action_plan": action_plan,
        "strengths": strengths,
        "weaknesses": weaknesses
    }