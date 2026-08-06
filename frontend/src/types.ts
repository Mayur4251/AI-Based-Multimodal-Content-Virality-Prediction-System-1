// =============================
// Prediction Form
// =============================

export interface PredictionFormState {
  caption: string;
  post_hour: number;
  day_of_week: number;
  follower_count: number;
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
  expected_improvement: string;
  ai_suggested_caption: string;
  engagement_boost: string;
  comments_boost: string;
}

// =============================
// Hashtags
// =============================

export interface HashtagAnalysis {
  current: string[];
  recommended: string[];
  reason: string;
  expected_boost: string;
}

// =============================
// Posting Time
// =============================

export interface PostingTimeAnalysis {
  current_time: string;
  performance: string;
  recommended_window: string;
  reason: string;
  expected_boost: string;
}

// =============================
// Engagement
// =============================

export interface EngagementMetric {
  value: number;
  status: string;
  note: string;
}

export interface EngagementAnalysis {
  likes: EngagementMetric;
  comments: EngagementMetric;
  shares: EngagementMetric;
  saves: EngagementMetric;
  recommended_actions: string[];
  expected_improvement: string;
}

// =============================
// Image Analysis
// =============================

export interface ImageAnalysis {
  brightness: number | string;
  contrast: number | string;
  sharpness: number | string;
  faces: string;
  composition: string;
  color_harmony?: string;
  suggestions: string[];
  expected_improvement: string;
}

// =============================
// Improvements
// =============================

export interface TopImprovement {
  rank: number;
  title: string;
  why: string;
  how: string;
  impact: string;
  difficulty: string;
  time_required: string;
  stars: number;
}

// =============================
// Explainable AI
// =============================

export interface ExplainableFeature {
  name: string;
  influence: number;
  description: string;
}

// =============================
// AI Coach
// =============================

export interface AIContentCoach {
  current_virality: string;
  projected_virality: string;
  message: string;
}

// =============================
// Final Action Plan
// =============================

export interface FinalActionPlan {
  today: string[];

  expected_results: {
    engagement: string;
    reach: string;
    comments: string;
    shares: string;
    virality_from: string;
    virality_to: string;
  };
}

// =============================
// Recommendation Report
// =============================

export interface RecommendationData {
  overall_content_score?: number;

  category: string;
  ai_reasoning: string;

  strengths: string[];
  weaknesses: string[];

  caption_analysis: CaptionAnalysis;

  suggested_hashtags: HashtagAnalysis;

  posting_time: PostingTimeAnalysis;

  engagement_analysis: EngagementAnalysis;

  image_analysis: ImageAnalysis;

  top_improvements: TopImprovement[];

  ai_content_coach: AIContentCoach;

  explainable_ai: ExplainableFeature[];

  final_action_plan: FinalActionPlan;

  priority_actions?: string[];
}

// =============================
// API Response
// =============================

export interface PredictApiResponse {
  success: boolean;

  prediction: BackendPrediction;

  recommendation_report: RecommendationData;

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