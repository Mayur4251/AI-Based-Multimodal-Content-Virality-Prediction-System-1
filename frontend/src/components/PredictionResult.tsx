import React, { useState } from "react";
import type {
  BackendPrediction,
  RecommendationData,
  PredictionFormState,
  PredictedImpact,
} from "../types";

interface PredictionResultProps {
  prediction: BackendPrediction;
  recommendationReport?: RecommendationData;
  predictionInput?: PredictionFormState;
  onInputChange?: React.Dispatch<React.SetStateAction<PredictionFormState>>;
}

/**
 * Parses a window string like "6:00 PM – 9:00 PM" and returns the start
 * hour in 24-hour time (18 for the example above). Returns null if the
 * string doesn't match the expected format rather than guessing.
 */
function parseWindowStartHour(window: string | undefined): number | null {
  if (!window) return null;
  const match = window.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const period = match[3].toUpperCase();
  if (period === "AM") {
    hour = hour === 12 ? 0 : hour;
  } else {
    hour = hour === 12 ? 12 : hour + 12;
  }
  return hour;
}

/**
 * A suggestion is only ever safe to offer/apply if the backend either
 * hasn't verified it yet (impact undefined -- the score-variant endpoint
 * can fail silently, a deliberate non-blocking failure mode) or has
 * verified it and the score genuinely goes up (or stays flat).
 *
 * This is the single gate that guarantees "applying a suggestion only
 * increases the score": nothing downstream renders an Apply button
 * unless this returns true. A verified negative impact is not shown
 * with a warning color anymore -- it's withheld entirely, because a
 * suggestion this app knows will hurt the score isn't a suggestion.
 */
function isSafeToOffer(impact: PredictedImpact | undefined): boolean {
  if (!impact) return true; // unverified -- best effort, same as before this feature existed
  return impact.delta_points >= 0;
}

/**
 * Weakness strings (from recommendation_engine.py) that are all resolved
 * by the SAME fix -- rewriting the caption. These get grouped into one
 * consolidated suggestion box instead of one identical box per weakness.
 */
const CAPTION_WEAKNESS_PATTERNS = [
  "caption is very short",
  "caption is somewhat short",
  "no direct question",
  "no clear call-to-action",
  "no emoji was detected",
  "more personal context",
];

function isCaptionWeakness(weakness: string): boolean {
  const w = weakness.toLowerCase();
  return CAPTION_WEAKNESS_PATTERNS.some((p) => w.includes(p));
}

/**
 * Maps a non-caption weakness string to a suggested fix + an apply action
 * that updates the actual form field it refers to. Returns null (no
 * suggestion offered) both when there's genuinely nothing to suggest AND
 * when the backend has verified the suggestion would lower the score --
 * see isSafeToOffer. Caption-related weaknesses are handled separately
 * as a single grouped suggestion (see isCaptionWeakness / the grouped
 * block in the Weaknesses card). Engagement-related weaknesses (no
 * shares/saves/comments recorded, low reach) don't get a suggestion at
 * all -- there's no legitimate value to auto-fill for those without
 * fabricating post-publish data.
 */
function getSuggestion(
  weakness: string,
  suggestedHashtags: RecommendationData["suggested_hashtags"] | undefined,
  postingTime: RecommendationData["posting_time"] | undefined,
  predictionInput: PredictionFormState | undefined,
  onInputChange: React.Dispatch<React.SetStateAction<PredictionFormState>> | undefined
): { text: string; apply: () => void } | null {
  if (!onInputChange || !predictionInput) return null;

  const w = weakness.toLowerCase();

  if (w.includes("hashtag(s) detected") && suggestedHashtags?.recommended?.length) {
    if (!isSafeToOffer(suggestedHashtags.predicted_impact)) return null;
    const tags = suggestedHashtags.recommended.join(", ");
    return {
      text: `Use: ${tags}`,
      apply: () =>
        onInputChange((prev) => ({
          ...prev,
          hashtags: tags,
          keywords: tags,
        })),
    };
  }

  if (w.includes("posting time") && w.includes("outside")) {
    if (!isSafeToOffer(postingTime?.predicted_impact)) return null;
    const startHour = parseWindowStartHour(postingTime?.recommended_window);
    if (startHour !== null) {
      const label12 =
        startHour === 0
          ? "12:00 AM"
          : startHour < 12
          ? `${startHour}:00 AM`
          : startHour === 12
          ? "12:00 PM"
          : `${startHour - 12}:00 PM`;
      return {
        text: `Set posting time to ${label12} (start of ${postingTime?.recommended_window})`,
        apply: () =>
          onInputChange((prev) => ({ ...prev, post_hour: startHour })),
      };
    }
  }

  return null;
}

export default function PredictionResult({
  prediction,
  recommendationReport,
  predictionInput,
  onInputChange,
}: PredictionResultProps) {
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set());

  // ---------------------------------------------------------
  // CORE SCORE (from the real trained ML model)
  // ---------------------------------------------------------

  const viralityScore = Number(prediction?.viral_probability ?? 0) * 100;

  const report = recommendationReport;

  const captionAnalysis = report?.caption_analysis;
  const suggestedHashtags = report?.suggested_hashtags;
  const postingTime = report?.posting_time;
  const engagement = report?.engagement_analysis ?? null; // null = no post-publish data supplied
  const imageAnalysis = report?.image_analysis;
  const topImprovements = report?.top_improvements ?? [];
  const explainableAI = report?.explainable_ai ?? [];
  const strengths = report?.strengths ?? [];
  const weaknesses = report?.weaknesses ?? [];
  const aiCoach = report?.ai_content_coach;

  const gaugeDegrees = Math.min(Math.max(viralityScore, 0), 100) * 3.6;

  const handleApply = (key: string, applyFn: () => void) => {
    applyFn();
    setAppliedKeys((prev) => new Set(prev).add(key));
  };

  const captionWeaknesses = weaknesses.filter(isCaptionWeakness);
  const otherWeaknesses = weaknesses
    .map((w, i) => ({ w, i }))
    .filter(({ w }) => !isCaptionWeakness(w));

  // Gate the three standalone "use this" buttons the same way -- a
  // verified-negative suggestion never gets an apply path anywhere in
  // this component, not just inside the Weaknesses card.
  const captionSuggestionSafe = isSafeToOffer(captionAnalysis?.predicted_impact);
  const hashtagSuggestionSafe = isSafeToOffer(suggestedHashtags?.predicted_impact);

  return (
    <section className="mt-8 space-y-5">

      {/* HEADER */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <h2 className="text-lg font-bold text-white">
            Multimodal Virality Predictor
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Real prediction from the trained ML model, with recommendations
          based on your actual input.
        </p>
      </div>

      {/* SCORE + AI REASONING */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        <div className="rounded-xl border border-slate-800 bg-[#111119] p-6">
          <div className="flex flex-col items-center justify-center">
            <div
              className="relative flex h-32 w-32 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(${getScoreColor(viralityScore)} ${gaugeDegrees}deg, #262632 ${gaugeDegrees}deg)`,
              }}
            >
              <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-[#111119]">
                <span className="text-3xl font-bold text-white">
                  {viralityScore.toFixed(1)}
                </span>
                <span className="text-[8px] uppercase tracking-widest text-slate-500">
                  VIRALITY SCORE
                </span>
              </div>
            </div>

            <div className={`mt-3 text-xs font-bold ${getScoreClass(viralityScore)}`}>
  {getScoreLabel(viralityScore)}
</div>

<div
  className={`mt-2 flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
    viralityScore >= 50
      ? "border-emerald-700/50 bg-emerald-950/30 text-emerald-300"
      : "border-red-700/50 bg-red-950/30 text-red-300"
  }`}
>
  <span
    className={`h-1.5 w-1.5 rounded-full ${
      viralityScore >= 50 ? "bg-emerald-400" : "bg-red-400"
    }`}
  />
  {viralityScore >= 50 ? "Predicted Viral" : "Predicted Not Viral"}
</div>
          </div>
        </div>

        <div className="xl:col-span-2 rounded-xl border border-slate-800 bg-[#111119] p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-purple-400">
              AI Reasoning
            </h3>
            {report && (
              <div className="flex flex-wrap justify-end gap-1.5">
                {report.category && (
                  <span className="rounded-full border border-slate-700/50 bg-slate-900/40 px-2 py-0.5 text-[9px] capitalize text-slate-400">
                    {report.category}
                  </span>
                )}
                {report.platform && (
                  <span className="rounded-full border border-slate-700/50 bg-slate-900/40 px-2 py-0.5 text-[9px] text-slate-400">
                    {report.platform}
                  </span>
                )}
                {report.media_type && (
                  <span className="rounded-full border border-slate-700/50 bg-slate-900/40 px-2 py-0.5 text-[9px] capitalize text-slate-400">
                    {report.media_type}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="text-xs leading-6 text-slate-300">
            {report?.ai_reasoning || "No reasoning available yet."}
          </div>
        </div>

      </div>

      {/* STRENGTHS + WEAKNESSES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <div className="rounded-xl border border-slate-800 bg-[#111119] p-5">
          <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
            Strengths
          </h3>
          <div className="space-y-3">
            {strengths.length > 0 ? (
              strengths.map((s, i) => (
                <div key={i} className="flex gap-2 text-xs text-slate-300">
                  <span className="text-emerald-400">✓</span>
                  <span>{s}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">No strengths identified yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#111119] p-5">
          <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-yellow-400">
            Weaknesses
          </h3>
          <div className="space-y-3">
            {weaknesses.length > 0 ? (
              <>
                {/* Caption-related weaknesses: grouped under one shared fix,
                    since a single rewrite resolves all of them at once.
                    The fix box only renders when it's safe to offer --
                    see isSafeToOffer -- otherwise the weaknesses still
                    list, just without a rewrite attached. */}
                {captionWeaknesses.length > 0 && (() => {
                  const key = "caption-group";
                  const applied = appliedKeys.has(key);
                  const suggested = captionAnalysis?.ai_suggested_caption;
                  const safe = captionSuggestionSafe;

                  return (
                    <div className="space-y-1.5">
                      {captionWeaknesses.map((w, i) => (
                        <div key={i} className="flex gap-2 text-xs text-slate-300">
                          <span className="text-red-400 shrink-0">✕</span>
                          <span>{w}</span>
                        </div>
                      ))}

                      {suggested && safe && onInputChange && predictionInput && (
                        <div className="ml-5 rounded-lg bg-[#191923] border border-slate-800 p-2.5">
                          <p className="text-[9px] uppercase text-slate-500 mb-1">
                            One rewrite fixes all {captionWeaknesses.length} of the above
                          </p>
                          <p className="text-[11px] leading-5 text-emerald-300 whitespace-pre-line">
                            {suggested}
                          </p>
                          <button
                            type="button"
                            disabled={applied}
                            onClick={() =>
                              handleApply(key, () =>
                                onInputChange((prev) => ({ ...prev, caption: suggested }))
                              )
                            }
                            className={`mt-2 rounded-md px-2.5 py-1 text-[10px] font-semibold transition ${
                              applied
                                ? "bg-emerald-950/40 text-emerald-400 cursor-default"
                                : "bg-purple-600 hover:bg-purple-500 text-white"
                            }`}
                          >
                            {applied ? "✓ Applied" : "Apply Suggestion"}
                          </button>
                        </div>
                      )}

                      {suggested && !safe && (
                        <p className="ml-5 text-[10px] leading-5 text-slate-500">
                          No caption rewrite currently improves the score enough to
                          recommend one -- your current caption is being kept.
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Non-caption weaknesses: one suggestion each, withheld
                    entirely (via getSuggestion -> isSafeToOffer) when the
                    verified impact is negative. */}
                {otherWeaknesses.map(({ w, i }) => {
                  const suggestion = getSuggestion(
                    w,
                    suggestedHashtags,
                    postingTime,
                    predictionInput,
                    onInputChange
                  );
                  const key = `w-${i}`;
                  const applied = appliedKeys.has(key);

                  return (
                    <div key={key} className="space-y-1.5">
                      <div className="flex gap-2 text-xs text-slate-300">
                        <span className="text-red-400 shrink-0">✕</span>
                        <span>{w}</span>
                      </div>

                      {suggestion && (
                        <div className="ml-5 rounded-lg bg-[#191923] border border-slate-800 p-2.5">
                          <p className="text-[11px] leading-5 text-emerald-300 whitespace-pre-line">
                            {suggestion.text}
                          </p>
                          <button
                            type="button"
                            disabled={applied}
                            onClick={() => handleApply(key, suggestion.apply)}
                            className={`mt-2 rounded-md px-2.5 py-1 text-[10px] font-semibold transition ${
                              applied
                                ? "bg-emerald-950/40 text-emerald-400 cursor-default"
                                : "bg-purple-600 hover:bg-purple-500 text-white"
                            }`}
                          >
                            {applied ? "✓ Applied" : "Apply Suggestion"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            ) : (
              <p className="text-xs text-slate-500">No weaknesses identified yet.</p>
            )}
          </div>
        </div>

      </div>

      {/* AI CONTENT COACH */}
      {aiCoach && (
        <div className="rounded-xl border border-purple-800/50 bg-[#171329] p-5">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-purple-400">
            AI Content Coach
          </h3>
          <p className="text-xs leading-6 text-slate-300">{aiCoach.message}</p>
          <div className="mt-4 rounded-lg bg-[#111119] p-3 inline-block">
            <div className="text-[9px] uppercase text-slate-500">Current Virality</div>
            <div className="mt-1 text-lg font-bold text-emerald-400">
              {aiCoach.current_virality}
            </div>
          </div>
        </div>
      )}

      {/* CAPTION ANALYSIS */}
      {captionAnalysis && (
        <div className="rounded-xl border border-slate-800 bg-[#111119] p-5">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
            Caption Analysis
          </h3>

          <div className="mt-4 rounded-lg bg-[#191923] p-3">
            <div className="text-[9px] uppercase text-slate-500">Current Caption</div>
            <p className="mt-2 text-xs leading-5 text-slate-300">
              {captionAnalysis.current_caption || "(empty)"}
            </p>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div>
                <div className="text-[9px] text-slate-500">Words</div>
                <div className="text-sm font-bold text-white">
                  {captionAnalysis.word_count}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-slate-500">Characters</div>
                <div className="text-sm font-bold text-white">
                  {captionAnalysis.char_count}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-slate-500">Score</div>
                <div className="text-sm font-bold text-cyan-400">
                  {captionAnalysis.current_score}/100
                </div>
              </div>
            </div>

            <div className="mt-2 text-[9px] text-slate-500">
              Recommended length: {captionAnalysis.recommended_length}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge active={captionAnalysis.has_question} label="Has question" />
              <Badge active={captionAnalysis.has_cta} label="Has CTA" />
              <Badge active={captionAnalysis.has_emoji} label="Has emoji" />
            </div>
          </div>

          {captionAnalysis.ai_suggested_caption && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] uppercase text-slate-500">
                  Suggested Rewrite
                </p>
                {onInputChange && predictionInput && captionSuggestionSafe && (
                  <button
                    type="button"
                    onClick={() =>
                      onInputChange((prev) => ({
                        ...prev,
                        caption: captionAnalysis.ai_suggested_caption,
                      }))
                    }
                    className="rounded-md px-2.5 py-1 text-[10px] font-semibold transition bg-purple-600 hover:bg-purple-500 text-white"
                  >
                    Use This Caption
                  </button>
                )}
              </div>
              <div className="rounded-xl bg-[#191923] p-4">
                <p className="text-xs leading-6 text-slate-300 whitespace-pre-line">
                  {captionAnalysis.ai_suggested_caption}
                </p>
                {!captionSuggestionSafe && (
                  <p className="mt-2 text-[10px] leading-5 text-slate-500">
                    The model already favors your current caption over this rewrite,
                    so it isn't offered as an apply-able suggestion.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* HASHTAGS + POSTING TIME */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {suggestedHashtags && (
          <div className="rounded-xl border border-slate-800 bg-[#111119] p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-pink-400">
                Suggested Hashtags
              </h3>
              {onInputChange && predictionInput && suggestedHashtags.recommended.length > 0 && hashtagSuggestionSafe && (
                <button
                  type="button"
                  onClick={() =>
                    onInputChange((prev) => ({
                      ...prev,
                      hashtags: suggestedHashtags.recommended.join(", "),
                      keywords: suggestedHashtags.recommended.join(", "),
                    }))
                  }
                  className="rounded-md px-2.5 py-1 text-[10px] font-semibold transition bg-purple-600 hover:bg-purple-500 text-white"
                >
                  Use These
                </button>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {suggestedHashtags.recommended.length > 0 ? (
                suggestedHashtags.recommended.map((tag, i) => (
                  <span
                    key={i}
                    className="rounded-md border border-pink-700/50 bg-pink-950/20 px-2 py-1 text-[10px] text-pink-300"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">No hashtags generated.</span>
              )}
            </div>
            {!hashtagSuggestionSafe && suggestedHashtags.recommended.length > 0 && (
              <p className="mt-2 text-[10px] leading-5 text-slate-500">
                The model already favors your current hashtags over this set, so
                it isn't offered as an apply-able suggestion.
              </p>
            )}
            {suggestedHashtags.reason && (
              <p className="mt-3 text-[10px] leading-5 text-slate-500">
                {suggestedHashtags.reason}
              </p>
            )}
          </div>
        )}

        {postingTime && (
          <div className="rounded-xl border border-slate-800 bg-[#111119] p-5">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-orange-400">
              Posting Time
            </h3>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-white">
                  {postingTime.current_time}
                </div>
                <div className="mt-1 text-[10px] text-slate-500">
                  {postingTime.recommended_window}
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`text-sm font-bold ${
                    postingTime.performance === "Good"
                      ? "text-emerald-400"
                      : "text-yellow-400"
                  }`}
                >
                  {postingTime.performance}
                </div>
              </div>
            </div>
            {postingTime.reason && (
              <p className="mt-3 text-[10px] leading-5 text-slate-500">
                {postingTime.reason}
              </p>
            )}
          </div>
        )}

      </div>

      {/* ENGAGEMENT ANALYSIS -- forecast panel. Real values render as-is;
          anything the user left blank is filled with a documented estimate
          derived from follower count + virality score, and clearly tagged
          "Estimated" so it's never mistaken for tracked analytics. */}
      {engagement ? (
        <div className="rounded-xl border border-slate-800 bg-[#111119] p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
              Post-Publish Engagement Analysis
            </h3>
            {engagement.has_estimated_values && (
              <span className="text-[9px] rounded-full bg-cyan-950/40 border border-cyan-700/50 text-cyan-300 px-2 py-0.5 whitespace-nowrap">
                Includes forecasted values
              </span>
            )}
          </div>

          {engagement.estimate_note && (
            <p className="mt-2 text-[10px] leading-5 text-slate-500">
              {engagement.estimate_note}
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard title="Followers" value={formatNumber(engagement.followers)} label="Audience Size" />
            <MetricCard
              title="Likes"
              value={formatNumber(engagement.likes.value)}
              label={engagement.likes.status}
              estimated={engagement.likes.estimated}
            />
            <MetricCard
              title="Comments"
              value={formatNumber(engagement.comments.value)}
              label={engagement.comments.status}
              estimated={engagement.comments.estimated}
            />
            <MetricCard
              title="Shares"
              value={formatNumber(engagement.shares.value)}
              label={engagement.shares.status}
              estimated={engagement.shares.estimated}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              title="Saves"
              value={formatNumber(engagement.saves.value)}
              label={engagement.saves.status}
              estimated={engagement.saves.estimated}
            />
            <MetricCard
              title="Reach"
              value={formatNumber(engagement.reach)}
              label="Current Reach"
              estimated={engagement.reach_estimated}
            />
            <MetricCard
              title="Impressions"
              value={formatNumber(engagement.impressions)}
              label="Total Impressions"
              estimated={engagement.impressions_estimated}
            />
            <MetricCard
              title="Engagement Rate"
              value={`${engagement.engagement_rate.toFixed(2)}%`}
              label={
                engagement.engagement_rate_basis === "followers"
                  ? "Relative to followers"
                  : engagement.engagement_rate_basis === "impressions"
                  ? "Relative to impressions"
                  : engagement.engagement_rate_basis === "reach"
                  ? "Relative to reach"
                  : "No data available"
              }
            />
          </div>

          <div className="mt-5">
            <h4 className="mb-2 text-[9px] font-bold uppercase tracking-widest text-amber-400">
              Recommended Actions
            </h4>
            <div className="space-y-2">
              {engagement.recommended_actions.map((action, i) => (
                <div key={i} className="flex gap-2 text-xs text-slate-300">
                  <span className="text-amber-400 shrink-0">→</span>
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-[#111119] p-5">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
            Post-Publish Engagement Analysis
          </h3>
          <p className="mt-3 text-xs text-slate-500">
            Add your follower count (or any early likes/comments/shares) to see a
            forecasted engagement breakdown for this post.
          </p>
        </div>
      )}

      {/* IMAGE ANALYSIS */}
      {imageAnalysis && (
        <div className="rounded-xl border border-slate-800 bg-[#111119] p-5">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
            Image Analysis
          </h3>

          {imageAnalysis.brightness !== undefined ? (
            <>
              <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricCard
                  title="Brightness"
                  value={imageAnalysis.brightness}
                  label={imageAnalysis.brightness_label || ""}
                />
                <MetricCard
                  title="Contrast"
                  value={imageAnalysis.contrast ?? "N/A"}
                  label="Brightness spread"
                />
                <MetricCard
                  title="Saturation"
                  value={imageAnalysis.saturation ?? "N/A"}
                  label={imageAnalysis.saturation_label || ""}
                />
                <MetricCard
                  title="Colorfulness"
                  value={imageAnalysis.colorfulness ?? "N/A"}
                  label="Hasler-Susstrunk metric"
                />
              </div>

              <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricCard
                  title="Sharpness"
                  value={imageAnalysis.sharpness ?? "N/A"}
                  label={imageAnalysis.detail_label || ""}
                />
                <MetricCard
                  title="Tone"
                  value={imageAnalysis.tone ?? "N/A"}
                  label="Warm vs. cool"
                />
                <MetricCard
                  title="Composition"
                  value={imageAnalysis.composition ?? "N/A"}
                  label="Orientation"
                />
                <MetricCard
                  title="Aspect Ratio"
                  value={imageAnalysis.aspect_ratio ?? "N/A"}
                  label="Width / height"
                />
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* TOP IMPROVEMENTS */}
      {topImprovements.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-[#111119] p-5">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-orange-400">
            Top Improvements
          </h3>
          <div className="mt-4 space-y-3">
            {topImprovements.map((imp, i) => (
              <div key={i} className="rounded-xl bg-[#191923] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      {imp.rank}. {imp.title}
                    </h4>
                    <p className="mt-2 text-[11px] leading-5 text-slate-400">{imp.why}</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">{imp.how}</p>
                  </div>
                  <span className="whitespace-nowrap text-[10px] font-bold text-emerald-400 shrink-0">
                    {"★".repeat(imp.stars)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EXPLAINABLE AI */}
      {explainableAI.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-[#111119] p-5">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-purple-400">
            Explainable AI
          </h3>
          <div className="mt-4 space-y-3">
            {explainableAI.map((factor, i) => (
              <div key={i} className="rounded-lg bg-[#191923] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-purple-300">{factor.name}</div>
                  <StatusChip status={factor.status} />
                </div>
                <div className="mt-1 text-[11px] leading-5 text-slate-400">
                  {factor.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </section>
  );
}

/* ========================================================= */

function StatusChip({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Strong: "border-emerald-700/50 bg-emerald-950/30 text-emerald-300",
    Moderate: "border-yellow-700/50 bg-yellow-950/30 text-yellow-300",
    "Needs Attention": "border-red-700/50 bg-red-950/30 text-red-300",
    Informational: "border-slate-700/50 bg-slate-900/40 text-slate-400",
  };

  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
        styles[status] || styles.Informational
      }`}
    >
      {status}
    </span>
  );
}

function Badge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`rounded-md px-2 py-1 text-[10px] border ${
        active
          ? "border-emerald-700/50 bg-emerald-950/20 text-emerald-300"
          : "border-slate-700/50 bg-slate-900/40 text-slate-500"
      }`}
    >
      {active ? "✓" : "✕"} {label}
    </span>
  );
}

interface MetricCardProps {
  title: string;
  value: React.ReactNode;
  label: string;
  // Optional: when true, shows a small "Estimated" tag so a forecasted
  // value (see estimate_missing_engagement in recommendation_engine.py)
  // is never mistaken for tracked/live data. Omit for cards that are
  // never forecasted (e.g. Image Analysis, Followers).
  estimated?: boolean;
}

function MetricCard({ title, value, label, estimated }: MetricCardProps) {
  return (
    <div className="rounded-lg bg-[#191923] p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[9px] uppercase text-slate-500">{title}</div>
        {estimated && (
          <span className="text-[8px] rounded-full bg-cyan-950/40 border border-cyan-700/50 text-cyan-300 px-1.5 py-0.5 whitespace-nowrap">
            Estimated
          </span>
        )}
      </div>
      <div className="mt-2 text-lg font-bold text-white">{value}</div>
      <div className="mt-1 text-[9px] text-slate-500">{label}</div>
    </div>
  );
}

function getScoreLabel(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Strong";
  if (score >= 50) return "Average";
  if (score >= 35) return "Below Average";
  return "Low Potential";
}

function getScoreClass(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 65) return "text-cyan-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

// Hex equivalents of getScoreClass, for the conic-gradient gauge ring
// (Tailwind classes don't apply to inline gradient stops). Kept in sync
// with the same thresholds so the ring color always matches the label
// underneath it -- e.g. an "Average" score no longer renders in the same
// red used for "Low Potential".
function getScoreColor(score: number) {
  if (score >= 80) return "#34d399"; // emerald-400
  if (score >= 65) return "#22d3ee"; // cyan-400
  if (score >= 50) return "#facc15"; // yellow-400
  return "#ef4444"; // red-400
}

function formatNumber(value: any) {
  const number = Number(value);
  if (Number.isNaN(number)) return "0";
  return number.toLocaleString();
}
