import React from "react";

import PredictionForm from "./PredictionForm";
import PredictionResult from "./PredictionResult";

import type {
  PredictionFormState,
  BackendPrediction,
  RecommendationData,
} from "../types";

interface PredictionViewProps {
  prediction?: BackendPrediction;
  recommendationReport?: RecommendationData;

  predictionInput: PredictionFormState;

  onInputChange: React.Dispatch<
    React.SetStateAction<PredictionFormState>
  >;

  onRunPrediction: () => void;
  onResetPrediction: () => void;

  loading: boolean;
  isSyncing: boolean;
  error: string;

  hasAnalyzed: boolean;
}

export default function PredictionView({
  prediction,
  recommendationReport,

  predictionInput,
  onInputChange,

  onRunPrediction,
  onResetPrediction,

  loading,
  isSyncing,
  error,

  hasAnalyzed,
}: PredictionViewProps) {
  return (
    <div className="w-full min-h-screen px-4 md:px-6 lg:px-8">

      {/* =====================================================
          PREDICTION ENGINE
      ====================================================== */}

      <section className="rounded-2xl border border-purple-500/30 bg-[#0d0d14] p-5 shadow-xl">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">
            AI Prediction Engine
          </h1>

          <p className="mt-1 text-sm text-gray-400">
            Enter your content details and let the AI analyze
            virality, engagement, content quality, timing,
            hashtags and recommendations.
          </p>
        </div>

        {/* =================================================
            PREDICTION FORM
        ================================================== */}

        <PredictionForm
  predictionInput={predictionInput}
  onInputChange={onInputChange}
  onRunPrediction={onRunPrediction}
  onResetInput={onResetPrediction}
  loading={loading}
  isSyncing={isSyncing}
  error={error}
/>

      </section>


      {/* =====================================================
          PREDICTION RESULT
      ====================================================== */}

      {hasAnalyzed && prediction && (
        <section className="animate-in fade-in duration-500">

          <PredictionResult
            prediction={prediction}
          />

        </section>
      )}

    </div>
  );
}