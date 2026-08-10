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