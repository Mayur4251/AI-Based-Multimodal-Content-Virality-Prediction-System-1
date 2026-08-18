import React, { useState } from "react";
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  X,
  Clock,
  Users,
  ThumbsUp,
  MessageSquare,
  Share2,
  Tag,
  Flame,
  ArrowRight,
  Layers,
  CheckCircle2,
  AlertCircle,
  Globe,
  Calendar,
  Zap
} from "lucide-react";
import type { PredictionFormState } from "../types";

interface PredictionFormProps {
  predictionInput: PredictionFormState;
  onInputChange: React.Dispatch<React.SetStateAction<PredictionFormState>>;
  onRunPrediction: () => void;
  onResetInput?: () => void;
  loading: boolean;
  isSyncing?: boolean;
  error: string;
}

const PLATFORMS = [
  { id: "Instagram", name: "Instagram", icon: "📸", desc: "Reels & Carousels" },
  { id: "Twitter / X", name: "Twitter / X", icon: "🐦", desc: "Threads & Posts" },
  { id: "LinkedIn", name: "LinkedIn", icon: "💼", desc: "Thought Leadership" },
  { id: "Facebook", name: "Facebook", icon: "👥", desc: "Feeds & Reels" },
];

const CATEGORIES = [
  "Lifestyle",
  "Technology",
  "Fitness",
  "Education",
  "Travel",
  "Business",
  "Entertainment",
  "Finance",
  "Gaming",
  "Fashion"
];

const DAYS = [
  { id: 1, name: "Mon", full: "Monday" },
  { id: 2, name: "Tue", full: "Tuesday" },
  { id: 3, name: "Wed", full: "Wednesday" },
  { id: 4, name: "Thu", full: "Thursday" },
  { id: 5, name: "Fri", full: "Friday" },
  { id: 6, name: "Sat", full: "Saturday" },
  { id: 0, name: "Sun", full: "Sunday" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const ampm = i >= 12 ? "PM" : "AM";
  const displayHour = i % 12 === 0 ? 12 : i % 12;
  const isPeak = i === 9 || i === 13 || i === 18 || i === 19 || i === 20 || i === 21;
  return {
    hour: i,
    label12: `${displayHour}:00 ${ampm} IST`,
    isPeak,
  };
});

const QUICK_TIME_PRESETS = [
  { hour: 9, label: "09:00 AM IST", tag: "Morning Hook", icon: "🌅" },
  { hour: 13, label: "01:00 PM IST", tag: "Midday Break", icon: "☀️" },
  { hour: 19, label: "07:00 PM IST", tag: "Peak Evening 🔥", icon: "🌆" },
  { hour: 21, label: "09:00 PM IST", tag: "Late Night", icon: "🌙" },
];

const PRESET_TEMPLATES = [
  {
    title: "🚀 AI Tech Launch",
    platform: "Instagram",
    category: "Technology",
    caption: "We spent 6 months building an AI tool that predicts virality before you post. Here is the exact breakdown of how multimodal models process your image contrast, caption hooks, and posting timing. Drop a comment for early access! 👇",
    keywords: "ai, tech, virality, machine learning, startup, launch",
    hashtags: "#AITools #TechInnovation #BuildInPublic #CreatorEconomy #ViralHack",
    followers: 12500,
    likes: 340,
    comments: 48,
    shares: 22,
    post_hour: 18,
    day_of_week: 1,
  },
  {
    title: "💡 Career Growth Hack",
    platform: "LinkedIn",
    category: "Business",
    caption: "I interviewed 50+ VP of Product candidates this quarter. 90% made the exact same resume mistake on page 1. Here is the single line change that doubled callback rates:",
    keywords: "career, resume, product management, hiring, jobs, leadership",
    hashtags: "#CareerAdvice #ProductManagement #Leadership #Jobs #ResumeTips",
    followers: 8200,
    likes: 420,
    comments: 64,
    shares: 35,
    post_hour: 12,
    day_of_week: 2,
  },
  {
    title: "✨ Creative Thread",
    platform: "Twitter / X",
    category: "Lifestyle",
    caption: "10 simple habits that save 15+ hours every single week. A thread 🧵👇",
    keywords: "productivity, habits, lifestyle, time management, growth",
    hashtags: "#Productivity #LifeHacks #PersonalGrowth #TimeManagement",
    followers: 24000,
    likes: 890,
    comments: 135,
    shares: 90,
    post_hour: 17,
    day_of_week: 3,
  }
];

export default function PredictionForm({
  predictionInput,
  onInputChange,
  onRunPrediction,
  onResetInput,
  loading,
  isSyncing = false,
  error,
}: PredictionFormProps) {
  const [dragActive, setDragActive] = useState(false);

  const updateField = (
    field: keyof PredictionFormState,
    value: string | number | File | null
  ) => {
    onInputChange((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleClearInputs = () => {
    if (onResetInput) {
      onResetInput();
    } else {
      onInputChange({
        caption: "",
        post_hour: 18,
        day_of_week: 1,
        follower_count: 5000,
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
      });
    }
  };

  const handleApplyPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    onInputChange((prev) => ({
      ...prev,
      platform: preset.platform,
      content_category: preset.category,
      caption: preset.caption,
      keywords: preset.keywords,
      hashtags: preset.hashtags,
      follower_count: preset.followers,
      early_likes: preset.likes,
      early_comments: preset.comments,
      early_shares: preset.shares,
      post_hour: preset.post_hour,
      day_of_week: preset.day_of_week,
    }));
  };

  const handleFileChange = (file: File | null) => {
    updateField("image", file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const currentHourInfo = HOURS.find((h) => h.hour === predictionInput.post_hour) || HOURS[18];

  const hasNoInput = !predictionInput.caption.trim() && !predictionInput.image;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner - Clean Standard Layout */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 md:p-7 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-semibold text-purple-300 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Multimodal Virality Engine</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Content Virality Predictor
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Provide a post caption or thumbnail image along with target platform and timing parameters to compute AI virality prediction.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleApplyPreset(PRESET_TEMPLATES[0])}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium text-zinc-200 transition"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Fill Sample Post</span>
            </button>

            {(!hasNoInput || predictionInput.caption) && (
              <button
                type="button"
                onClick={handleClearInputs}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium text-red-400 hover:text-red-300 transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear Form</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-950/70 border border-red-800 p-4 text-red-200 text-sm flex items-start gap-3 shadow-md animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-red-100 block">Input Required Before Prediction</span>
            <p className="text-xs text-red-200 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Main Input Form */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-6 shadow-sm">

        {/* 1. Target Distribution Platform */}
        <div>
          <label className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-purple-400" />
            Target Platform
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PLATFORMS.map((p) => {
              const active = predictionInput.platform === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => updateField("platform", p.id)}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all ${
                    active
                      ? "border-purple-500 bg-purple-950/40 text-white shadow-sm"
                      : "border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/60 text-zinc-400"
                  }`}
                >
                  <span className="text-2xl mb-1">{p.icon}</span>
                  <span className="text-xs font-semibold">{p.name}</span>
                  <span className="text-[10px] text-zinc-500">{p.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Media Upload Drag & Drop Box */}
        <div>
          <label className="text-sm font-semibold text-zinc-200 flex items-center justify-between mb-2">
            <span className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-purple-400" />
              Image <span className="text-red-400 font-bold">*</span>
            </span>
            <span className="text-xs text-red-400/90 font-mono">Mandatory for visual AI analysis</span>
          </label>

          {!predictionInput.image ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border border-dashed rounded-xl p-6 text-center transition-all ${
                error && !predictionInput.image
                  ? "border-red-500 bg-red-950/20"
                  : dragActive
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-zinc-700 bg-zinc-950/60 hover:border-zinc-600"
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  handleFileChange(e.target.files ? e.target.files[0] : null)
                }
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-purple-400">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-zinc-300">
                  Drag and drop image here, or <span className="text-purple-400 underline">browse file</span>
                </p>
                <p className="text-[11px] text-zinc-500">
                  Supports JPG, PNG, WEBP, GIF up to 10MB
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 overflow-hidden">
                <img
                  src={URL.createObjectURL(predictionInput.image)}
                  alt="Upload Preview"
                  className="w-16 h-12 object-cover rounded-lg border border-zinc-800"
                />
                <div className="truncate">
                  <p className="text-xs font-semibold text-white truncate max-w-xs">
                    {predictionInput.image.name}
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    {(predictionInput.image.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleFileChange(null)}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* 3. Post Caption Copy */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            Post Caption Copy <span className="text-purple-400 text-xs font-normal">(Caption is required *)</span>
          </label>

          <textarea
            rows={4}
            value={predictionInput.caption}
            onChange={(e) => updateField("caption", e.target.value)}
            placeholder="Write or paste your post copy here (e.g. caption hook, key details, call to action)..."
            className={`w-full rounded-xl bg-zinc-950 border p-3 text-white placeholder-zinc-600 focus:outline-none text-sm leading-relaxed transition ${
              error && hasNoInput
                ? "border-red-500 focus:border-red-400 bg-red-950/10"
                : "border-zinc-800 focus:border-purple-500"
            }`}
          />

          <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
            <span>
              Length: {predictionInput.caption.length} chars • Words: {predictionInput.caption.trim().split(/\s+/).filter(Boolean).length}
            </span>
            <span>Recommended: 60 - 120 words</span>
          </div>
        </div>

        {/* 4. Category Selection */}
        <div>
          <label className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-purple-400" />
            Content Category
          </label>
          <select
            value={predictionInput.content_category}
            onChange={(e) => updateField("content_category", e.target.value)}
            className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-white text-sm focus:border-purple-500 focus:outline-none"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* 5. PUBLISHING SCHEDULE & TIME (IST) */}
        <div className="pt-4 border-t border-zinc-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                Publishing Schedule (Indian Standard Time - IST)
              </label>
              <p className="text-xs text-zinc-400 mt-0.5">
                Select target day and posting hour in Indian Standard Time (IST).
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-950/60 border border-purple-800/60 text-xs font-mono font-medium text-purple-200">
              <span>{currentHourInfo.label12}</span>
              {currentHourInfo.isPeak && (
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 font-bold bg-amber-500/20 px-1.5 py-0.5 rounded">
                  <Zap className="w-3 h-3 fill-amber-300" /> PEAK IST
                </span>
              )}
            </div>
          </div>

          {/* Day of Week Selector */}
          <div>
           <label className="flex items-center gap-1 mb-2 text-xs font-medium text-zinc-400">
              <Calendar className="w-3.5 h-3.5 text-purple-400" /> Day of Week
            </label>
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS.map((d) => {
                const active = predictionInput.day_of_week === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => updateField("day_of_week", d.id)}
                    className={`py-2 px-1 rounded-lg border text-center transition text-xs font-medium ${
                      active
                        ? "border-purple-500 bg-purple-950/60 text-white font-semibold shadow-sm"
                        : "border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    <span>{d.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Indian Peak Time Presets */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              Popular Peak Indian Time Slots
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {QUICK_TIME_PRESETS.map((p) => {
                const active = predictionInput.post_hour === p.hour;
                return (
                  <button
                    key={p.hour}
                    type="button"
                    onClick={() => updateField("post_hour", p.hour)}
                    className={`p-2.5 rounded-lg border flex items-center gap-2 text-left transition ${
                      active
                        ? "border-purple-500 bg-purple-950/50 text-white shadow-sm"
                        : "border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/60 text-zinc-300"
                    }`}
                  >
                    <span className="text-base">{p.icon}</span>
                    <div>
                      <span className="text-xs font-bold block leading-tight">{p.label}</span>
                      <span className="text-[10px] text-zinc-400 block">{p.tag}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clean Hour Select Dropdown */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Select Custom Time (IST)
            </label>
            <select
              value={predictionInput.post_hour}
              onChange={(e) => updateField("post_hour", Number(e.target.value))}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-white text-xs font-medium focus:border-purple-500 focus:outline-none"
            >
              {HOURS.map((h) => (
                <option key={h.hour} value={h.hour}>
                  {h.label12} {h.isPeak ? "🔥 (Peak Engagement Slot)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 6. Keywords & Hashtags */}
        <div>
          <label className="text-sm font-semibold text-zinc-200 flex items-center justify-between mb-2">
            <span className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-purple-400" />
              Keywords & Hashtags <span className="text-red-400 font-bold">*</span>
            </span>
            <span className="text-xs text-red-400/90 font-mono">Mandatory field</span>
          </label>
          <input
            type="text"
            placeholder="e.g. #viral #creator, tech, growth, ai, startup"
            value={predictionInput.keywords || predictionInput.hashtags}
            onChange={(e) => {
              updateField("keywords", e.target.value);
              updateField("hashtags", e.target.value);
            }}
            className={`w-full rounded-xl bg-zinc-950 border p-3 text-white text-sm placeholder-zinc-600 focus:outline-none transition ${
              error && !predictionInput.keywords.trim() && !predictionInput.hashtags.trim()
                ? "border-red-500 focus:border-red-400 bg-red-950/10"
                : "border-zinc-800 focus:border-purple-500"
            }`}
          />
        </div>

        {/* 7. Account Followers & Post-Publish Engagement (optional) */}
        <div className="pt-4 border-t border-zinc-800 space-y-3">
          <label className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            Account Followers & Early Engagement
          </label>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Followers Count
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={predictionInput.follower_count === 0 ? "" : predictionInput.follower_count}
                onChange={(e) => {
                  const val = e.target.value;
                  updateField("follower_count", val === "" ? 0 : Math.max(0, parseInt(val, 10) || 0));
                }}
                className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-sm text-white focus:border-purple-500 focus:outline-none placeholder-zinc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1 flex items-center gap-1">
                <ThumbsUp className="w-3 h-3 text-purple-400" />
                Early Likes
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={predictionInput.early_likes === 0 ? "" : predictionInput.early_likes}
                onChange={(e) => {
                  const val = e.target.value;
                  updateField("early_likes", val === "" ? 0 : Math.max(0, parseInt(val, 10) || 0));
                }}
                className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-sm text-white focus:border-purple-500 focus:outline-none placeholder-zinc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1 flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-purple-400" />
                Early Comments
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={predictionInput.early_comments === 0 ? "" : predictionInput.early_comments}
                onChange={(e) => {
                  const val = e.target.value;
                  updateField("early_comments", val === "" ? 0 : Math.max(0, parseInt(val, 10) || 0));
                }}
                className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-sm text-white focus:border-purple-500 focus:outline-none placeholder-zinc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1 flex items-center gap-1">
                <Share2 className="w-3 h-3 text-purple-400" />
                Early Shares
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={predictionInput.early_shares === 0 ? "" : predictionInput.early_shares}
                onChange={(e) => {
                  const val = e.target.value;
                  updateField("early_shares", val === "" ? 0 : Math.max(0, parseInt(val, 10) || 0));
                }}
                className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-sm text-white focus:border-purple-500 focus:outline-none placeholder-zinc-500"
              />
            </div>
          </div>
        </div>

        {/* 8. Action Button */}
        <button
          type="button"
          onClick={onRunPrediction}
          disabled={loading}
          className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 py-3.5 font-bold text-white transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Analyzing Virality...</span>
            </>
          ) : isSyncing ? (
            <>
              <div className="w-4 h-4 border-2 border-purple-200 border-t-transparent rounded-full animate-spin" />
              <span>Real-Time AI Syncing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-purple-200" />
              <span>Run AI Virality Prediction</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

      </div>
    </div>
  );
}
