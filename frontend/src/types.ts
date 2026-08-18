// =============================
// Prediction Form
// =============================

export interface PredictionFormState {
  caption: string;

  post_hour: number;
  day_of_week: number;

  follower_count: number;

  // Post-publish only (optional, default 0). These feed ONLY the
  // recommendation engine's "how is my live post doing" analytics --
  // never the ML virality prediction. See app.py / inference.py.
  early_likes: number;
  early_comments: number;
  early_shares: number;
  saves: number;
  reach: number;
  impressions: number;

  media_type: string;
  content_category: string;
  platform: string;
  model: string;

  keywords: string;
  hashtags: string;

  image: File | null;
}

export const DEFAULT_INPUT: PredictionFormState = {
  caption: "",
  post_hour: 18,
  day_of_week: 1,

  follower_count: 0,

  early_likes: 0,
  early_comments: 0,
  early_shares: 0,
  saves: 0,
  reach: 0,
  impressions: 0,

  media_type: "image",
  content_category: "Lifestyle",
  platform: "Instagram",
  model: "ensemble",

  keywords: "",
  hashtags: "",

  image: null,
};

// =============================
// Backend Prediction
// =============================

export interface BackendPrediction {
  viral: number;
  viral_probability: number;
  model: string;
}

// =============================
// Caption Analysis
// =============================

export interface CaptionAnalysis {
  current_caption: string;
  word_count: number;
  char_count: number;
  recommended_length: string;
  current_score: number;
  problems: string[];
  has_cta: boolean;
  has_emoji: boolean;
  has_question: boolean;
  has_story?: boolean;
  ai_suggested_caption: string;
  reason?: string;
  // Step 3: honestly reports where ai_suggested_caption actually came
  // from -- "gemini" (genuine generation), "unavailable" (no API key
  // configured), or "error" (Gemini call failed, template kept as-is).
  caption_source?: "gemini" | "unavailable" | "error";
  caption_source_note?: string;
}

// =============================
// Hashtags
// =============================

export interface HashtagAnalysis {
  current: string[];
  recommended: string[];
  reason: string;
}

// =============================
// Posting Time
// =============================

export interface PostingTimeAnalysis {
  current_time: string;
  current_hour?: number | null;
  performance: string;
  recommended_window: string;
  reason: string;
}

// =============================
// Engagement (post-publish only, optional / can be null)
// =============================

export interface EngagementRateBlock {
  value: number;
  rate_vs_followers: number;
  rate_vs_reach: number;
  status: string;
  // True when this value is a forecast (from estimate_missing_engagement
  // in recommendation_engine.py) rather than a number the user actually
  // supplied. Never render this as tracked/live data without the badge.
  estimated: boolean;
}

export interface EngagementAnalysis {
  followers: number;
  reach: number;
  reach_estimated: boolean;
  impressions: number;
  impressions_estimated: boolean;
  likes: EngagementRateBlock;
  comments: EngagementRateBlock;
  shares: EngagementRateBlock;
  saves: EngagementRateBlock;
  reach_rate: number;
  engagement_rate: number;
  // Which denominator engagement_rate was actually computed against.
  // "none" means followers/reach/impressions were all 0 or unavailable.
  engagement_rate_basis: "reach" | "impressions" | "followers" | "none";
  impressions_per_reached_user: number;
  total_engagement: number;
  recommended_actions: string[];
  // True if ANY field in this panel is a forecast rather than a number
  // the user supplied.
  has_estimated_values: boolean;
  // Human-readable disclosure shown when has_estimated_values is true;
  // null otherwise.
  estimate_note: string | null;
}

// =============================
// Image Analysis
// =============================

export interface ImageAnalysis {
  status?: string;
  note?: string;
  brightness?: number | string;
  brightness_label?: string;
  contrast?: number | string;
  saturation?: number | string;
  saturation_label?: string;
  colorfulness?: number | string;
  sharpness?: number | string;
  detail_label?: string;
  tone?: string;
  composition?: string;
  aspect_ratio?: number | string;
  faces?: string;
  color_harmony?: string;
  suggestions?: string[];
}

// =============================
// Improvements
// =============================

export interface TopImprovement {
  rank: number;
  title: string;
  why: string;
  how: string;
  difficulty: string;
  time_required: string;
  stars: number;
}

// =============================
// Explainable AI
// =============================

export interface ExplainableFeature {
  name: string;
  // Rule-based read of the same real numbers shown elsewhere in the
  // report (caption score, hashtag count, posting-time performance,
  // engagement/reach rate thresholds, real image features) -- NOT
  // trained-model SHAP importance.
  status: "Strong" | "Moderate" | "Needs Attention" | "Informational";
  description: string;
}

// =============================
// AI Coach
// =============================

export interface AIContentCoach {
  current_virality: string;
  message: string;
}

// =============================
// Final Action Plan
// =============================

export interface FinalActionPlan {
  today: string[];
  based_on_current_prediction: string;
  note: string;
}

// =============================
// Recommendation Report
// =============================

export interface RecommendationData {
  category: string;
  platform: string;
  media_type: string;
  keywords: string[];

  ai_reasoning: string;

  strengths: string[];
  weaknesses: string[];

  caption_analysis: CaptionAnalysis;

  suggested_hashtags: HashtagAnalysis;

  posting_time: PostingTimeAnalysis;

  // null unless real post-publish engagement numbers were supplied
  engagement_analysis: EngagementAnalysis | null;

  image_analysis: ImageAnalysis;

  top_improvements: TopImprovement[];

  ai_content_coach: AIContentCoach;

  explainable_ai: ExplainableFeature[];

  final_action_plan: FinalActionPlan;

  // compatibility fields added by RecommendationEngine.generate_report
  priority_actions?: string[];
  hashtag_analysis?: HashtagAnalysis;
  action_plan?: string[];
  top_factors?: ExplainableFeature[];
  explainability?: {
    top_factors: ExplainableFeature[];
    action_plan: string[];
    hashtag_analysis: HashtagAnalysis;
  };
}

// =============================
// API Response
// =============================

export interface PredictApiResponse {
  success: boolean;

  prediction: BackendPrediction;

  recommendation_report?: RecommendationData;

  recommendations?: string[];

  explainable_ai?: ExplainableFeature[];

  message?: string;
}

// =============================
// Dashboard History
// =============================

export interface HistoryEntry {
  id: string;
  platform: string;
  viralityScore: number;
  confidence: number;
  caption: string;
  timestamp: string;
  predictedReach: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date | string;
}

export interface FeatureItem {
  icon?: any;
  iconName?: string;
  glowColor?: string;
  title: string;
  description: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface PricingTier {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  popular?: boolean;
  buttonText?: string;
  cta?: string;
}

export interface Testimonial {
  quote: string;
  author?: string;
  name?: string;
  role: string;
  company: string;
  avatar: string;
  rating?: number;
}

export interface ModelMetric {
  name: string;
  accuracy: number;
  f1Score: number;
  precision: number;
  recall: number;
  latencyMs?: number;
  aucRoc?: number;
}

export interface FeatureExtractionTableItem {
  modality: string;
  extractedFeature: string;
  description: string;
  algorithmTool: string;
}

export interface SoftwareDetailItem {
  category?: string;
  tool?: string;
  purpose?: string;
  component?: string;
  techStack?: string;
}

export interface ShapFeature {
  feature?: string;
  featureName?: string;
  modality?: string;
  shapValue: number;
  category?: string;
  description?: string;
}

export interface ConfusionMatrixData {
  truePositive?: number;
  falsePositive?: number;
  falseNegative?: number;
  trueNegative?: number;
  actualViralPredictedViral?: number;
  actualViralPredictedNonViral?: number;
  actualNonViralPredictedViral?: number;
  actualNonViralPredictedNonViral?: number;
}

export interface RocCurvePoint {
  fpr: number;
  tpr: number;
  baseline?: number;
}

export interface CorrelationItem {
  feature1?: string;
  feature2?: string;
  featureA?: string;
  featureB?: string;
  correlation?: number;
  value?: number;
}

export interface PastPredictionHistoryItem {
  id: string;
  caption?: string;
  captionSnippet?: string;
  platform: string;
  score?: number;
  viralityScore?: number;
  confidence?: number;
  date?: string;
  timestamp?: string;
  imageUrl?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  followers?: number;
  postingTime?: string;
  performanceCategory?: string;
}