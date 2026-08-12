import React, { useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";

import PredictionForm from "./PredictionForm";
import PredictionResult from "./PredictionResult";

import type {
  PredictionFormState,
  BackendPrediction,
  RecommendationData,
} from "../types";

// Keep this import path the same as your existing Firebase configuration.
// It should export the initialized Firebase Auth instance as `auth`.
import { auth } from "../lib/firebase";

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
  /*
   * IMPORTANT:
   * PredictionView receives predictionInput from the parent component.
   * Therefore, simply changing this component's JSX cannot clear the
   * previous user's form data.
   *
   * We listen for Firebase authentication changes here. When the
   * authenticated user changes, the previous Prediction Engine state
   * is cleared through the existing onResetPrediction callback.
   *
   * We intentionally do NOT reset on the first auth callback. This keeps
   * the current user's saved form state working after a normal page refresh.
   */
  const previousUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const currentUserId = user?.uid ?? null;

      // First auth callback: do not clear existing state.
      // This allows the current user's own saved state to be restored.
      if (previousUserIdRef.current === undefined) {
        previousUserIdRef.current = currentUserId;
        return;
      }

      // User changed (including logout -> login).
      if (previousUserIdRef.current !== currentUserId) {
        previousUserIdRef.current = currentUserId;

        // Clear the previous user's Prediction Engine data.
        onResetPrediction();
      }
    });

    return () => unsubscribe();
  }, [onResetPrediction]);

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
