import { FeatureItem, FAQItem, PricingTier, Testimonial, ModelMetric, FeatureExtractionTableItem, SoftwareDetailItem, ShapFeature, ConfusionMatrixData, RocCurvePoint, CorrelationItem, PastPredictionHistoryItem } from "./types";

export const MULTIMODAL_TABLE_DATA: FeatureExtractionTableItem[] = [
  {
    modality: "Textual",
    extractedFeature: "Semantic Keywords",
    description: "Extracts the most important words and topics from the post caption.",
    algorithmTool: "TF-IDF Vectorizer"
  },
  {
    modality: "Textual",
    extractedFeature: "Emotional Sentiment",
    description: "Determines if the caption's tone is positive, negative, or neutral.",
    algorithmTool: "VADER / SpaCy"
  },
  {
    modality: "Visual",
    extractedFeature: "Dominant Colors",
    description: "Extracts the primary color palette of the image or video thumbnail.",
    algorithmTool: "K-Means Clustering / OpenCV"
  },
  {
    modality: "Visual",
    extractedFeature: "Object Recognition",
    description: "Identifies specific items (e.g., people, cars, tech) present in the media.",
    algorithmTool: "Pre-trained CNN (ResNet / YOLO)"
  },
  {
    modality: "Metadata",
    extractedFeature: "Temporal Stamp",
    description: "The exact hour and day of the week the content was published.",
    algorithmTool: "Python datetime extraction"
  },
  {
    modality: "Metadata",
    extractedFeature: "Engagement Velocity",
    description: "The rate at which the post receives likes/shares in the first 60 minutes.",
    algorithmTool: "Statistical Rate of Change"
  }
];

export const SOFTWARE_STACK_DATA: SoftwareDetailItem[] = [
  {
    component: "Operating System",
    techStack: "Windows 11 / Ubuntu Linux 22.04 LTS"
  },
  {
    component: "Programming Languages",
    techStack: "Python 3.10+ (Backend/ML), JavaScript / TypeScript (Frontend)"
  },
  {
    component: "Machine Learning Libraries",
    techStack: "Scikit-learn, TensorFlow / Keras (for CNNs), NLTK / SpaCy (for NLP), Pretrained CLIP, CatBoost & MLP"
  },
  {
    component: "Web Framework / Frontend",
    techStack: "Flask or FastAPI (Backend APIs), React with Tailwind CSS (User Interface)"
  },
  {
    component: "Database / Data Storage",
    techStack: "MongoDB, PostgreSQL, or Local CSV data frames for datasets"
  }
];

export const PIPELINE_NODES_DATA = [
  {
    step: "1. Social Media Post Input",
    branches: [
      { input: "Image / Video", processor: "Pretrained CLIP", output: "Visual Features (512-d Vector)" },
      { input: "Text / Caption", processor: "NLP Extractor (TF-IDF & VADER)", output: "Textual Features (258-d Vector)" },
      { input: "Post Time", processor: "Temporal Extractor (datetime)", output: "Time Features (32-d Vector)" },
      { input: "User Data", processor: "User Profiler Engine", output: "User Features (64-d Vector)" }
    ]
  },
  {
    step: "2. Hierarchical 3-Level Fusion Layer",
    description: "Performs Level 1 (Cross-Attention) and Level 2 (Bimodal Weight Concatenation) feature merging across vision, text, temporal, and author embeddings."
  },
  {
    step: "3. Ensemble Classifier Stack",
    description: "Parallel classification via CatBoost Gradient Boosted Trees and Multi-Layer Perceptron (MLP) Neural Network."
  },
  {
    step: "4. Level 3 Meta-Learning Engine",
    description: "Synthesizes CatBoost probability distribution with MLP activation weights to compute final calibrated Virality Prediction Score."
  }
];

export const FEATURE_DATA: FeatureItem[] = [

  {
    title: "Multimodal CNN Analysis",
    description: "Deep visual engine decodes aesthetic composition, lighting, contrast, and focal objects to judge thumb-stop speed.",
    iconName: "Eye",
    glowColor: "from-blue-500 to-cyan-500"
  },
  {
    title: "NLP Hook Optimization",
    description: "Analyze caption typography, sentiment vectors, and character-level hooks that trigger psychological curiosity.",
    iconName: "MessageSquareText",
    glowColor: "from-purple-500 to-pink-500"
  },
  {
    title: "Hashtag Intelligence Matrix",
    description: "Identify high-velocity keyword trends and cluster-niche hashtags that prevent algorithm shadow-throttling.",
    iconName: "Hash",
    glowColor: "from-cyan-400 to-brand-blue"
  },
  {
    title: "Virality Probability Score",
    description: "Our blended neural networks output a definitive index projecting the likelihood of explosive secondary-shares.",
    iconName: "TrendingUp",
    glowColor: "from-violet-500 to-purple-700"
  },
  {
    title: "Explainable AI (XAI)",
    description: "No black boxes here. Receive precise verbal justifications describing which assets are driving the content score.",
    iconName: "Cpu",
    glowColor: "from-brand-pink to-brand-purple"
  },
  {
    title: "Real-time Trend Detection",
    description: "Continuous synchronization with social media algorithmic pipelines to detect active hourly content formats.",
    iconName: "Flame",
    glowColor: "from-amber-400 to-orange-600"
  }
];

export const MODEL_METRIC_DATA: ModelMetric[] = [
  {
    name: "Multimodal Fusion Network (ViralAI)",
    accuracy: 94.2,
    precision: 92.8,
    recall: 93.5,
    f1Score: 93.1
  },
  {
    name: "XGBoost Metaclassifier",
    accuracy: 86.4,
    precision: 85.1,
    recall: 84.7,
    f1Score: 84.9
  },
  {
    name: "Random Forest Regressor",
    accuracy: 79.1,
    precision: 77.8,
    recall: 80.3,
    f1Score: 79.0
  },
  {
    name: "Support Vector Machine (SVM)",
    accuracy: 72.5,
    precision: 73.1,
    recall: 71.8,
    f1Score: 72.4
  }
];

export const TESTIMONIAL_DATA: Testimonial[] = [
  {
    name: "Kyler Jenkins",
    role: "Chief Growth Officer",
    company: "MetaVerse Labs",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80",
    quote: "ViralAI completely gamified our distribution strategy. We uploaded 12 variants of our launch graphic, and the model picked a layout that we dismissed. That single post did 2.3M impressions on Twitter.",
    rating: 5
  },
  {
    name: "Aria Thorne",
    role: "Viral Lead Specialist",
    company: "Framer Brands",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&h=120&q=80",
    quote: "Before ViralAI, publishing was a shot in the dark. Now we know exactly which hook phrases and visual configurations yield 80%+ engagement confidence before clicking post.",
    rating: 5
  },
  {
    name: "Devon Carter",
    role: "Founder & Creative",
    company: "SaaSify",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80",
    quote: "This is hands down the slickest AI-dashboard I've ever experienced. Highly aesthetic visual outputs paired with scary-accurate prediction parameters.",
    rating: 5
  }
];

export const PRICING_DATA: PricingTier[] = [
  {
    name: "Sandbox",
    price: "$0",
    period: "forever",
    description: "Experiment with basic multimodal prediction mechanics.",
    features: [
      "5 multimodal predictions / mo",
      "Standard CNN image analysis",
      "Hashtag lookup matrices",
      "Community Discord access"
    ],
    cta: "Start Predicting Free",
    popular: false
  },
  {
    name: "Growth Pro",
    price: "$49",
    period: "month",
    description: "Designed for scaling creators, marketing teams, and modern startups.",
    features: [
      "Unlimited predictions & runs",
      "Deep ResNet visual processing",
      "Explainable AI feature matrices",
      "Alternative hook generator",
      "Express API integrations",
      "24/7 dedicated support"
    ],
    cta: "Deploy Creator License",
    popular: true
  },
  {
    name: "Enterprise Core",
    price: "$299",
    period: "month",
    description: "For agencies requiring fine-tuned localized models and pipeline feeds.",
    features: [
      "Everything in Growth Pro",
      "Custom weights training",
      "Dedicated sub-second pipeline APIs",
      "Unified Workspace SSO",
      "SLA guarantee of 99.9%"
    ],
    cta: "Initialize Custom Node",
    popular: false
  }
];

export const FAQ_DATA: FAQItem[] = [
  {
    question: "How does the Multimodal Virality Engine work?",
    answer: "Our system breaks down posts into three concurrent data pipelines: a Convolutional Neural Network (CNN) parses visual focal grids for color, contrast, and alignment; an NLP transformer scores emotional arousal of text; and metadata feeds evaluate platform trends. A late-fusion layer aggregates these weights for final score regression."
  },
  {
    question: "Is the prediction specific to individual platforms?",
    answer: "Yes, you can toggle between TikTok, Twitter/X, and Instagram/LinkedIn. The algorithm automatically swaps weights corresponding to unique platform behavioral mechanics—for instance, visual aesthetic density matters more on Instagram, whereas text-hook retention is vital on X."
  },
  {
    question: "How accurate are the virality forecasts?",
    answer: "In audited trials, our model achieves a 94.2% accuracy index predicting whether content will cross standard engagement benchmarks of 10% active velocity within the first 12 hours of publishing."
  },
  {
    question: "Can I connect this to our programmatic advertising platforms?",
    answer: "Yes, our Enterprise tier includes fully documented REST APIs that developers can hook into active programmatic marketing loops to auto-select creative configurations in real time."
  }
];

// Interactive Preset Templates
export interface ImagePreset {
  id: string;
  name: string;
  category: string;
  url: string;
  caption: string;
  hashtags: string;
}

export const SHAP_FEATURE_DATA: ShapFeature[] = [
  {
    featureName: "ResNet50 Visual Contrast",
    modality: "Visual",
    shapValue: +0.28,
    description: "High focal contrast & vibrant lighting stops user scroll speed in <0.3s."
  },
  {
    featureName: "TF-IDF Curiosity Hook",
    modality: "Textual",
    shapValue: +0.22,
    description: "First 5 words contain psychological curiosity trigger vocabulary."
  },
  {
    featureName: "Peak Window Timing (18:30 UTC)",
    modality: "Metadata",
    shapValue: +0.18,
    description: "Content published in primary feed activity surge window."
  },
  {
    featureName: "Initial Engagement Velocity",
    modality: "Metadata",
    shapValue: +0.14,
    description: "First 15-min acceleration rate crosses +25% threshold."
  },
  {
    featureName: "VADER Positive Sentiment Score",
    modality: "Textual",
    shapValue: +0.09,
    description: "Positive arousal polarity encourages organic re-shares."
  },
  {
    featureName: "Excessive Generic Hashtags",
    modality: "Textual",
    shapValue: -0.06,
    description: "Overused broad hashtags reduce niche cluster recommendation boost."
  },
  {
    featureName: "Low Historical Follower Ratio",
    modality: "Metadata",
    shapValue: -0.04,
    description: "Low author authority score slightly dampens initial distribution pool."
  }
];

export const CONFUSION_MATRIX_MOCK: ConfusionMatrixData = {
  actualViralPredictedViral: 4850, // True Positive (88.2%)
  actualViralPredictedNonViral: 650, // False Negative (11.8%)
  actualNonViralPredictedViral: 420, // False Positive (6.8%)
  actualNonViralPredictedNonViral: 5780 // True Negative (93.2%)
};

export const ROC_CURVE_DATA: RocCurvePoint[] = [
  { fpr: 0.00, tpr: 0.00, baseline: 0.00 },
  { fpr: 0.02, tpr: 0.28, baseline: 0.02 },
  { fpr: 0.05, tpr: 0.58, baseline: 0.05 },
  { fpr: 0.09, tpr: 0.78, baseline: 0.09 },
  { fpr: 0.14, tpr: 0.89, baseline: 0.14 },
  { fpr: 0.22, tpr: 0.94, baseline: 0.22 },
  { fpr: 0.35, tpr: 0.97, baseline: 0.35 },
  { fpr: 0.50, tpr: 0.98, baseline: 0.50 },
  { fpr: 0.75, tpr: 0.99, baseline: 0.75 },
  { fpr: 1.00, tpr: 1.00, baseline: 1.00 }
];

export const CORRELATION_MATRIX_DATA: CorrelationItem[] = [
  { featureA: "Visual Aesthetic Score", featureB: "Virality Score", correlation: 0.84 },
  { featureA: "Engagement Velocity", featureB: "Virality Score", correlation: 0.91 },
  { featureA: "TF-IDF Hook Strength", featureB: "Shares Ratio", correlation: 0.79 },
  { featureA: "Posting Time Score", featureB: "Initial Impressions", correlation: 0.72 },
  { featureA: "Follower Count", featureB: "Organic Velocity", correlation: 0.45 },
  { featureA: "Hashtag Count (>8)", featureB: "Virality Score", correlation: -0.28 }
];

export const PAST_PREDICTIONS_HISTORY: PastPredictionHistoryItem[] = [
  {
    id: "9f2b0d1f-75f0-46a5-98e8-caf84ac33d44",
    timestamp: "2026-07-24 04:30",
    platform: "TikTok",
    captionSnippet: "The year is 2042. Artificial Minds represent 90% of global creative outputs...",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80",
    likes: 1250,
    comments: 184,
    shares: 420,
    followers: 48200,
    postingTime: "18:30 UTC",
    viralityScore: 92,
    confidence: 96,
    performanceCategory: "High Viral Potential"
  },
  {
    id: "3c8e1a90-88b2-4d11-b28e-9081bcfa0112",
    timestamp: "2026-07-24 02:15",
    platform: "Instagram",
    captionSnippet: "Deep work sessions fueled by dark ambient loops and cold espresso...",
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80",
    likes: 840,
    comments: 92,
    shares: 110,
    followers: 24100,
    postingTime: "14:00 UTC",
    viralityScore: 84,
    confidence: 93,
    performanceCategory: "High Viral Potential"
  },
  {
    id: "7d92f5bb-11a4-498c-982e-1288ccff8890",
    timestamp: "2026-07-23 21:00",
    platform: "Twitter / X",
    captionSnippet: "Unboxing the first ever liquid-crystal switches. Tactile feedback is unreal...",
    imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80",
    likes: 420,
    comments: 54,
    shares: 68,
    followers: 12500,
    postingTime: "20:15 UTC",
    viralityScore: 78,
    confidence: 91,
    performanceCategory: "Moderate Reach"
  },
  {
    id: "1a88cc42-5509-4112-a192-3390ccbb4411",
    timestamp: "2026-07-23 16:45",
    platform: "YouTube Shorts",
    captionSnippet: "We gaze at stars hoping to find answers, completely unaware that...",
    imageUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=400&q=80",
    likes: 2100,
    comments: 310,
    shares: 890,
    followers: 95000,
    postingTime: "17:00 UTC",
    viralityScore: 95,
    confidence: 97,
    performanceCategory: "Viral Guaranteed"
  }
];

export const PRESET_IMAGES: ImagePreset[] = [
  {
    id: "cyberpunk_nft",
    name: "Cyberpunk NFT NFT Art",
    category: "Web3 / Tech",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    caption: "The year is 2042. Artificial Minds represent 90% of global creative outputs. Do we look backward, or build the next layer?",
    hashtags: "web3, cyberpunk, generativeart, futureoftech"
  },
  {
    id: "aesthetic_desk",
    name: "Minimalist Studio Setup",
    category: "Lifestyle / Dev",
    url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
    caption: "Deep work sessions fueled by dark ambient loops and cold espresso. Rate my developer setup out of 10.",
    hashtags: "minimalist, developer, workspaces, focus"
  },
  {
    id: "neon_tech",
    name: "Holographic Keyboards",
    category: "Hardware / Gaming",
    url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80",
    caption: "Unboxing the first ever liquid-crystal switches. The tactile feedback is absolutely unreal. Full review coming soon.",
    hashtags: "gaming, mechanicalkeyboard, desksetup, techreview"
  },
  {
    id: "future_city",
    name: "Abstract Cyber Skyline",
    category: "Visionary / Space",
    url: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=800&q=80",
    caption: "We gaze at stars hoping to find answers, completely unaware that our ancestors were looking back at us.",
    hashtags: "philosophical, interstellar, cosmology, deepspace"
  }
];
