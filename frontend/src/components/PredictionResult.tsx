import React from "react";

import {
  BackendPrediction,
  RecommendationData,
} from "../types";

interface PredictionResultProps {
  prediction: BackendPrediction;
  recommendationReport: RecommendationData;
}

export default function PredictionResult({
  prediction,
  recommendationReport,
}: PredictionResultProps) {

  const virality = Math.round(
    (prediction.viral_probability ?? 0) * 100
  );

  const confidence = virality;

  const contentScore =
    recommendationReport?.overall_content_score ??
    virality;

  const {
    ai_reasoning = "No AI reasoning available.",
    strengths = [],
    weaknesses = [],
  } = recommendationReport;

  return (
    <div className="max-w-6xl mx-auto mt-8 space-y-6">

            {/* Header */}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">

        <h2 className="text-2xl font-bold text-white">
          Prediction Results
        </h2>

        <p className="text-zinc-400 mt-2">
          AI generated virality analysis and recommendations
        </p>

      </div>

      {/* Score Cards */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Virality */}

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">

          <p className="text-zinc-400 text-sm">
            Virality Score
          </p>

          <h2 className="text-5xl font-bold text-green-400 mt-3">
            {virality}%
          </h2>

        </div>

        {/* Confidence */}

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">

          <p className="text-zinc-400 text-sm">
            Model Confidence
          </p>

          <h2 className="text-5xl font-bold text-blue-400 mt-3">
            {confidence}%
          </h2>

        </div>

        {/* Content Score */}

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">

          <p className="text-zinc-400 text-sm">
            Overall Content Score
          </p>

          <h2 className="text-5xl font-bold text-purple-400 mt-3">
            {contentScore}
          </h2>

        </div>

      </div>

      {/* Strengths & Weaknesses */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="rounded-xl border border-green-700 bg-zinc-900 p-6">

          <h3 className="text-green-400 text-lg font-semibold mb-4">
            Strengths
          </h3>

          <ul className="space-y-2">

            {strengths.length === 0 ? (

              <li className="text-zinc-400">
                No strengths available.
              </li>

            ) : (

              strengths.map((item, index) => (

                <li
                  key={index}
                  className="text-zinc-300"
                >
                  • {item}
                </li>

              ))

            )}

          </ul>

        </div>

        <div className="rounded-xl border border-red-700 bg-zinc-900 p-6">

          <h3 className="text-red-400 text-lg font-semibold mb-4">
            Weaknesses
          </h3>

          <ul className="space-y-2">

            {weaknesses.length === 0 ? (

              <li className="text-zinc-400">
                No weaknesses available.
              </li>

            ) : (

              weaknesses.map((item, index) => (

                <li
                  key={index}
                  className="text-zinc-300"
                >
                  • {item}
                </li>

              ))

            )}

          </ul>

        </div>

      </div>
            {/* ============================
            AI Reasoning
      ============================ */}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">

        <h2 className="text-xl font-semibold text-white mb-4">
          AI Reasoning
        </h2>

        <p className="text-zinc-300 leading-7 whitespace-pre-line">
          {ai_reasoning}
        </p>

      </div>

      {/* ============================
            Caption Analysis
      ============================ */}

      {recommendationReport.caption_analysis && (

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">

        <h2 className="text-xl font-semibold text-white mb-5">
          Caption Analysis
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

          <div className="rounded-lg bg-zinc-950 p-4">
            <p className="text-zinc-500 text-sm">Word Count</p>
            <h3 className="text-2xl font-bold text-white mt-2">
              {recommendationReport.caption_analysis.word_count}
            </h3>
          </div>

         <div className="rounded-lg bg-zinc-950 p-4">
  <p className="text-zinc-500 text-sm">Characters</p>
  <h3 className="text-2xl font-bold text-blue-400 mt-2">
    {recommendationReport.caption_analysis.char_count}
  </h3>
</div>

<div className="rounded-lg bg-zinc-950 p-4">
  <p className="text-zinc-500 text-sm">Current Score</p>
  <h3 className="text-2xl font-bold text-green-400 mt-2">
    {recommendationReport.caption_analysis.current_score}
  </h3>
</div>

<div className="rounded-lg bg-zinc-950 p-4">
  <p className="text-zinc-500 text-sm">CTA Present</p>
  <h3 className="text-2xl font-bold text-yellow-400 mt-2">
    {recommendationReport.caption_analysis.has_cta ? "Yes" : "No"}
  </h3>
</div>

        </div>

      </div>

      )}

      {/* ============================
            AI Content Coach
      ============================ */}

      {recommendationReport.ai_content_coach && (

      <div className="rounded-xl border border-purple-700 bg-gradient-to-r from-purple-950/40 to-zinc-900 p-6">

        <h2 className="text-xl font-semibold text-purple-300 mb-4">
          AI Content Coach
        </h2>

        <div className="space-y-4">

          <div className="flex justify-between">

            <span className="text-zinc-400">
              Current Virality
            </span>

            <span className="font-bold text-red-400">
              {recommendationReport.ai_content_coach.current_virality}
            </span>

          </div>

          <div className="flex justify-between">

            <span className="text-zinc-400">
              Projected Virality
            </span>

            <span className="font-bold text-green-400">
              {recommendationReport.ai_content_coach.projected_virality}
            </span>

          </div>

          <div className="rounded-lg bg-zinc-950 p-4">

            <p className="text-zinc-300 leading-7">
              {recommendationReport.ai_content_coach.message}
            </p>

          </div>

        </div>

      </div>

      )}
            {/* ============================
            Posting Time
      ============================ */}

      {recommendationReport.posting_time && (

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">

        <h2 className="text-xl font-semibold text-white mb-5">
          Best Posting Time
        </h2>

        <div className="grid md:grid-cols-2 gap-6">

          <div className="rounded-lg bg-zinc-950 p-4">

            <p className="text-zinc-500 text-sm">
              Current Time
            </p>

            <h3 className="text-2xl font-bold text-white mt-2">
              {recommendationReport.posting_time.current_time}
            </h3>

            <p className="text-zinc-400 mt-2">
              {recommendationReport.posting_time.performance}
            </p>

          </div>

          <div className="rounded-lg bg-zinc-950 p-4">

            <p className="text-zinc-500 text-sm">
              Recommended Window
            </p>

            <h3 className="text-2xl font-bold text-green-400 mt-2">
              {recommendationReport.posting_time.recommended_window}
            </h3>

            <p className="text-zinc-400 mt-2">
              {recommendationReport.posting_time.reason}
            </p>

          </div>

        </div>

      </div>

      )}

      {/* ============================
            Suggested Hashtags
      ============================ */}

      {recommendationReport.suggested_hashtags && (

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">

        <h2 className="text-xl font-semibold text-white mb-5">
          Suggested Hashtags
        </h2>

        <div className="flex flex-wrap gap-3">

          {recommendationReport.suggested_hashtags.recommended.map(
            (tag, index) => (

              <span
                key={index}
                className="px-3 py-2 rounded-lg bg-purple-700/30 text-purple-300"
              >
                {tag}
              </span>

            )
          )}

        </div>

      </div>

      )}

      {/* ============================
            Engagement Analysis
      ============================ */}

      {recommendationReport.engagement_analysis && (

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">

        <h2 className="text-xl font-semibold text-white mb-6">
          Engagement Analysis
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">

          <div className="rounded-lg bg-zinc-950 p-4">
            <p className="text-zinc-500">Likes</p>
            <h3 className="text-3xl font-bold mt-2">
              {recommendationReport.engagement_analysis.likes.value}
            </h3>
          </div>

          <div className="rounded-lg bg-zinc-950 p-4">
            <p className="text-zinc-500">Comments</p>
            <h3 className="text-3xl font-bold mt-2">
              {recommendationReport.engagement_analysis.comments.value}
            </h3>
          </div>

          <div className="rounded-lg bg-zinc-950 p-4">
            <p className="text-zinc-500">Shares</p>
            <h3 className="text-3xl font-bold mt-2">
              {recommendationReport.engagement_analysis.shares.value}
            </h3>
          </div>

          <div className="rounded-lg bg-zinc-950 p-4">
            <p className="text-zinc-500">Saves</p>
            <h3 className="text-3xl font-bold mt-2">
              {recommendationReport.engagement_analysis.saves.value}
            </h3>
          </div>

        </div>

      </div>

      )}

      {/* ============================
            Image Analysis
      ============================ */}

      {recommendationReport.image_analysis && (

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">

        <h2 className="text-xl font-semibold text-white mb-6">
          Image Analysis
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">

          <div className="rounded-lg bg-zinc-950 p-4">
            <p className="text-zinc-500">Brightness</p>
            <h3 className="text-2xl font-bold">
              {recommendationReport.image_analysis.brightness}
            </h3>
          </div>

          <div className="rounded-lg bg-zinc-950 p-4">
            <p className="text-zinc-500">Contrast</p>
            <h3 className="text-2xl font-bold">
              {recommendationReport.image_analysis.contrast}
            </h3>
          </div>

          <div className="rounded-lg bg-zinc-950 p-4">
            <p className="text-zinc-500">Sharpness</p>
            <h3 className="text-2xl font-bold">
              {recommendationReport.image_analysis.sharpness}
            </h3>
          </div>

          <div className="rounded-lg bg-zinc-950 p-4">
            <p className="text-zinc-500">Composition</p>
            <h3 className="text-2xl font-bold">
              {recommendationReport.image_analysis.composition}
            </h3>
          </div>

        </div>

      </div>

      )}
            {/* ============================
            Explainable AI
      ============================ */}

      {recommendationReport.explainable_ai &&
        recommendationReport.explainable_ai.length > 0 && (

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">

          <h2 className="text-xl font-semibold text-white mb-6">
            Explainable AI
          </h2>

          <div className="space-y-5">

            {recommendationReport.explainable_ai.map(
              (factor, index) => (

                <div key={index}>

                  <div className="flex justify-between mb-2">

                    <span className="text-zinc-300">
                      {factor.name}
                    </span>

                    <span className="text-purple-400 font-semibold">
                      {factor.influence}%
                    </span>

                  </div>

                  <div className="h-2 rounded-full bg-zinc-800">

                    <div
                      className="h-2 rounded-full bg-purple-500"
                      style={{
                        width: `${Math.min(
                          factor.influence,
                          100
                        )}%`,
                      }}
                    />

                  </div>

                  <p className="text-xs text-zinc-500 mt-2">
                    {factor.description}
                  </p>

                </div>

              )
            )}

          </div>

        </div>

      )}

      {/* ============================
            Final Action Plan
      ============================ */}

      {recommendationReport.final_action_plan && (

      <div className="rounded-xl border border-green-700 bg-zinc-900 p-6">

        <h2 className="text-xl font-semibold text-green-400 mb-6">
          Final Action Plan
        </h2>

        <ul className="space-y-3">

          {recommendationReport.final_action_plan.today.map(
            (step, index) => (

              <li
                key={index}
                className="flex gap-3 text-zinc-300"
              >
                <span className="text-green-400">
                  ✔
                </span>

                {step}

              </li>

            )
          )}

        </ul>

      </div>

      )}

    </div>
  );
}