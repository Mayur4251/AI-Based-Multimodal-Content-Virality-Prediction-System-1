import React from "react";

import {
  BackendPrediction,
  RecommendationData,
  PredictionFormState,
} from "../types";

import PredictionForm from "./PredictionForm";
import PredictionResult from "./PredictionResult";

interface PredictionViewProps {
  prediction?: BackendPrediction;

  recommendationReport?: RecommendationData;

  predictionInput: PredictionFormState;

  onInputChange: React.Dispatch<
    React.SetStateAction<PredictionFormState>
  >;

  onRunPrediction: () => void;

  loading: boolean;

  error: string;

  onBack?: () => void;
}

export default function PredictionView({
  prediction,
  recommendationReport,

  predictionInput,
  onInputChange,

  onRunPrediction,

  loading,

  error,

  onBack,
}: PredictionViewProps) {
  return (
    <div className="space-y-8">

      <PredictionForm
        predictionInput={predictionInput}
        onInputChange={onInputChange}
        onRunPrediction={onRunPrediction}
        loading={loading}
        error={error}
      />

      {prediction && recommendationReport && (
        <PredictionResult
          prediction={prediction}
          recommendationReport={recommendationReport}
        />
      )}

    </div>
  );
}