import React from "react";
import type { BackendPrediction } from "../types";

interface PredictionResultProps {
  prediction: BackendPrediction;
}

/*
  The backend response can evolve over time.
  We keep BackendPrediction as the main type, while allowing
  the component to safely read additional prediction fields.
*/
type PredictionData = BackendPrediction & Record<string, any>;

export default function PredictionResult({
  prediction,
}: PredictionResultProps) {
  const p = prediction as PredictionData;

  // ---------------------------------------------------------
  // BASIC VALUES
  // ---------------------------------------------------------

  const viralityScore = Number(p.viralityScore ?? 0);

  const confidence = Number(p.confidence ?? 0);

  const engagementProbability = Number(
    p.engagementProbability ?? 0
  );

  // ---------------------------------------------------------
  // REAL BACKEND RECOMMENDATION REPORT
  // ---------------------------------------------------------

  const recommendationReport =
    p.recommendationReport ?? {};

  const aiContentCoach =
    recommendationReport.ai_content_coach ?? {};

  const reportEngagement =
    recommendationReport.engagement_analysis ?? {};

  const reportPostingTime =
    recommendationReport.posting_time ??
    recommendationReport.posting_time_analysis ??
    {};

  const reportCaption =
    recommendationReport.caption_analysis ?? {};

  const reportHashtags =
    recommendationReport.hashtag_analysis ??
    recommendationReport.suggested_hashtags ??
    {};

  const reportExplainability =
    recommendationReport.explainability ?? {};

  const reportTopImprovements = Array.isArray(
    recommendationReport.top_improvements
  )
    ? recommendationReport.top_improvements
    : [];

  const reportExplainableAI = Array.isArray(
    recommendationReport.explainable_ai
  )
    ? recommendationReport.explainable_ai
    : [];

  // ---------------------------------------------------------
  // AI CONTENT COACH
  // ---------------------------------------------------------

  const currentVirality =
    typeof aiContentCoach?.current_virality === "string"
      ? aiContentCoach.current_virality
      : `${viralityScore.toFixed(1)}%`;

  const aiCoachMessage =
    typeof aiContentCoach?.message === "string"
      ? aiContentCoach.message
      : "Recommendations are based on the supplied inputs.";

  // ---------------------------------------------------------
  // REACH FORECAST
  // ---------------------------------------------------------

  const reachForecast =
    typeof p.reachForecast === "string"
      ? p.reachForecast
      : "Not available";

  // ---------------------------------------------------------
  // SAFE DISPLAY HELPERS
  // ---------------------------------------------------------

  const getDisplayText = (
    value: any,
    fallback = ""
  ): string => {
    if (typeof value === "string") {
      return value;
    }

    if (
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }

    if (!value || typeof value !== "object") {
      return fallback;
    }

    if (typeof value.message === "string") {
      return value.message;
    }

    if (typeof value.reason === "string") {
      return value.reason;
    }

    if (typeof value.description === "string") {
      return value.description;
    }

    if (typeof value.text === "string") {
      return value.text;
    }

    if (typeof value.title === "string") {
      return value.title;
    }

    return fallback;
  };

  // ---------------------------------------------------------
  // SAFE ARRAYS
  // ---------------------------------------------------------

  const oldExplainableAI: string[] =
    Array.isArray(p.explainableAI)
      ? p.explainableAI
          .map((item: any) =>
            getDisplayText(item)
          )
          .filter(Boolean)
      : [];

  /*
    The new backend explainable_ai can contain objects.
    Convert every item into a safe string before rendering.
  */
  const safeExplainableAI: string[] =
    reportExplainableAI
      .map((item: any) => {
        if (typeof item === "string") {
          return item;
        }

        if (item?.name && item?.reason) {
          return `${item.name}: ${item.reason}`;
        }

        if (item?.title && item?.reason) {
          return `${item.title}: ${item.reason}`;
        }

        if (item?.description) {
          return item.description;
        }

        if (item?.reason) {
          return item.reason;
        }

        if (item?.message) {
          return item.message;
        }

        if (item?.text) {
          return item.text;
        }

        return "";
      })
      .filter(Boolean);

  /*
    Use the new backend explainable AI first.
    Fall back to the older prediction structure.
  */
  const explainableAI: string[] =
    safeExplainableAI.length > 0
      ? safeExplainableAI
      : oldExplainableAI;

  // ---------------------------------------------------------
  // HASHTAGS
  // ---------------------------------------------------------

  const backendRecommendedHashtags =
    Array.isArray(
      reportHashtags?.recommended
    )
      ? reportHashtags.recommended
      : [];

  const oldHashtags: string[] =
    Array.isArray(p.hashtagIntelligence)
      ? p.hashtagIntelligence
          .map((tag: any) =>
            getDisplayText(tag)
          )
          .filter(Boolean)
      : [];

  const hashtags: string[] =
    backendRecommendedHashtags.length > 0
      ? backendRecommendedHashtags
          .map((tag: any) =>
            getDisplayText(tag)
          )
          .filter(Boolean)
      : oldHashtags;

  // ---------------------------------------------------------
  // SUGGESTED HOOKS
  // ---------------------------------------------------------

  const hooks: string[] =
    Array.isArray(p.suggestedHooks)
      ? p.suggestedHooks
          .map((hook: any) =>
            getDisplayText(hook)
          )
          .filter(Boolean)
      : [];

  // ---------------------------------------------------------
  // TEXTUAL FEATURES
  // ---------------------------------------------------------

  const textualFeatures =
    p.textualFeatures ?? {};

  const semanticKeywords = Array.isArray(
    textualFeatures.semanticKeywords
  )
    ? textualFeatures.semanticKeywords
    : [];

  const sentiment =
    textualFeatures.sentiment ?? {};

  const sentimentLabel =
    sentiment.label ?? "Not available";

  const compoundScore = Number(
    sentiment.compoundScore ?? 0
  );

  const positiveScore = Number(
    sentiment.positiveScore ?? 0
  );

  const neutralScore = Number(
    sentiment.neutralScore ?? 0
  );

  const negativeScore = Number(
    sentiment.negativeScore ?? 0
  );

  // ---------------------------------------------------------
  // CAPTION ANALYSIS FROM BACKEND
  // ---------------------------------------------------------

  const captionWordCount = Number(
    reportCaption?.word_count ?? 0
  );

  const captionCharCount = Number(
    reportCaption?.char_count ?? 0
  );

  const captionScore = Number(
    reportCaption?.current_score ?? 0
  );

  const captionRecommendedLength =
    reportCaption?.recommended_length ??
    "18–30 words";

  // ---------------------------------------------------------
  // VISUAL FEATURES
  // ---------------------------------------------------------

  const visualFeatures =
    p.visualFeatures ?? {};

  const dominantColors = Array.isArray(
    visualFeatures.dominantColors
  )
    ? visualFeatures.dominantColors
    : [];

  const detectedObjects = Array.isArray(
    visualFeatures.detectedObjects
  )
    ? visualFeatures.detectedObjects
    : [];

  const clipEmbeddingDimension =
    visualFeatures.clipEmbeddingDimension ??
    "N/A";

  // ---------------------------------------------------------
  // METADATA
  // ---------------------------------------------------------

  const metadataFeatures =
    p.metadataFeatures ?? {};

  const temporalStamp =
    metadataFeatures.temporalStamp ?? {};

  const engagementVelocity =
    metadataFeatures.engagementVelocity ?? {};

  const userProfiler =
    metadataFeatures.userProfiler ?? {};

  // ---------------------------------------------------------
  // PIPELINE
  // ---------------------------------------------------------

  const pipelineBreakdown =
    p.pipelineBreakdown ?? {};

  const ensembleModels =
    pipelineBreakdown.ensembleModels ?? {};

  // ---------------------------------------------------------
  // ENGAGEMENT HELPERS
  // ---------------------------------------------------------

  /*
    Backend engagement_analysis can return values as numbers
    or nested objects. This helper safely extracts them.
  */
  const getEngagementValue = (
    metric: any,
    fallback = 0
  ): number => {
    if (
      typeof metric === "number" &&
      Number.isFinite(metric)
    ) {
      return metric;
    }

    if (
      typeof metric === "string" &&
      metric.trim() !== ""
    ) {
      const parsed = Number(metric);

      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    if (metric && typeof metric === "object") {
      const possibleValues = [
        metric.current,
        metric.value,
        metric.count,
        metric.total,
        metric.number,
        metric.amount,
      ];

      for (const value of possibleValues) {
        if (
          typeof value === "number" &&
          Number.isFinite(value)
        ) {
          return value;
        }

        if (
          typeof value === "string" &&
          value.trim() !== ""
        ) {
          const parsed = Number(value);

          if (!Number.isNaN(parsed)) {
            return parsed;
          }
        }
      }
    }

    return fallback;
  };

  // ---------------------------------------------------------
  // REAL ENGAGEMENT DATA
  // ---------------------------------------------------------

  const followerCount = getEngagementValue(
    reportEngagement?.followers ??
      reportEngagement?.follower_count ??
      p.metadataFeatures?.followerCount,
    0
  );

  const reach = getEngagementValue(
    reportEngagement?.reach,
    0
  );

  const impressions = getEngagementValue(
    reportEngagement?.impressions,
    0
  );

  const likes = getEngagementValue(
    reportEngagement?.likes ??
      reportEngagement?.early_likes ??
      p.metadataFeatures?.earlyLikes,
    0
  );

  const comments = getEngagementValue(
    reportEngagement?.comments ??
      reportEngagement?.early_comments ??
      p.metadataFeatures?.earlyComments,
    0
  );

  const shares = getEngagementValue(
    reportEngagement?.shares ??
      reportEngagement?.early_shares ??
      p.metadataFeatures?.earlyShares,
    0
  );

  const saves = getEngagementValue(
    reportEngagement?.saves ??
      p.metadataFeatures?.saves,
    0
  );

  // ---------------------------------------------------------
  // POSTING TIME FROM BACKEND
  // ---------------------------------------------------------

  const backendCurrentHour =
    reportPostingTime?.current_hour ??
    reportPostingTime?.current_time ??
    temporalStamp.publishTimeUtc ??
    "Not available";

  const recommendedWindow =
    reportPostingTime?.recommended_window ??
    "Recommended publishing window";

  const postingPerformance =
    reportPostingTime?.performance ??
    "Not available";

  const postingReason =
    reportPostingTime?.reason ??
    "";

  // ---------------------------------------------------------
  // DYNAMIC STRENGTHS
  // ---------------------------------------------------------

  const backendStrengths: string[] =
    Array.isArray(recommendationReport?.strengths)
      ? recommendationReport.strengths
          .map((item: any) =>
            getDisplayText(item)
          )
          .filter(Boolean)
      : [];

  const strengths: string[] =
    backendStrengths.length > 0
      ? backendStrengths
      : [];

  if (strengths.length === 0) {
    if (viralityScore >= 65) {
      strengths.push(
        "Strong overall virality potential detected."
      );
    }

    if (engagementProbability >= 60) {
      strengths.push(
        "High predicted engagement probability."
      );
    }

    if (confidence >= 80) {
      strengths.push(
        "Prediction model has high confidence in this result."
      );
    }

    if (semanticKeywords.length > 0) {
      strengths.push(
        "Caption contains identifiable semantic keywords."
      );
    }

    if (detectedObjects.length > 0) {
      strengths.push(
        "Visual analysis detected meaningful focal elements."
      );
    }

    if (
      temporalStamp.optimalWindowScore &&
      Number(
        temporalStamp.optimalWindowScore
      ) >= 80
    ) {
      strengths.push(
        "Selected publishing window is favorable."
      );
    }
  }

  if (strengths.length === 0) {
    strengths.push(
      "Prediction completed successfully."
    );
  }

  // ---------------------------------------------------------
  // DYNAMIC WEAKNESSES
  // ---------------------------------------------------------

  const backendWeaknesses: string[] =
    Array.isArray(recommendationReport?.weaknesses)
      ? recommendationReport.weaknesses
          .map((item: any) =>
            getDisplayText(item)
          )
          .filter(Boolean)
      : [];

  const weaknesses: string[] =
    backendWeaknesses.length > 0
      ? backendWeaknesses
      : [];

  if (weaknesses.length === 0) {
    if (viralityScore < 60) {
      weaknesses.push(
        "Overall virality score is below the strong-performance range."
      );
    }

    if (engagementProbability < 60) {
      weaknesses.push(
        "Predicted engagement probability could be improved."
      );
    }

    if (confidence < 75) {
      weaknesses.push(
        "Model confidence is moderate; richer input data may improve reliability."
      );
    }

    if (hashtags.length < 3) {
      weaknesses.push(
        "Use more targeted hashtags to improve content discoverability."
      );
    }

    if (semanticKeywords.length === 0) {
      weaknesses.push(
        "The caption contains limited identifiable semantic keywords."
      );
    }

    if (detectedObjects.length === 0) {
      weaknesses.push(
        "Visual analysis found limited identifiable objects."
      );
    }
  }

  if (weaknesses.length === 0) {
    weaknesses.push(
      "No major weaknesses were detected by the current analysis."
    );
  }

  // ---------------------------------------------------------
  // TOP IMPROVEMENTS
  // ---------------------------------------------------------

  const improvements =
    reportTopImprovements.length > 0
      ? reportTopImprovements
          .slice(0, 5)
          .map(
            (item: any, index: number) => ({
              title:
                getDisplayText(
                  item?.title,
                  `Improvement ${index + 1}`
                ),

              description:
                getDisplayText(
                  item?.why,
                  getDisplayText(
                    item?.description,
                    getDisplayText(
                      item?.how,
                      "Improve this area to increase content performance."
                    )
                  )
                ),

              impact:
                getDisplayText(
                  item?.impact,
                  getDisplayText(
                    item?.expected_improvement,
                    "+5% to +10%"
                  )
                ),
            })
          )
      : [
          {
            title: "Strengthen the Caption",
            description:
              explainableAI[0] ??
              "Create a stronger narrative opening and communicate the main value clearly.",
            impact: "+10% to +20%",
          },
          {
            title: "Improve Early Engagement",
            description:
              explainableAI[3] ??
              "Use a clear call-to-action to encourage comments, shares and saves.",
            impact: "+8% to +15%",
          },
          {
            title: "Add Relevant Hashtags",
            description:
              explainableAI[1] ??
              "Use focused niche hashtags instead of broad generic hashtags.",
            impact: "+5% to +12%",
          },
        ];

  // ---------------------------------------------------------
  // GAUGE
  // ---------------------------------------------------------

  const gaugeDegrees =
    Math.min(
      Math.max(viralityScore, 0),
      100
    ) * 3.6;

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <section className="mt-8 space-y-5">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>

          <h2 className="text-lg font-bold text-white">
            Multimodal Virality Predictor
          </h2>
        </div>

        <p className="text-xs text-slate-400">
          Explainable post analysis with multimodal analysis,
          performance forecasting and actionable AI recommendations.
        </p>
      </div>

      {/* =====================================================
          TOP SECTION
      ====================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* VIRALITY SCORE */}

        <div className="rounded-xl border border-slate-800 bg-[#111119] p-6">

          <div className="flex flex-col items-center justify-center">

            <div
              className="relative flex h-32 w-32 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(
                  #ef4444 ${gaugeDegrees}deg,
                  #262632 ${gaugeDegrees}deg
                )`,
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

            <div
              className={`mt-3 text-xs font-bold ${getScoreClass(
                viralityScore
              )}`}
            >
              {getScoreLabel(viralityScore)}
            </div>

            <div className="mt-1 text-[10px] text-slate-500">
              Virality {viralityScore.toFixed(0)}%
              {" • "}
              Confidence {confidence.toFixed(0)}%
            </div>

          </div>

        </div>

        {/* AI REASONING */}

        <div className="xl:col-span-2 rounded-xl border border-slate-800 bg-[#111119] p-5">

          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-purple-400">
            AI Reasoning
          </h3>

          <div className="space-y-3 text-xs leading-6 text-slate-300">

            {typeof recommendationReport?.ai_reasoning ===
              "string" ? (
              <div className="border-b border-slate-800 pb-2">
                {recommendationReport.ai_reasoning}
              </div>
            ) : null}

            {explainableAI.length > 0 ? (
              explainableAI.map(
                (
                  reason: string,
                  index: number
                ) => (
                  <div
                    key={index}
                    className="border-b border-slate-800 pb-2 last:border-b-0"
                  >
                    {reason}
                  </div>
                )
              )
            ) : (
              !recommendationReport?.ai_reasoning && (
                <p>
                  The AI analysis has completed successfully.
                </p>
              )
            )}

          </div>

        </div>

      </div>

      {/* =====================================================
          STRENGTHS + WEAKNESSES
      ====================================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* STRENGTHS */}

        <div className="rounded-xl border border-slate-800 bg-[#111119] p-5">

          <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
            Strengths
          </h3>

          <div className="space-y-3">

            {strengths.map(
              (
                strength: string,
                index: number
              ) => (
                <div
                  key={index}
                  className="flex gap-2 text-xs text-slate-300"
                >

                  <span className="text-emerald-400">
                    ✓
                  </span>

                  <span>{strength}</span>

                </div>
              )
            )}

          </div>

        </div>

        {/* WEAKNESSES */}

        <div className="rounded-xl border border-slate-800 bg-[#111119] p-5">

          <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-yellow-400">
            Weaknesses
          </h3>

          <div className="space-y-3">

            {weaknesses.map(
              (
                weakness: string,
                index: number
              ) => (
                <div
                  key={index}
                  className="flex gap-2 text-xs text-slate-300"
                >

                  <span className="text-red-400">
                    ✕
                  </span>

                  <span>{weakness}</span>

                </div>
              )
            )}

          </div>

        </div>

      </div>

      {/* =====================================================
          CONTENT COACH
      ====================================================== */}

      <div className="rounded-xl border border-purple-800/50 bg-[#171329] p-5">

        <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-purple-400">
          AI Content Coach
        </h3>

        <p className="text-xs leading-6 text-slate-300">
          {aiCoachMessage}
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">

          <div className="rounded-lg bg-[#111119] p-3">

            <div className="text-[9px] uppercase text-slate-500">
              Engagement
            </div>

            <div className="mt-1 text-lg font-bold text-cyan-400">
              {engagementProbability}%
            </div>

          </div>

          <div className="rounded-lg bg-[#111119] p-3">

            <div className="text-[9px] uppercase text-slate-500">
              Confidence
            </div>

            <div className="mt-1 text-lg font-bold text-purple-400">
              {confidence}%
            </div>

          </div>

          <div className="rounded-lg bg-[#111119] p-3">

            <div className="text-[9px] uppercase text-slate-500">
              Current Virality
            </div>

            <div className="mt-1 text-sm font-bold text-emerald-400">
              {currentVirality}
            </div>

          </div>

        </div>

      </div>

      {/* =====================================================
          CAPTION ANALYSIS
      ====================================================== */}

      <div className="rounded-xl border border-slate-800 bg-[#111119] p-5">

        <h3 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
          Caption Analysis
        </h3>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* SEMANTIC KEYWORDS */}

          <div>

            <p className="mb-3 text-[9px] uppercase text-slate-500">
              Semantic Keywords
            </p>

            <div className="space-y-2">

              {semanticKeywords.length > 0 ? (
                semanticKeywords.map(
                  (
                    item: any,
                    index: number
                  ) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg bg-[#191923] px-3 py-2"
                    >

                      <span className="text-xs text-slate-200">
                        {getDisplayText(
                          item?.keyword,
                          "keyword"
                        )}
                      </span>

                      <span className="text-xs font-bold text-purple-400">
                        {Number(
                          item?.weight ?? 0
                        ).toFixed(2)}
                      </span>

                    </div>
                  )
                )
              ) : (
                <p className="text-xs text-slate-500">
                  {reportCaption?.current_caption
                    ? `Caption: ${reportCaption.current_caption}`
                    : "No semantic keywords detected."}
                </p>
              )}

            </div>

            {/* CAPTION METADATA */}

            {reportCaption?.current_caption && (
              <div className="mt-4 rounded-lg bg-[#191923] p-3">

                <div className="text-[9px] uppercase text-slate-500">
                  Current Caption
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-300">
                  {reportCaption.current_caption}
                </p>

                <div className="mt-3 grid grid-cols-3 gap-2">

                  <div>
                    <div className="text-[9px] text-slate-500">
                      Words
                    </div>

                    <div className="text-sm font-bold text-white">
                      {captionWordCount}
                    </div>
                  </div>

                  <div>
                    <div className="text-[9px] text-slate-500">
                      Characters
                    </div>

                    <div className="text-sm font-bold text-white">
                      {captionCharCount}
                    </div>
                  </div>

                  <div>
                    <div className="text-[9px] text-slate-500">
                      Score
                    </div>

                    <div className="text-sm font-bold text-cyan-400">
                      {captionScore}/100
                    </div>
                  </div>

                </div>

                <div className="mt-2 text-[9px] text-slate-500">
                  Recommended length:{" "}
                  {captionRecommendedLength}
                </div>

              </div>
            )}

          </div>

          {/* SENTIMENT */}

          <div>

            <p className="mb-3 text-[9px] uppercase text-slate-500">
              Sentiment Analysis
            </p>

            <div className="rounded-xl bg-[#191923] p-4">

              <div className="flex items-center justify-between">

                <span className="text-xs text-slate-300">
                  {sentimentLabel}
                </span>

                <span className="text-sm font-bold text-purple-400">
                  {compoundScore.toFixed(2)}
                </span>

              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">

                <div>
                  <div className="text-[9px] text-slate-500">
                    Positive
                  </div>

                  <div className="text-sm font-bold text-emerald-400">
                    {positiveScore}%
                  </div>
                </div>

                <div>
                  <div className="text-[9px] text-slate-500">
                    Neutral
                  </div>

                  <div className="text-sm font-bold text-slate-300">
                    {neutralScore}%
                  </div>
                </div>

                <div>
                  <div className="text-[9px] text-slate-500">
                    Negative
                  </div>

                  <div className="text-sm font-bold text-red-400">
                    {negativeScore}%
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* SUGGESTED HOOK */}

        {hooks.length > 0 && (
          <div className="mt-5">

            <p className="mb-2 text-[9px] uppercase text-slate-500">
              Suggested Hook
            </p>

            <div className="rounded-xl bg-[#191923] p-4">

              <p className="text-xs leading-6 text-slate-300">
                {hooks[0]}
              </p>

            </div>

          </div>
        )}

      </div>

      {/* =====================================================
          SUGGESTED HASHTAGS + POSTING TIME
      ====================================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* HASHTAGS */}

        <div className="rounded-xl border border-slate-800 bg-[#111119] p-5">

          <h3 className="text-[10px] font-bold uppercase tracking-widest text-pink-400">
            Suggested Hashtags
          </h3>

          <div className="mt-4 flex flex-wrap gap-2">

            {hashtags.length > 0 ? (
              hashtags.map(
                (
                  tag: string,
                  index: number
                ) => (
                  <span
                    key={index}
                    className="rounded-md border border-pink-700/50 bg-pink-950/20 px-2 py-1 text-[10px] text-pink-300"
                  >
                    {tag}
                  </span>
                )
              )
            ) : (
              <span className="text-xs text-slate-500">
                No hashtags generated.
              </span>
            )}

          </div>

          {reportHashtags?.reason && (
            <p className="mt-3 text-[10px] leading-5 text-slate-500">
              {getDisplayText(
                reportHashtags.reason
              )}
            </p>
          )}

        </div>

        {/* POSTING TIME */}

        <div className="rounded-xl border border-slate-800 bg-[#111119] p-5">

          <h3 className="text-[10px] font-bold uppercase tracking-widest text-orange-400">
            Posting Time
          </h3>

          <div className="mt-4 flex items-center justify-between">

            <div>

              <div className="text-xl font-bold text-white">
                {backendCurrentHour}
              </div>

              <div className="mt-1 text-[10px] text-slate-500">
                {recommendedWindow}
              </div>

            </div>

            <div className="text-right">

              <div
                className={`text-sm font-bold ${
                  postingPerformance === "Good" ||
                  postingPerformance === "Excellent" ||
                  Number(
                    temporalStamp.optimalWindowScore ?? 0
                  ) >= 70
                    ? "text-emerald-400"
                    : "text-yellow-400"
                }`}
              >
                {postingPerformance}
              </div>

              <div className="text-[9px] text-slate-500">
                Window Score{" "}
                {temporalStamp.optimalWindowScore ??
                  0}
              </div>

            </div>

          </div>

          {postingReason && (
            <p className="mt-3 text-[10px] leading-5 text-slate-500">
              {getDisplayText(postingReason)}
            </p>
          )}

        </div>

      </div>

      {/* =====================================================
          ENGAGEMENT ANALYSIS
      ====================================================== */}

      <div className="rounded-xl border border-slate-800 bg-[#111119] p-5">

        <h3 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
          Engagement Analysis
        </h3>

        {/* REAL INPUT ENGAGEMENT */}

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">

          <MetricCard
            title="Followers"
            value={formatNumber(
              followerCount
            )}
            label="Audience Size"
          />

          <MetricCard
            title="Initial Likes"
            value={formatNumber(likes)}
            label="Early Engagement"
          />

          <MetricCard
            title="Comments"
            value={formatNumber(comments)}
            label="Early Comments"
          />

          <MetricCard
            title="Shares"
            value={formatNumber(shares)}
            label="Early Shares"
          />

        </div>

        {/* ADDITIONAL ENGAGEMENT DATA */}

        <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">

          <MetricCard
            title="Saves"
            value={formatNumber(saves)}
            label="Saved Content"
          />

          <MetricCard
            title="Reach"
            value={formatNumber(reach)}
            label="Current Reach"
          />

          <MetricCard
            title="Impressions"
            value={formatNumber(
              impressions
            )}
            label="Total Impressions"
          />

          <MetricCard
            title="Engagement Probability"
            value={`${engagementProbability}%`}
            label={getEngagementLabel(
              engagementProbability
            )}
          />

        </div>

        {/* EXISTING VELOCITY DATA */}

        <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">

          <MetricCard
            title="Initial Likes / Min"
            value={formatNumber(
              engagementVelocity.initialLikesPerMin
            )}
            label={getEngagementLabel(
              engagementProbability
            )}
          />

          <MetricCard
            title="Initial Shares / Min"
            value={formatNumber(
              engagementVelocity.initialSharesPerMin
            )}
            label="Share Velocity"
          />

          <MetricCard
            title="Acceleration"
            value={
              engagementVelocity.accelerationRate ??
              "0%"
            }
            label="Rate of Change"
          />

          <MetricCard
            title="Follower Reach"
            value={
              userProfiler.followerReachIndex ??
              "0"
            }
            label="Reach Index"
          />

        </div>

        <div className="mt-5 space-y-2">

          {explainableAI
            .slice(0, 4)
            .map(
              (
                item: string,
                index: number
              ) => (
                <div
                  key={index}
                  className="flex gap-2 text-xs text-slate-300"
                >

                  <span className="text-emerald-400">
                    ✓
                  </span>

                  <span>{item}</span>

                </div>
              )
            )}

        </div>

      </div>

      {/* =====================================================
          IMAGE ANALYSIS
      ====================================================== */}

      <div className="rounded-xl border border-slate-800 bg-[#111119] p-5">

        <h3 className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
          Image Analysis
        </h3>

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">

          <MetricCard
            title="Visual Objects"
            value={detectedObjects.length}
            label="Detected"
          />

          <MetricCard
            title="Visual Confidence"
            value={
              detectedObjects.length > 0
                ? `${Math.round(
                    detectedObjects.reduce(
                      (
                        sum: number,
                        obj: any
                      ) =>
                        sum +
                        Number(
                          obj.confidence ?? 0
                        ),
                      0
                    ) /
                      detectedObjects.length
                  )}%`
                : "0%"
            }
            label="Average"
          />

          <MetricCard
            title="CLIP Embedding"
            value={
              clipEmbeddingDimension
            }
            label="Dimension"
          />

          <MetricCard
            title="Detected Focus"
            value={
              detectedObjects[0]?.label ??
              "None"
            }
            label="Primary"
          />

        </div>

        {/* COLORS */}

        {dominantColors.length > 0 && (
          <div className="mt-5">

            <p className="mb-3 text-[9px] uppercase text-slate-500">
              Dominant Colors
            </p>

            <div className="flex flex-wrap gap-3">

              {dominantColors.map(
                (
                  color: any,
                  index: number
                ) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-lg bg-[#191923] px-3 py-2"
                  >

                    <span
                      className="h-4 w-4 rounded-full border border-slate-600"
                      style={{
                        backgroundColor:
                          color.hex ??
                          "#64748b",
                      }}
                    />

                    <span className="text-[10px] text-slate-300">
                      {color.name ??
                        color.hex ??
                        "Color"}
                    </span>

                    <span className="text-[10px] text-slate-500">
                      {color.percentage ??
                        0}
                      %
                    </span>

                  </div>
                )
              )}

            </div>

          </div>
        )}

        {/* BACKEND IMAGE ANALYSIS NOTE */}

        {recommendationReport?.image_analysis && (
          <div className="mt-5 rounded-lg bg-[#191923] p-3">

            <p className="text-[10px] leading-5 text-slate-500">
              {getDisplayText(
                recommendationReport
                  .image_analysis?.note,
                getDisplayText(
                  recommendationReport
                    .image_analysis?.status
                )
              )}
            </p>

          </div>
        )}

      </div>

      {/* =====================================================
          TOP IMPROVEMENTS
      ====================================================== */}

      <div className="rounded-xl border border-slate-800 bg-[#111119] p-5">

        <h3 className="text-[10px] font-bold uppercase tracking-widest text-orange-400">
          Top Improvements
        </h3>

        <div className="mt-4 space-y-3">

          {improvements.map(
            (
              improvement: {
                title: string;
                description: string;
                impact: string;
              },
              index: number
            ) => (
              <div
                key={index}
                className="rounded-xl bg-[#191923] p-4"
              >

                <div className="flex items-start justify-between gap-4">

                  <div>

                    <h4 className="text-xs font-bold text-white">
                      {index + 1}.{" "}
                      {improvement.title}
                    </h4>

                    <p className="mt-2 text-[11px] leading-5 text-slate-400">
                      {improvement.description}
                    </p>

                  </div>

                  <span className="whitespace-nowrap text-[10px] font-bold text-emerald-400">
                    {improvement.impact}
                  </span>

                </div>

              </div>
            )
          )}

        </div>

      </div>

      {/* =====================================================
          MODEL PIPELINE
      ====================================================== */}

      <div className="rounded-xl border border-slate-800 bg-[#111119] p-5">

        <h3 className="text-[10px] font-bold uppercase tracking-widest text-purple-400">
          AI Model Pipeline
        </h3>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">

          <PipelineCard
            title="CatBoost"
            value={
              ensembleModels.catBoostProb ??
              "N/A"
            }
          />

          <PipelineCard
            title="MLP Neural Network"
            value={
              ensembleModels.mlpNeuralNetProb ??
              "N/A"
            }
          />

          <PipelineCard
            title="Meta Learner"
            value={
              ensembleModels.level3MetaLearnerScore ??
              viralityScore
            }
          />

          <PipelineCard
            title="Fusion Layer"
            value={
              pipelineBreakdown.fusionLayer ??
              "Multimodal Fusion"
            }
          />

        </div>

      </div>

    </section>
  );
}

/* =========================================================
   METRIC CARD
========================================================= */

interface MetricCardProps {
  title: string;
  value: React.ReactNode;
  label: string;
}

function MetricCard({
  title,
  value,
  label,
}: MetricCardProps) {
  return (
    <div className="rounded-lg bg-[#191923] p-4">

      <div className="text-[9px] uppercase text-slate-500">
        {title}
      </div>

      <div className="mt-2 text-lg font-bold text-white">
        {value}
      </div>

      <div className="mt-1 text-[9px] text-slate-500">
        {label}
      </div>

    </div>
  );
}

/* =========================================================
   PIPELINE CARD
========================================================= */

interface PipelineCardProps {
  title: string;
  value: React.ReactNode;
}

function PipelineCard({
  title,
  value,
}: PipelineCardProps) {
  return (
    <div className="rounded-lg bg-[#191923] p-4">

      <div className="text-[9px] uppercase text-slate-500">
        {title}
      </div>

      <div className="mt-2 break-words text-sm font-bold text-purple-300">
        {value}
      </div>

    </div>
  );
}

/* =========================================================
   SCORE HELPERS
========================================================= */

function getScoreLabel(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Strong";
  if (score >= 50) return "Average";
  if (score >= 35) return "Below Average";
  return "Low Potential";
}

function getScoreClass(score: number) {
  if (score >= 80) {
    return "text-emerald-400";
  }

  if (score >= 65) {
    return "text-cyan-400";
  }

  if (score >= 50) {
    return "text-yellow-400";
  }

  return "text-red-400";
}

function getConfidenceLabel(score: number) {
  if (score >= 90) return "Very High";
  if (score >= 75) return "High";
  if (score >= 60) return "Moderate";
  return "Low";
}

function getEngagementLabel(score: number) {
  if (score >= 80) return "Very High";
  if (score >= 65) return "High";
  if (score >= 50) return "Moderate";
  return "Low";
}

function formatNumber(value: any) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return "0";
  }

  return number.toLocaleString();
}