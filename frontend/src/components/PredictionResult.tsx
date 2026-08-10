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

  const reachForecast =
    p.reachForecast ?? "Not available";

  // ---------------------------------------------------------
  // SAFE ARRAYS
  // ---------------------------------------------------------

  const explainableAI: string[] = Array.isArray(p.explainableAI)
    ? p.explainableAI
    : [];

  const hashtags: string[] = Array.isArray(
    p.hashtagIntelligence
  )
    ? p.hashtagIntelligence
    : [];

  const hooks: string[] = Array.isArray(p.suggestedHooks)
    ? p.suggestedHooks
    : [];

  // ---------------------------------------------------------
  // TEXTUAL FEATURES
  // ---------------------------------------------------------

  const textualFeatures = p.textualFeatures ?? {};

  const semanticKeywords = Array.isArray(
    textualFeatures.semanticKeywords
  )
    ? textualFeatures.semanticKeywords
    : [];

  const sentiment = textualFeatures.sentiment ?? {};

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
  // VISUAL FEATURES
  // ---------------------------------------------------------

  const visualFeatures = p.visualFeatures ?? {};

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
    visualFeatures.clipEmbeddingDimension ?? "N/A";

  // ---------------------------------------------------------
  // METADATA
  // ---------------------------------------------------------

  const metadataFeatures = p.metadataFeatures ?? {};

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
  // HELPER FUNCTIONS
  // ---------------------------------------------------------

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 65) return "Strong";
    if (score >= 50) return "Average";
    if (score >= 35) return "Below Average";
    return "Low Potential";
  };

  const getScoreClass = (score: number) => {
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
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 90) return "Very High";
    if (score >= 75) return "High";
    if (score >= 60) return "Moderate";
    return "Low";
  };

  const getEngagementLabel = (score: number) => {
    if (score >= 80) return "Very High";
    if (score >= 65) return "High";
    if (score >= 50) return "Moderate";
    return "Low";
  };

  const formatNumber = (value: any) => {
    const number = Number(value);

    if (Number.isNaN(number)) {
      return "0";
    }

    return number.toLocaleString();
  };

  // ---------------------------------------------------------
  // DYNAMIC STRENGTHS
  // ---------------------------------------------------------

  const strengths: string[] = [];

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
    Number(temporalStamp.optimalWindowScore) >= 80
  ) {
    strengths.push(
      "Selected publishing window is favorable."
    );
  }

  if (strengths.length === 0) {
    strengths.push(
      "Prediction completed successfully."
    );
  }

  // ---------------------------------------------------------
  // DYNAMIC WEAKNESSES
  // ---------------------------------------------------------

  const weaknesses: string[] = [];

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

  if (weaknesses.length === 0) {
    weaknesses.push(
      "No major weaknesses were detected by the current analysis."
    );
  }

  // ---------------------------------------------------------
  // IMPROVEMENTS
  // ---------------------------------------------------------

  const improvements = [
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

  const gaugeDegrees = Math.min(
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

            {explainableAI.length > 0 ? (
              explainableAI.map(
                (reason: string, index: number) => (
                  <div
                    key={index}
                    className="border-b border-slate-800 pb-2 last:border-b-0"
                  >
                    {reason}
                  </div>
                )
              )
            ) : (
              <p>
                The AI analysis has completed successfully.
              </p>
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
              (strength: string, index: number) => (
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
              (weakness: string, index: number) => (
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
          {explainableAI[0] ??
            "Your content has been analyzed for narrative quality, engagement potential and audience response."}
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
              Reach Forecast
            </div>

            <div className="mt-1 text-sm font-bold text-emerald-400">
              {reachForecast}
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
                  (item: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg bg-[#191923] px-3 py-2"
                    >

                      <span className="text-xs text-slate-200">
                        {item.keyword ?? "keyword"}
                      </span>

                      <span className="text-xs font-bold text-purple-400">
                        {Number(item.weight ?? 0).toFixed(2)}
                      </span>

                    </div>
                  )
                )
              ) : (
                <p className="text-xs text-slate-500">
                  No semantic keywords detected.
                </p>
              )}

            </div>
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
                (tag: string, index: number) => (
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

        </div>

        {/* POSTING TIME */}

        <div className="rounded-xl border border-slate-800 bg-[#111119] p-5">

          <h3 className="text-[10px] font-bold uppercase tracking-widest text-orange-400">
            Posting Time
          </h3>

          <div className="mt-4 flex items-center justify-between">

            <div>

              <div className="text-xl font-bold text-white">
                {temporalStamp.publishTimeUtc ??
                  "Not available"}
              </div>

              <div className="mt-1 text-[10px] text-slate-500">
                {temporalStamp.dayOfWeek ??
                  "Recommended publishing window"}
              </div>

            </div>

            <div className="text-right">

              <div
                className={`text-sm font-bold ${
                  Number(
                    temporalStamp.optimalWindowScore ?? 0
                  ) >= 70
                    ? "text-emerald-400"
                    : "text-yellow-400"
                }`}
              >
                {Number(
                  temporalStamp.optimalWindowScore ?? 0
                ) >= 70
                  ? "Above Average"
                  : "Below Average"}
              </div>

              <div className="text-[9px] text-slate-500">
                Window Score{" "}
                {temporalStamp.optimalWindowScore ?? 0}
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* =====================================================
          ENGAGEMENT ANALYSIS
      ====================================================== */}

      <div className="rounded-xl border border-slate-800 bg-[#111119] p-5">

        <h3 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
          Engagement Analysis
        </h3>

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">

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

          {explainableAI.slice(0, 4).map(
            (item: string, index: number) => (
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
                      (sum: number, obj: any) =>
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
            value={clipEmbeddingDimension}
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
                (color: any, index: number) => (
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
                      {color.percentage ?? 0}%
                    </span>

                  </div>
                )
              )}

            </div>
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