import React, { useState } from "react";

import Navbar, { NavTab } from "./components/Navbar";
import DashboardView from "./components/DashboardView";
import PredictionView from "./components/PredictionView";
import AnalyticsView from "./components/AnalyticsView";

import type {
  PredictionFormState,
  PredictApiResponse,
  HistoryEntry,
} from "./types";

const API_BASE_URL = "http://127.0.0.1:8000";

const DEFAULT_INPUT: PredictionFormState = {
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

function App() {
    const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
    console.log("Current Tab:", activeTab);

  const [currentUser] = useState(null);

  const [predictionInput, setPredictionInput] =
    useState<PredictionFormState>(DEFAULT_INPUT);

  const [apiResponse, setApiResponse] =
    useState<PredictApiResponse | null>(null);

  const [predictionHistory, setPredictionHistory] =
    useState<HistoryEntry[]>([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

    const handleRunPrediction = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(predictionInput),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data: PredictApiResponse = await response.json();

      console.log("Prediction Response:", data);

      if (!data.success) {
        throw new Error(data.message || "Prediction Failed");
      }

      setApiResponse(data);

      const newHistory: HistoryEntry = {
        id: Date.now().toString(),
        platform: predictionInput.platform,
        viralityScore: Math.round(
          data.prediction.viral_probability * 100
        ),
        confidence: Math.round(
          data.prediction.viral_probability * 100
        ),
        caption: predictionInput.caption,
        timestamp: new Date().toLocaleTimeString(),
        predictedReach: "--",
      };

      setPredictionHistory((prev) => [
        newHistory,
        ...prev,
      ]);

      setActiveTab("prediction");
    } catch (err: any) {
      console.error(err);

      setError(
        err.message ||
          "Unable to connect with backend."
      );
    } finally {
      setLoading(false);
    }
  };

    const renderContent = () => {
    switch (activeTab) {

      case "dashboard":
        return (
          <DashboardView
            onNavigate={setActiveTab}
            realtimePredictions={predictionHistory}
          />
        );

case "prediction":
  return (
    <PredictionView
      prediction={apiResponse?.prediction}
      recommendationReport={apiResponse?.recommendation_report}

      predictionInput={predictionInput}
      onInputChange={setPredictionInput}
      onRunPrediction={handleRunPrediction}

      loading={loading}
      error={error}
    />
  );

      case "analytics":
        return (
          <AnalyticsView
            realtimePredictions={predictionHistory}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">

      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenCommandPalette={() => {}}
        onOpenChat={() => setActiveTab("prediction")}
        currentUser={currentUser}
        onOpenAuthModal={() => {}}
        onLogout={() => {}}
      />

      <main className="mx-auto max-w-7xl px-4 pb-10 pt-24 md:px-6">

        {loading && <div className="text-center py-8">Loading...</div>}

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/20 border border-red-500 p-4 text-red-300">
            {error}
          </div>
        )}

        {renderContent()}

      </main>

    </div>
  );
}

export default App;