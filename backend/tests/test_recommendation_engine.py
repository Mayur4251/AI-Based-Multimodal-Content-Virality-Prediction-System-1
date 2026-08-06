import os
import sys
import unittest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from utils.recommendation_engine import RecommendationEngine


class RecommendationEngineTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = RecommendationEngine(dataset_path=os.path.join(BASE_DIR, "data", "posts_cleaned.csv"))

    def test_report_includes_explainability_and_action_plan(self) -> None:
        post = {
            "caption": "A short caption",
            "post_hour": 8,
            "day_of_week": 2,
            "follower_count": 1500,
            "early_likes": 20,
            "early_shares": 2,
            "early_comments": 1,
            "saves": 1,
            "reach": 250,
            "impressions": 500,
            "media_type": "image",
            "content_category": "travel",
            "platform": "Instagram",
        }
        prediction = {"viral_probability": 0.38, "viral": 0, "model": "ensemble"}

        report = self.engine.generate_report(post, prediction)

        self.assertIn("explainability", report)
        self.assertIn("action_plan", report)
        self.assertGreaterEqual(len(report["action_plan"]), 3)
        self.assertGreater(report["hashtag_analysis"]["platform_recommendation"]["recommended_hashtag_count"], 0)
        self.assertIn("top_factors", report["explainability"])


if __name__ == "__main__":
    unittest.main()
