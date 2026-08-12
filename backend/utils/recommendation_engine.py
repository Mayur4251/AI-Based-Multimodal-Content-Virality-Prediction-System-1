# backend/utils/recommendation_engine.py

from typing import Dict, List, Any, Optional
import re


# ============================================================
# WHAT CHANGED IN THIS FILE
# ============================================================
# The prediction request no longer includes early_likes / early_shares /
# early_comments / saves / reach / impressions, because those are
# POST-PUBLISH outcomes a user predicting virality BEFORE posting never
# has. The old version of this file pulled those fields via _safe_int(),
# which silently turned "missing" into 0 -- so every pre-publish report
# said things like "No shares were recorded" and "No saves were recorded"
# as if the post had already flopped, when really it just hadn't been
# published yet. That was actively misleading.
#
# Fix: engagement numbers are now OPTIONAL and default to None, not 0.
# analyze_engagement() / the "current post performance" section only runs
# when real engagement data is explicitly supplied (e.g. if you later add
# a "check how my published post is doing" endpoint that passes real
# numbers). For the pre-publish prediction flow, the report is built from
# caption quality, hashtags, category, and timing -- the signals a user
# actually controls before hitting "post" -- plus the ML model's
# probability output.


# ============================================================
# HASHTAG LIBRARY
# ============================================================

HASHTAG_LIBRARY = {
    "professional": [
        "#ProfessionalGrowth",
        "#CareerGrowth",
        "#SuccessMindset",
        "#Leadership",
        "#BusinessLife",
        "#CorporateLife",
        "#WorkHard",
        "#Motivation",
        "#Entrepreneur",
        "#LinkedInTips",
    ],
    "lifestyle": [
        "#Lifestyle",
        "#DailyLife",
        "#SelfCare",
        "#Inspiration",
        "#Mindset",
        "#PositiveVibes",
        "#GoodVibes",
        "#LifeGoals",
    ],
    "fitness": [
        "#FitnessMotivation",
        "#GymLife",
        "#Workout",
        "#HealthyLifestyle",
        "#FitFam",
        "#NoDaysOff",
        "#TrainHard",
        "#FitnessJourney",
    ],
    "travel": [
        "#TravelGram",
        "#Wanderlust",
        "#Explore",
        "#TravelDiaries",
        "#Adventure",
        "#TravelPhotography",
        "#InstaTravel",
    ],
    "food": [
        "#Foodie",
        "#FoodPhotography",
        "#Yummy",
        "#FoodLover",
        "#InstaFood",
        "#Delicious",
        "#HomeCooking",
    ],
    "default": [
        "#Inspiration",
        "#Motivation",
        "#DailyLife",
        "#Growth",
        "#Mindset",
        "#Success",
        "#PositiveVibes",
    ],
}


# ============================================================
# PLATFORM POSTING WINDOWS
# ============================================================

OPTIMAL_POSTING_TIMES = {
    "instagram": {
        "best_window": "6:00 PM – 9:00 PM",
        "hours": range(18, 22),
        "reason": "Evening is commonly a strong engagement period for Instagram audiences.",
    },
    "facebook": {
        "best_window": "6:00 PM – 9:00 PM",
        "hours": range(18, 22),
        "reason": "Evening activity can be strong when users have more time to browse and interact.",
    },
    "linkedin": {
        "best_window": "8:00 AM – 10:00 AM",
        "hours": range(8, 11),
        "reason": "Professional audiences are often active around the start of the working day.",
    },
    "twitter": {
        "best_window": "12:00 PM – 3:00 PM",
        "hours": range(12, 16),
        "reason": "Midday can be a useful engagement window for short-form updates.",
    },
    "x": {
        "best_window": "12:00 PM – 3:00 PM",
        "hours": range(12, 16),
        "reason": "Midday can be a useful engagement window for short-form updates.",
    },
    "default": {
        "best_window": "6:00 PM – 9:00 PM",
        "hours": range(18, 22),
        "reason": "Evening is used as a general starting point when platform-specific data is unavailable.",
    },
}


# ============================================================
# HELPERS
# ============================================================

def _safe_int(value: Any, default: int = 0) -> int:
    try:
        if value is None:
            return default

        if isinstance(value, bool):
            return int(value)

        return max(0, int(float(value)))
    except (TypeError, ValueError):
        return default


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default

        return float(value)
    except (TypeError, ValueError):
        return default


def _normalise_text_list(value: Any) -> List[str]:
    """
    Converts strings/lists into a clean list.

    Examples:

    "#fitness #gym"
        -> ["#fitness", "#gym"]

    "fitness, gym, workout"
        -> ["fitness", "gym", "workout"]

    ["#fitness", "#gym"]
        -> ["#fitness", "#gym"]
    """

    if value is None:
        return []

    if isinstance(value, list):
        raw_items = value

    elif isinstance(value, tuple):
        raw_items = list(value)

    elif isinstance(value, str):
        text = value.strip()

        if not text:
            return []

        # Handle hashtags such as:
        # "#fitness #gym #workout"
        hashtag_matches = re.findall(r"#[A-Za-z0-9_]+", text)

        if hashtag_matches:
            raw_items = hashtag_matches
        else:
            # Handle comma / newline / semicolon separated values
            raw_items = re.split(r"[,;\n]+", text)

            # If still one item containing spaces, treat words as
            # separate keywords only when it looks like a list.
            if len(raw_items) == 1 and " " in text:
                raw_items = text.split()

    else:
        return []

    cleaned = []

    for item in raw_items:
        item = str(item).strip()

        if not item:
            continue

        if item not in cleaned:
            cleaned.append(item)

    return cleaned


def _parse_hour(value: Any) -> Optional[int]:
    """
    Convert:
        18
        "18"
        "18:30"
        "6:30 PM"
        "6 PM"

    into an hour from 0–23.
    """

    if value is None:
        return None

    if isinstance(value, (int, float)):
        hour = int(value)
        return hour if 0 <= hour <= 23 else None

    text = str(value).strip().upper()

    if not text:
        return None

    # 18:30
    match = re.match(r"^(\d{1,2})(?::\d{1,2})?$", text)

    if match:
        hour = int(match.group(1))
        return hour if 0 <= hour <= 23 else None

    # 6 PM / 6:30 PM
    match = re.match(r"^(\d{1,2})(?::\d{1,2})?\s*(AM|PM)$", text)

    if match:
        hour = int(match.group(1))
        period = match.group(2)

        if hour < 1 or hour > 12:
            return None

        if period == "AM":
            return 0 if hour == 12 else hour

        return 12 if hour == 12 else hour + 12

    return None


# ============================================================
# CATEGORY DETECTION
# ============================================================

def detect_content_category(
    caption: str,
    keywords: Optional[List[str]] = None
) -> str:

    text = (caption or "").lower()

    if keywords:
        text += " " + " ".join(str(k).lower() for k in keywords)

    if any(
        word in text
        for word in [
            "professional",
            "career",
            "business",
            "corporate",
            "suit",
            "office",
            "leadership",
            "attire",
            "work",
            "job",
            "resume",
            "interview",
        ]
    ):
        return "professional"

    if any(
        word in text
        for word in [
            "gym",
            "workout",
            "fitness",
            "train",
            "muscle",
            "exercise",
            "health",
            "weight",
            "running",
        ]
    ):
        return "fitness"

    if any(
        word in text
        for word in [
            "travel",
            "trip",
            "vacation",
            "explore",
            "destination",
            "flight",
            "holiday",
            "tour",
        ]
    ):
        return "travel"

    if any(
        word in text
        for word in [
            "food",
            "recipe",
            "delicious",
            "cook",
            "restaurant",
            "meal",
            "cooking",
            "dish",
        ]
    ):
        return "food"

    if any(
        word in text
        for word in [
            "lifestyle",
            "selfcare",
            "mindset",
            "daily",
            "routine",
            "life",
            "motivation",
        ]
    ):
        return "lifestyle"

    return "default"


# ============================================================
# CAPTION ANALYSIS
# ============================================================

def analyze_caption(caption: str) -> Dict[str, Any]:

    caption = str(caption or "").strip()

    words = caption.split()

    word_count = len(words)
    char_count = len(caption)

    has_question = "?" in caption

    has_cta = any(
        phrase in caption.lower()
        for phrase in [
            "tag",
            "comment",
            "share",
            "what do you think",
            "drop",
            "let me know",
            "tell me",
            "your thoughts",
            "save this",
            "follow",
            "reply",
        ]
    )

    has_emoji = bool(
        re.search(
            r"[\U0001F300-\U0001F9FF]",
            caption
        )
    )

    has_story = (
        word_count > 20
        and any(
            word in caption.lower()
            for word in [
                "i",
                "my",
                "me",
                "today",
                "learned",
                "realized",
                "experience",
            ]
        )
    )

    problems = []

    if word_count == 0:
        problems.append(
            "No caption was provided. A clear caption gives the audience context."
        )

    elif word_count < 12:
        problems.append(
            f"Caption is very short ({word_count} words). "
            "Consider adding useful context or a stronger hook."
        )

    elif word_count < 18:
        problems.append(
            f"Caption is somewhat short ({word_count} words). "
            "A little more context may improve engagement."
        )

    if not has_question:
        problems.append(
            "There is no direct question, so there is less encouragement for comments."
        )

    if not has_cta:
        problems.append(
            "There is no clear call-to-action asking the audience to interact."
        )

    if not has_emoji:
        problems.append(
            "No emoji was detected. A relevant emoji can make the caption easier to scan."
        )

    if not has_story and word_count < 25:
        problems.append(
            "The caption could provide more personal context or a useful takeaway."
        )

    score = 100

    if word_count == 0:
        score -= 40
    elif word_count < 12:
        score -= 25
    elif word_count < 18:
        score -= 12

    if not has_question:
        score -= 15

    if not has_cta:
        score -= 12

    if not has_emoji:
        score -= 5

    if not has_story:
        score -= 8

    score = max(20, min(100, score))

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
    }


# ============================================================
# CAPTION SUGGESTION
# ============================================================

def generate_ai_caption(
    caption: str,
    category: str,
    problems: List[str]
) -> Dict[str, Any]:

    base = str(caption or "").strip()

    if not base:
        base = "A new idea, a new experience, and another step forward."

    if category == "professional":

        improved = (
            f"{base}\n\n"
            "Sharing one practical lesson from this experience.\n\n"
            "What is one lesson that has helped you grow professionally?"
        )

    elif category == "fitness":

        improved = (
            f"{base}\n\n"
            "Progress comes from consistency, not one perfect workout.\n\n"
            "What fitness habit are you working on this week?"
        )

    elif category == "travel":

        improved = (
            f"{base}\n\n"
            "Every place has a story worth remembering.\n\n"
            "Which destination would you visit next?"
        )

    elif category == "food":

        improved = (
            f"{base}\n\n"
            "Good food becomes even better when there is a story behind it.\n\n"
            "Would you try this?"
        )

    else:

        improved = (
            f"{base}\n\n"
            "There is always something new to learn from everyday moments.\n\n"
            "What do you think?"
        )

    return {
        "ai_suggested_caption": improved,
        "reason": (
            "The suggested version keeps the original idea while adding "
            "context and an interaction prompt."
        ),
    }


# ============================================================
# HASHTAG ANALYSIS
# ============================================================

def get_suggested_hashtags(
    category: str,
    current_hashtags: Optional[List[str]] = None,
    keywords: Optional[List[str]] = None
) -> Dict[str, Any]:

    current = []

    for hashtag in current_hashtags or []:

        clean = str(hashtag).strip()

        if not clean:
            continue

        if not clean.startswith("#"):
            clean = f"#{clean}"

        if clean.lower() not in [
            existing.lower()
            for existing in current
        ]:
            current.append(clean)

    library = HASHTAG_LIBRARY.get(
        category,
        HASHTAG_LIBRARY["default"]
    )

    recommended = [
        tag
        for tag in library
        if tag.lower()
        not in [item.lower() for item in current]
    ][:6]

    keyword_hashtags = []

    for keyword in keywords or []:

        clean_keyword = re.sub(
            r"[^A-Za-z0-9_]",
            "",
            str(keyword)
        )

        if clean_keyword:

            hashtag = f"#{clean_keyword}"

            if hashtag.lower() not in [
                item.lower()
                for item in current + recommended
            ]:
                keyword_hashtags.append(hashtag)

    recommended = (
        keyword_hashtags[:3]
        + recommended
    )[:6]

    if len(current) == 0:

        reason = (
            "No hashtags were detected. Add a small set of highly relevant "
            "hashtags based on the actual topic instead of using unrelated tags."
        )

    elif len(current) < 4:

        reason = (
            f"You currently use {len(current)} hashtag(s). "
            "Consider adding a few more topic-specific hashtags."
        )

    else:

        reason = (
            f"You currently use {len(current)} hashtags. "
            "Focus on relevance rather than simply increasing the count."
        )

    return {
        "current": current,
        "recommended": recommended,
        "reason": reason,
    }


# ============================================================
# POSTING TIME ANALYSIS
# ============================================================

def analyze_posting_time(
    current_time: Any,
    platform: str = "instagram"
) -> Dict[str, Any]:

    platform_key = str(
        platform or "instagram"
    ).lower().strip()

    optimal = OPTIMAL_POSTING_TIMES.get(
        platform_key,
        OPTIMAL_POSTING_TIMES["default"]
    )

    hour = _parse_hour(current_time)

    if hour is None:

        performance = "Unknown"

    elif hour in optimal["hours"]:

        performance = "Good"

    else:

        performance = "Outside Suggested Window"

    return {
        "current_time": (
            str(current_time)
            if current_time is not None
            else "Not specified"
        ),
        "current_hour": hour,
        "performance": performance,
        "recommended_window": optimal["best_window"],
        "reason": optimal["reason"],
    }


# ============================================================
# ENGAGEMENT ANALYSIS (POST-PUBLISH ONLY -- OPTIONAL)
# ============================================================
# Call this only when you actually have real engagement numbers for an
# already-published post (e.g. a future "check my live post" endpoint).
# The pre-publish prediction flow does not call this at all.

def analyze_engagement(
    likes: int,
    comments: int,
    shares: int,
    saves: int,
    follower_count: int = 0,
    reach: int = 0,
    impressions: int = 0,
) -> Dict[str, Any]:

    likes = _safe_int(likes)
    comments = _safe_int(comments)
    shares = _safe_int(shares)
    saves = _safe_int(saves)
    follower_count = _safe_int(follower_count)
    reach = _safe_int(reach)
    impressions = _safe_int(impressions)

    if follower_count > 0:

        like_rate = (likes / follower_count) * 100
        comment_rate = (comments / follower_count) * 100
        share_rate = (shares / follower_count) * 100
        save_rate = (saves / follower_count) * 100
        reach_rate = (reach / follower_count) * 100

    else:

        like_rate = 0.0
        comment_rate = 0.0
        share_rate = 0.0
        save_rate = 0.0
        reach_rate = 0.0

    if reach > 0:
        impressions_per_reached_user = impressions / reach
    else:
        impressions_per_reached_user = 0.0

    if reach > 0:

        reach_like_rate = (likes / reach) * 100
        reach_comment_rate = (comments / reach) * 100
        reach_share_rate = (shares / reach) * 100
        reach_save_rate = (saves / reach) * 100

    else:

        reach_like_rate = 0.0
        reach_comment_rate = 0.0
        reach_share_rate = 0.0
        reach_save_rate = 0.0

    total_engagement = (
        likes
        + comments
        + shares
        + saves
    )

    if reach > 0:

        engagement_rate = (
            total_engagement / reach
        ) * 100

    elif impressions > 0:

        engagement_rate = (
            total_engagement / impressions
        ) * 100

    else:

        engagement_rate = 0.0

    def rate_status(rate: float) -> str:

        if rate <= 0:
            return "No Data"

        if rate < 1:
            return "Low"

        if rate < 3:
            return "Moderate"

        if rate < 7:
            return "Strong"

        return "Very Strong"

    actions = []

    if follower_count <= 0:
        actions.append(
            "Add your follower count so engagement can be evaluated relative to audience size."
        )

    if reach <= 0:
        actions.append(
            "Reach data is zero or unavailable, so reach-based engagement cannot yet be evaluated."
        )

    elif follower_count > 0 and reach_rate < 20:
        actions.append(
            "Reach is relatively low compared with the follower base. "
            "Improve the opening hook and distribution strategy."
        )

    if likes == 0:
        actions.append(
            "No likes were recorded yet. Strengthen the initial hook and share the post with relevant viewers."
        )

    elif follower_count > 0 and like_rate < 1:
        actions.append(
            "Like activity is relatively low compared with the follower base. "
            "Make the post more immediately relevant to the target audience."
        )

    if comments == 0:
        actions.append(
            "No comments were recorded yet. Add a specific question or opinion prompt."
        )

    elif likes > 0 and comments / likes < 0.02:
        actions.append(
            "Comments are low relative to likes. Use a direct question to encourage conversation."
        )

    if shares == 0:
        actions.append(
            "No shares were recorded yet. Add a useful, practical, surprising, or emotionally relevant takeaway."
        )

    elif likes > 0 and shares / likes < 0.03:
        actions.append(
            "Shares are relatively low compared with likes. Make the content easier to recommend to someone else."
        )

    if saves == 0:
        actions.append(
            "No saves were recorded yet. Consider adding a checklist, tip, tutorial, or reference-worthy information."
        )

    elif likes > 0 and saves / likes < 0.05:
        actions.append(
            "Saves are relatively low compared with likes. Add more reusable or reference-worthy information."
        )

    if impressions > 0 and reach > 0:

        if impressions_per_reached_user < 1.0:

            actions.append(
                "Impressions are not higher than reach. Check whether the impression data is being captured consistently."
            )

        elif impressions_per_reached_user > 3:

            actions.append(
                "The post is receiving repeated exposure among reached users. "
                "Focus on converting exposure into stronger interactions."
            )

    if not actions:

        actions.append(
            "The supplied engagement signals look reasonably healthy. "
            "Continue testing the caption, timing, and content format."
        )

    return {
        "followers": follower_count,
        "reach": reach,
        "impressions": impressions,
        "likes": {
            "value": likes,
            "rate_vs_followers": round(like_rate, 4),
            "rate_vs_reach": round(reach_like_rate, 4),
            "status": rate_status(like_rate),
        },
        "comments": {
            "value": comments,
            "rate_vs_followers": round(comment_rate, 4),
            "rate_vs_reach": round(reach_comment_rate, 4),
            "status": rate_status(comment_rate),
        },
        "shares": {
            "value": shares,
            "rate_vs_followers": round(share_rate, 4),
            "rate_vs_reach": round(reach_share_rate, 4),
            "status": rate_status(share_rate),
        },
        "saves": {
            "value": saves,
            "rate_vs_followers": round(save_rate, 4),
            "rate_vs_reach": round(reach_save_rate, 4),
            "status": rate_status(save_rate),
        },
        "reach_rate": round(reach_rate, 4),
        "engagement_rate": round(engagement_rate, 4),
        "impressions_per_reached_user": round(
            impressions_per_reached_user,
            4
        ),
        "total_engagement": total_engagement,
        "recommended_actions": actions,
    }


# ============================================================
# AI REASONING
# ============================================================

def generate_ai_reasoning(
    caption: str,
    category: str,
    virality_score: float,
    content_score: float,
    hashtag_count: int,
    posting_time: Dict,
    platform: str,
    caption_analysis: Dict,
    engagement_analysis: Optional[Dict] = None,
) -> str:

    parts = []

    parts.append(
        f"The current ML virality probability is approximately "
        f"{virality_score:.1f}% based on the caption, category, timing, "
        f"and follower signals supplied before publishing."
    )

    parts.append(
        f"The content is currently classified as {category}."
    )

    if caption_analysis["word_count"] == 0:

        parts.append(
            "The caption is empty, so there is very little textual context for the audience."
        )

    elif caption_analysis["current_score"] < 60:

        parts.append(
            f"The caption score is {caption_analysis['current_score']}/100. "
            "It has several opportunities for improvement."
        )

    else:

        parts.append(
            f"The caption score is {caption_analysis['current_score']}/100, "
            "which indicates reasonably usable caption structure."
        )

    if not caption_analysis["has_question"]:

        parts.append(
            "Adding a specific question could create a clearer reason for people to comment."
        )

    if not caption_analysis["has_cta"]:

        parts.append(
            "A clear call-to-action is currently missing."
        )

    if hashtag_count == 0:

        parts.append(
            "No hashtags were detected, so topic-specific discovery opportunities are limited."
        )

    elif hashtag_count < 4:

        parts.append(
            f"Only {hashtag_count} hashtag(s) were detected; relevance is more important than simply increasing the count."
        )

    if posting_time["performance"] == "Outside Suggested Window":

        parts.append(
            f"The selected posting time is outside the suggested "
            f"{platform} window of {posting_time['recommended_window']}."
        )

    # Only mention engagement if real post-publish data was actually supplied.
    if engagement_analysis is not None:

        engagement_rate = engagement_analysis["engagement_rate"]
        reach_rate = engagement_analysis["reach_rate"]

        if engagement_analysis["followers"] > 0:

            parts.append(
                f"Reach currently represents {reach_rate:.1f}% of the supplied follower count."
            )

        if engagement_rate > 0:

            parts.append(
                f"The supplied engagement signals produce an engagement rate of "
                f"{engagement_rate:.2f}% relative to the available reach/impression data."
            )

        if engagement_analysis["shares"]["value"] == 0:

            parts.append(
                "No shares are currently recorded, so shareability is an important improvement area."
            )

        if engagement_analysis["saves"]["value"] == 0:

            parts.append(
                "No saves are currently recorded, so adding reference-worthy information could help."
            )

    return " ".join(parts)


# ============================================================
# TOP IMPROVEMENTS
# ============================================================

def generate_top_improvements(
    caption_analysis: Dict,
    hashtag_analysis: Dict,
    posting_time: Dict,
    category: str,
    engagement_analysis: Optional[Dict] = None,
) -> List[Dict[str, Any]]:

    improvements = []

    rank = 1

    if caption_analysis["current_score"] < 75:

        improvements.append(
            {
                "rank": rank,
                "title": "Improve the Caption",
                "why": (
                    f"Current caption score is "
                    f"{caption_analysis['current_score']}/100."
                ),
                "how": (
                    "Add context, a stronger opening, a specific question, "
                    "and a relevant call-to-action."
                ),
                "difficulty": "Easy",
                "time_required": "2–3 minutes",
                "stars": 5,
            }
        )

        rank += 1

    if len(hashtag_analysis["current"]) < 4:

        improvements.append(
            {
                "rank": rank,
                "title": "Improve Hashtag Relevance",
                "why": (
                    "The current post has relatively few detected hashtags."
                ),
                "how": (
                    "Use a small group of hashtags directly related to "
                    f"the {category} topic."
                ),
                "difficulty": "Easy",
                "time_required": "1 minute",
                "stars": 4,
            }
        )

        rank += 1

    if posting_time["performance"] == "Outside Suggested Window":

        improvements.append(
            {
                "rank": rank,
                "title": "Test a Better Posting Window",
                "why": posting_time["reason"],
                "how": (
                    f"Test posting between "
                    f"{posting_time['recommended_window']}."
                ),
                "difficulty": "Easy",
                "time_required": "1 minute",
                "stars": 4,
            }
        )

        rank += 1

    # Only include engagement-driven improvements if real post-publish
    # data was actually supplied.
    if engagement_analysis is not None:

        if engagement_analysis["shares"]["value"] == 0:

            improvements.append(
                {
                    "rank": rank,
                    "title": "Improve Shareability",
                    "why": "No shares are currently recorded.",
                    "how": (
                        "Add a useful, surprising, practical, or emotionally "
                        "relevant takeaway that people can send to others."
                    ),
                    "difficulty": "Medium",
                    "time_required": "5–10 minutes",
                    "stars": 5,
                }
            )

            rank += 1

        if engagement_analysis["saves"]["value"] == 0:

            improvements.append(
                {
                    "rank": rank,
                    "title": "Create a Save-Worthy Takeaway",
                    "why": "No saves are currently recorded.",
                    "how": (
                        "Include a checklist, tip, tutorial, framework, "
                        "or useful reference."
                    ),
                    "difficulty": "Medium",
                    "time_required": "5–10 minutes",
                    "stars": 4,
                }
            )

            rank += 1

        if engagement_analysis["reach_rate"] < 20:

            improvements.append(
                {
                    "rank": rank,
                    "title": "Improve Initial Distribution",
                    "why": (
                        "The supplied reach is relatively low compared with "
                        "the follower count."
                    ),
                    "how": (
                        "Strengthen the first line, use a clearer topic, "
                        "and distribute the post to relevant existing audiences."
                    ),
                    "difficulty": "Medium",
                    "time_required": "10–15 minutes",
                    "stars": 4,
                }
            )
            rank += 1

    if not improvements:

        improvements.append(
            {
                "rank": 1,
                "title": "Continue Testing",
                "why": (
                    "The supplied signals do not show a major weakness."
                ),
                "how": (
                    "Continue testing variations in caption, timing, "
                    "hashtags, and content format."
                ),
                "difficulty": "Easy",
                "time_required": "Ongoing",
                "stars": 4,
            }
        )

    return improvements[:5]


# ============================================================
# FINAL ACTION PLAN
# ============================================================

def generate_final_action_plan(
    hashtag_analysis: Dict,
    posting_time: Dict,
    virality: float,
    engagement_analysis: Optional[Dict] = None,
) -> Dict[str, Any]:

    today = []

    today.append(
        "Review the caption and add a specific interaction prompt if appropriate."
    )

    if hashtag_analysis["recommended"]:

        today.append(
            "Use only relevant hashtags: "
            + ", ".join(
                hashtag_analysis["recommended"][:5]
            )
        )

    if posting_time["performance"] == "Outside Suggested Window":

        today.append(
            f"Test a posting time inside "
            f"{posting_time['recommended_window']}."
        )

    # Only add engagement-driven action items if real post-publish data
    # was actually supplied -- otherwise these would be recommending
    # fixes for numbers that are simply zero because the post hasn't
    # been published yet.
    if engagement_analysis is not None:

        if engagement_analysis["shares"]["value"] == 0:

            today.append(
                "Improve shareability with a useful or emotionally relevant takeaway."
            )

        if engagement_analysis["saves"]["value"] == 0:

            today.append(
                "Add information people may want to save for later."
            )

        if engagement_analysis["comments"]["value"] == 0:

            today.append(
                "Add a specific question that is easy for the target audience to answer."
            )

        if engagement_analysis["reach_rate"] < 20:

            today.append(
                "Work on stronger initial distribution because reach is low relative to the supplied follower count."
            )

    return {
        "today": today,
        "based_on_current_prediction": f"{virality:.1f}%",
        "note": (
            "These actions are recommendations based on the supplied inputs. "
            "They are not guaranteed percentage improvements."
        ),
    }


# ============================================================
# EXPLAINABLE AI
# ============================================================

def generate_explainable_ai(
    caption_analysis: Optional[Dict[str, Any]] = None,
    posting_time: Optional[Dict[str, Any]] = None,
    hashtag_count: int = 0,
    engagement_analysis: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:

    factors = []

    caption_analysis = caption_analysis or {}
    posting_time = posting_time or {}

    caption_score = _safe_float(
        caption_analysis.get("current_score")
    )

    # These are NOT claimed as trained-model SHAP feature importance --
    # that lives in config/shap_top_features.json from train_pipeline.py.
    # These are recommendation-engine observations about the input.
    factors.append(
        {
            "name": "ML Virality Probability",
            "influence": None,
            "description": (
                "Primary prediction comes from the trained ML model, based "
                "on caption text, sentiment, category, timing, and follower count."
            ),
        }
    )

    factors.append(
        {
            "name": "Caption Quality",
            "influence": None,
            "description": (
                f"Caption structure score is {caption_score:.0f}/100."
            ),
        }
    )

    factors.append(
        {
            "name": "Posting Time",
            "influence": None,
            "description": (
                f"Current timing status: "
                f"{posting_time.get('performance', 'Unknown')}."
            ),
        }
    )

    factors.append(
        {
            "name": "Hashtags",
            "influence": None,
            "description": (
                f"{hashtag_count} hashtag(s) detected in the submitted input."
            ),
        }
    )

    # Only include engagement-derived factors if real post-publish data
    # was actually supplied.
    if engagement_analysis is not None:

        engagement_rate = _safe_float(
            engagement_analysis.get("engagement_rate")
        )

        reach_rate = _safe_float(
            engagement_analysis.get("reach_rate")
        )

        factors.append(
            {
                "name": "Engagement Signals",
                "influence": None,
                "description": (
                    f"Likes, comments, shares and saves are currently "
                    f"{engagement_analysis.get('total_engagement', 0)} in total."
                ),
            }
        )

        factors.append(
            {
                "name": "Audience Reach",
                "influence": None,
                "description": (
                    f"Reach is {engagement_analysis.get('reach', 0)} "
                    f"against {engagement_analysis.get('followers', 0)} followers."
                ),
            }
        )

        if engagement_rate > 0:

            factors.append(
                {
                    "name": "Engagement Rate",
                    "influence": None,
                    "description": (
                        f"Calculated engagement rate: {engagement_rate:.2f}%."
                    ),
                }
            )

        if reach_rate > 0:

            factors.append(
                {
                    "name": "Reach Rate",
                    "influence": None,
                    "description": (
                        f"Reach represents {reach_rate:.2f}% of the supplied follower count."
                    ),
                }
            )

    return factors


# ============================================================
# MAIN RECOMMENDATION BUILDER
# ============================================================

def build_full_recommendation(
    caption: str,
    platform: str = "instagram",
    current_hashtags: Optional[List[str]] = None,
    keywords: Optional[List[str]] = None,
    post_time: Any = None,
    follower_count: int = 0,
    media_type: str = "image",
    content_category: str = "",
    virality_score: float = 0.0,
    content_score: float = 0.0,
    image_analysis: Optional[Dict] = None,
    # Post-publish engagement data -- OPTIONAL. Leave as None for the
    # normal pre-publish prediction flow. Only pass real numbers if you
    # have them (e.g. a future "check my live post" endpoint).
    likes: Optional[int] = None,
    comments: Optional[int] = None,
    shares: Optional[int] = None,
    saves: Optional[int] = None,
    reach: Optional[int] = None,
    impressions: Optional[int] = None,
) -> Dict[str, Any]:

    current_hashtags = _normalise_text_list(
        current_hashtags
    )

    keywords = _normalise_text_list(
        keywords
    )

    caption = str(caption or "").strip()

    platform = str(
        platform or "instagram"
    )

    media_type = str(
        media_type or "image"
    )

    # --------------------------------------------------------
    # Category
    # --------------------------------------------------------

    detected_category = detect_content_category(
        caption,
        keywords
    )

    category = (
        str(content_category).strip().lower()
        if content_category
        else detected_category
    )

    if category not in HASHTAG_LIBRARY:

        category = detected_category

    # --------------------------------------------------------
    # Caption
    # --------------------------------------------------------

    caption_analysis = analyze_caption(
        caption
    )

    ai_caption = generate_ai_caption(
        caption,
        category,
        caption_analysis["problems"]
    )

    # --------------------------------------------------------
    # Hashtags
    # --------------------------------------------------------

    hashtag_analysis = get_suggested_hashtags(
        category=category,
        current_hashtags=current_hashtags,
        keywords=keywords,
    )

    # --------------------------------------------------------
    # Time
    # --------------------------------------------------------

    posting_time = analyze_posting_time(
        post_time,
        platform
    )

    # --------------------------------------------------------
    # Engagement (only if real post-publish numbers were supplied)
    # --------------------------------------------------------

    have_engagement_data = any(
        v is not None for v in (likes, comments, shares, saves, reach, impressions)
    )

    engagement = (
        analyze_engagement(
            likes=likes or 0,
            comments=comments or 0,
            shares=shares or 0,
            saves=saves or 0,
            follower_count=follower_count,
            reach=reach or 0,
            impressions=impressions or 0,
        )
        if have_engagement_data
        else None
    )

    # --------------------------------------------------------
    # Reasoning
    # --------------------------------------------------------

    ai_reasoning = generate_ai_reasoning(
        caption=caption,
        category=category,
        virality_score=virality_score,
        content_score=content_score,
        hashtag_count=len(current_hashtags),
        posting_time=posting_time,
        platform=platform,
        caption_analysis=caption_analysis,
        engagement_analysis=engagement,
    )

    # --------------------------------------------------------
    # Improvements
    # --------------------------------------------------------

    top_improvements = generate_top_improvements(
        caption_analysis=caption_analysis,
        hashtag_analysis=hashtag_analysis,
        posting_time=posting_time,
        category=category,
        engagement_analysis=engagement,
    )

    # --------------------------------------------------------
    # Action plan
    # --------------------------------------------------------

    action_plan = generate_final_action_plan(
        hashtag_analysis=hashtag_analysis,
        posting_time=posting_time,
        virality=virality_score,
        engagement_analysis=engagement,
    )

    # --------------------------------------------------------
    # Strengths
    # --------------------------------------------------------

    strengths = []

    if caption_analysis["current_score"] >= 75:

        strengths.append(
            "Caption has a reasonably strong structure."
        )

    if caption_analysis["has_question"]:

        strengths.append(
            "Caption includes a question that can encourage discussion."
        )

    if caption_analysis["has_cta"]:

        strengths.append(
            "Caption contains a call-to-action."
        )

    if len(current_hashtags) >= 4:

        strengths.append(
            "Multiple hashtags were provided for topic discovery."
        )

    if posting_time["performance"] == "Good":

        strengths.append(
            "The selected posting time is inside the suggested platform window."
        )

    if engagement is not None:

        if engagement["reach_rate"] >= 50:

            strengths.append(
                "Reach is relatively strong compared with the supplied follower count."
            )

        if engagement["shares"]["value"] > 0:

            strengths.append(
                "The post has recorded share activity."
            )

        if engagement["saves"]["value"] > 0:

            strengths.append(
                "The post has recorded save activity."
            )

    if not strengths:

        strengths.append(
            "The post has usable data for further optimization."
        )

    # --------------------------------------------------------
    # Weaknesses
    # --------------------------------------------------------

    weaknesses = list(
        caption_analysis["problems"]
    )

    if len(current_hashtags) < 4:

        weaknesses.append(
            f"Only {len(current_hashtags)} hashtag(s) detected."
        )

    if posting_time["performance"] == "Outside Suggested Window":

        weaknesses.append(
            f"Selected posting time ({posting_time['current_time']}) "
            f"is outside the suggested {platform} window."
        )

    if engagement is not None:

        if engagement["followers"] > 0 and engagement["reach_rate"] < 20:

            weaknesses.append(
                "Reach is relatively low compared with follower count."
            )

        if engagement["shares"]["value"] == 0:

            weaknesses.append(
                "No shares are currently recorded."
            )

        if engagement["saves"]["value"] == 0:

            weaknesses.append(
                "No saves are currently recorded."
            )

        if engagement["comments"]["value"] == 0:

            weaknesses.append(
                "No comments are currently recorded."
            )

    # --------------------------------------------------------
    # Explainable AI
    # --------------------------------------------------------

    explainable_ai = generate_explainable_ai(
        caption_analysis=caption_analysis,
        posting_time=posting_time,
        hashtag_count=len(current_hashtags),
        engagement_analysis=engagement,
    )

    # --------------------------------------------------------
    # Image analysis
    # --------------------------------------------------------

    final_image_analysis = image_analysis or {
        "status": "No detailed image analysis provided",
        "note": (
            "The current prediction system primarily uses caption and "
            "metadata features. No image-trained virality model is being claimed."
        ),
    }

    # --------------------------------------------------------
    # Final report
    # --------------------------------------------------------

    return {
        "category": category,

        "platform": platform,

        "media_type": media_type,

        "keywords": keywords,

        "ai_reasoning": ai_reasoning,

        "caption_analysis": {
            **caption_analysis,
            **ai_caption,
        },

        "suggested_hashtags": hashtag_analysis,

        "posting_time": posting_time,

        "engagement_analysis": engagement,  # None for the normal pre-publish flow

        "image_analysis": final_image_analysis,

        "top_improvements": top_improvements,

        "ai_content_coach": {
            "current_virality": f"{virality_score:.1f}%",
            "message": (
                "The virality value shown here comes from the existing "
                "prediction model. Recommendations are based on the supplied inputs."
            ),
        },

        "explainable_ai": explainable_ai,

        "final_action_plan": action_plan,

        "strengths": strengths,

        "weaknesses": weaknesses,
    }


# ============================================================
# RECOMMENDATION ENGINE
# ============================================================

class RecommendationEngine:

    """
    Recommendation engine used by the FastAPI backend.

    The existing trained ML model remains responsible for
    virality prediction.

    This engine uses the actual user input to create
    personalized recommendations. Engagement metrics
    (likes/comments/shares/saves/reach/impressions) are only
    used if a caller explicitly supplies real post-publish data --
    the normal pre-publish prediction flow never sends these,
    so they are treated as "not available", not as zero.
    """

    def __init__(
        self,
        dataset_path: Optional[str] = None
    ) -> None:

        self.dataset_path = dataset_path

    def generate_report(
        self,
        post_payload: Dict[str, Any],
        prediction: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:

        # ----------------------------------------------------
        # Text
        # ----------------------------------------------------

        caption = str(
            post_payload.get("caption") or ""
        )

        keywords = _normalise_text_list(
            post_payload.get("keywords")
        )

        hashtags = _normalise_text_list(
            post_payload.get("hashtags")
        )

        # ----------------------------------------------------
        # Metadata
        # ----------------------------------------------------

        platform = str(
            post_payload.get("platform")
            or "Instagram"
        )

        media_type = str(
            post_payload.get("media_type")
            or "image"
        )

        content_category = str(
            post_payload.get("content_category")
            or ""
        )

        post_time = (
            post_payload.get("post_time")
            if post_payload.get("post_time") is not None
            else post_payload.get("post_hour")
        )

        followers = _safe_int(
            post_payload.get("follower_count")
        )

        # ----------------------------------------------------
        # Post-publish engagement (optional).
        # Use .get() with no default -- if the key is absent (as it will
        # be for every request from the current /api/predict schema),
        # these stay None, and build_full_recommendation correctly treats
        # that as "no engagement data available" rather than "zero
        # engagement".
        # ----------------------------------------------------

        def _optional_int(key: str) -> Optional[int]:
            value = post_payload.get(key)
            return None if value is None else _safe_int(value)

        likes = _optional_int("early_likes")
        comments = _optional_int("early_comments")
        shares = _optional_int("early_shares")
        saves = _optional_int("saves")
        reach = _optional_int("reach")
        impressions = _optional_int("impressions")

        # ----------------------------------------------------
        # ML prediction
        # ----------------------------------------------------

        virality_score = 0.0

        if prediction:

            virality_value = prediction.get(
                "viral_probability",
                prediction.get(
                    "virality",
                    prediction.get(
                        "score",
                        0.0
                    ),
                ),
            )

            if isinstance(
                virality_value,
                (int, float)
            ):

                value = float(
                    virality_value
                )

                if 0.0 <= value <= 1.0:

                    virality_score = value * 100

                else:

                    virality_score = value

        # ----------------------------------------------------
        # Content score
        # ----------------------------------------------------

        content_score = 0.0

        if prediction:

            content_score = _safe_float(
                prediction.get(
                    "content_score",
                    0.0
                )
            )

        # ----------------------------------------------------
        # Image information
        # ----------------------------------------------------

        image_analysis = post_payload.get(
            "image_analysis"
        )

        # ----------------------------------------------------
        # Build report
        # ----------------------------------------------------

        report = build_full_recommendation(

            caption=caption,

            platform=platform,

            current_hashtags=hashtags,

            keywords=keywords,

            post_time=post_time,

            follower_count=followers,

            media_type=media_type,

            content_category=content_category,

            virality_score=virality_score,

            content_score=content_score,

            image_analysis=image_analysis,

            likes=likes,
            comments=comments,
            shares=shares,
            saves=saves,
            reach=reach,
            impressions=impressions,
        )

        # ----------------------------------------------------
        # Compatibility fields for existing frontend
        # ----------------------------------------------------

        report["priority_actions"] = (
            report
            .get("final_action_plan", {})
            .get("today", [])
        )

        report["hashtag_analysis"] = (
            report.get("suggested_hashtags", {})
        )

        report["action_plan"] = (
            report
            .get("final_action_plan", {})
            .get("today", [])
        )

        report["top_factors"] = (
            report.get("explainable_ai", [])
        )

        report["explainability"] = {

            "top_factors": report.get(
                "explainable_ai",
                []
            ),

            "action_plan": report
            .get("final_action_plan", {})
            .get("today", []),

            "hashtag_analysis": report.get(
                "suggested_hashtags",
                {}
            ),

        }

        return report
