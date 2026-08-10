import React, { useState, useEffect } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDocFromServer } from "firebase/firestore";

import Navbar, { NavTab } from "./components/Navbar";
import DashboardView from "./components/DashboardView";
import PredictionView from "./components/PredictionView";
import AnalyticsView from "./components/AnalyticsView";
import AuthModal from "./components/AuthModal";
import AuthGateView from "./components/AuthGateView";

import {
  auth,
  db,
  logOutUser,
  subscribeGlobalPredictions,
} from "./lib/firebase";

import type {
  PredictionFormState,
  PredictApiResponse,
  HistoryEntry,
} from "./types";

const API_BASE_URL = "";

const DEFAULT_INPUT: PredictionFormState = {
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
};

function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");

  const [currentUser, setCurrentUser] =
    useState<FirebaseUser | null>(null);

  const [guestAccess, setGuestAccess] = useState(false);

  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [authModalMode, setAuthModalMode] =
    useState<"login" | "signup">("login");

  const [predictionInput, setPredictionInput] =
    useState<PredictionFormState>(DEFAULT_INPUT);

  const [apiResponse, setApiResponse] =
    useState<PredictApiResponse | null>(null);

  /*
   * SINGLE SOURCE OF TRUTH
   * Dashboard + Analytics both use this same real-time data.
   */
  const [predictionHistory, setPredictionHistory] =
    useState<HistoryEntry[]>([]);

  const [loading, setLoading] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);

  /*
   * Real-time prediction toggle.
   */
  const [realtimeSync, setRealtimeSync] = useState(false);

  const [error, setError] = useState("");

  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  // ============================================================
  // TEST FIRESTORE CONNECTION
  // ============================================================

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(
          doc(db, "test", "connection")
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("the client is offline")
        ) {
          console.error(
            "Please check your Firebase configuration."
          );
        }
      }
    }

    testConnection();
  }, []);

  // ============================================================
  // FIREBASE AUTH STATE
  // ============================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setCurrentUser(user);
      }
    );

    return () => unsubscribe();
  }, []);

  // ============================================================
  // GLOBAL REAL-TIME FIRESTORE PREDICTIONS
  // ============================================================
  //
  // Whenever Firestore changes:
  //
  // Firebase
  //    ↓
  // predictionHistory
  //    ↓
  // DashboardView
  //    ↓
  // AnalyticsView
  //
  // This keeps the whole website synchronized.
  // ============================================================

  useEffect(() => {
    const unsubscribe = subscribeGlobalPredictions(
      (docs) => {
        if (Array.isArray(docs)) {
          /*
           * IMPORTANT:
           * Do not check docs.length > 0 here.
           *
           * If Firestore becomes empty, the UI should also
           * become empty instead of keeping old/stale numbers.
           */
          setPredictionHistory(docs);
        } else {
          setPredictionHistory([]);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // ============================================================
  // RESET PREDICTION
  // ============================================================

  const handleResetPrediction = () => {
    setApiResponse(null);
    setHasAnalyzed(false);
    setError("");
    setPredictionInput(DEFAULT_INPUT);
  };

  // ============================================================
  // RUN PREDICTION
  // ============================================================

  const handleRunPrediction = async (
    targetInput: PredictionFormState,
    silent = false
  ) => {
    const hasCaption = Boolean(
      targetInput.caption &&
        targetInput.caption.trim().length > 0
    );

    const hasImage = Boolean(
      targetInput.image !== null
    );

    const hasHashtags = Boolean(
      (targetInput.keywords &&
        targetInput.keywords.trim().length > 0) ||
      (targetInput.hashtags &&
        targetInput.hashtags.trim().length > 0)
    );

    const missingFields: string[] = [];

    if (!hasCaption) {
      missingFields.push("Post Caption Copy");
    }

    if (!hasImage) {
      missingFields.push("Thumbnail Image");
    }

    if (!hasHashtags) {
      missingFields.push("Keywords & Hashtags");
    }

    if (missingFields.length > 0) {
      if (!silent) {
        setError(
          `Please fill all required input fields before running prediction: ${missingFields.join(
            ", "
          )}.`
        );
      }

      return;
    }

    if (silent) {
      setIsSyncing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      // ========================================================
      // IMAGE CONVERSION
      // ========================================================

      let imageBase64 = "";
      let imageMimeType = "";

      if (targetInput.image) {
        imageBase64 = await new Promise<string>(
          (resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
              resolve(reader.result as string);
            };

            reader.onerror = () => {
              reject(
                new Error("Failed to read image")
              );
            };

            reader.readAsDataURL(
              targetInput.image!
            );
          }
        );

        imageMimeType = targetInput.image.type;
      }

      // ========================================================
      // API PAYLOAD
      // ========================================================

      const payload = {
        caption: targetInput.caption,
        post_hour: targetInput.post_hour,
        day_of_week: targetInput.day_of_week,
        follower_count: targetInput.follower_count,

        early_likes: targetInput.early_likes,
        early_comments: targetInput.early_comments,
        early_shares: targetInput.early_shares,

        saves: targetInput.saves,
        reach: targetInput.reach,
        impressions: targetInput.impressions,

        media_type: targetInput.media_type,
        content_category: targetInput.content_category,
        platform: targetInput.platform,
        model: targetInput.model,

        keywords: targetInput.keywords,
        hashtags: targetInput.hashtags,

        imageBase64,
        imageMimeType,
      };

      console.log(
        "Sending prediction payload:",
        payload
      );

      // ========================================================
      // BACKEND REQUEST
      // ========================================================

      const response = await fetch(
        `${API_BASE_URL}/api/predict`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const text = await response.text();

        throw new Error(
          `Server Error (${response.status}): ${text.slice(
            0,
            300
          )}`
        );
      }

      // ========================================================
      // BACKEND RESPONSE
      // ========================================================

      const data =
        await response.json();

      console.log(
        "Backend prediction response:",
        data
      );

      // Backend explicitly reported failure
      if (data.success === false) {
        throw new Error(
          data.message ||
            "Prediction Failed"
        );
      }

      // Backend may return:
      //
      // {
      //   prediction: {...}
      // }
      //
      // OR:
      //
      // {
      //   viralityScore: ...
      // }

      const prediction =
        data.prediction ?? data;

      if (
        !prediction ||
        typeof prediction.viralityScore !==
          "number"
      ) {
        throw new Error(
          data.message ||
            "Backend did not return valid prediction data."
        );
      }

      // ========================================================
      // NORMALIZE RESPONSE
      // ========================================================

      const normalizedResponse:
        PredictApiResponse = {
        success: true,
        prediction: prediction,
      };

      console.log(
        "Normalized prediction:",
        normalizedResponse
      );

      // ========================================================
      // UPDATE PREDICTION RESULT
      // ========================================================

      setApiResponse(
        normalizedResponse
      );

      setHasAnalyzed(true);

      // ========================================================
      // CREATE REAL-TIME HISTORY ENTRY
      // ========================================================

      const viralityScore = Math.max(
        0,
        Math.min(
          100,
          Number(
            prediction.viralityScore
          )
        )
      );

      const confidenceValue =
        Number.isFinite(
          Number(
            prediction.confidence
          )
        )
          ? Number(
              prediction.confidence
            )
          : viralityScore;

      const predictedReach =
        prediction.predictedReach ??
        "—";

      const newHistory: HistoryEntry = {
        id: Date.now().toString(),

        platform:
          targetInput.platform,

        viralityScore:

          Number.isFinite(
            viralityScore
          )
            ? viralityScore
            : 0,

        confidence:
          Number.isFinite(
            confidenceValue
          )
            ? confidenceValue
            : 0,

        caption:
          targetInput.caption ||
          "Untitled Post",

        timestamp:
          new Date().toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          ),

        predictedReach,
      };

      // ========================================================
      // IMMEDIATE REAL-TIME UPDATE
      // ========================================================
      //
      // Do this immediately.
      //
      // The Dashboard and Analytics do NOT have to wait
      // for Firestore before showing the new prediction.
      // ========================================================

      setPredictionHistory(
        (previousHistory) => [
          newHistory,

          ...previousHistory
            .filter(
              (item) =>
                item.id !==
                newHistory.id
            )
            .slice(0, 49),
        ]
      );

      // ========================================================
      // SAVE TO FIRESTORE
      // ========================================================
      //
      // Firestore subscription will then synchronize this
      // prediction in real time across the website.
      // ========================================================


    } catch (err: any) {
      console.error(
        "Prediction error:",
        err
      );

      if (!silent) {
        setError(
          err?.message ||
            "Unable to connect with backend."
        );
      }
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  // ============================================================
  // REAL-TIME PREDICTION SYNC
  // ============================================================
  //
  // When real-time mode is enabled and the user changes
  // prediction input, the backend is called automatically.
  //
  // This makes the prediction data update according to
  // the user's activity.
  // ============================================================

  useEffect(() => {
    if (!realtimeSync) {
      return;
    }

    const hasContent = Boolean(
      (predictionInput.caption &&
        predictionInput.caption.trim()
          .length > 0) ||
        predictionInput.image !== null
    );

    if (!hasContent) {
      return;
    }

    const timer = setTimeout(() => {
      handleRunPrediction(
        predictionInput,
        true
      );
    }, 800);

    return () => {
      clearTimeout(timer);
    };
  }, [
    predictionInput.caption,
    predictionInput.post_hour,
    predictionInput.day_of_week,
    predictionInput.follower_count,
    predictionInput.early_likes,
    predictionInput.early_comments,
    predictionInput.early_shares,
    predictionInput.saves,
    predictionInput.reach,
    predictionInput.impressions,
    predictionInput.media_type,
    predictionInput.content_category,
    predictionInput.platform,
    predictionInput.model,
    predictionInput.keywords,
    predictionInput.hashtags,
    predictionInput.image,
    realtimeSync,
  ]);

  // ============================================================
  // RENDER CONTENT
  // ============================================================

  const renderContent = () => {
    switch (activeTab) {
      // ========================================================
      // DASHBOARD
      // ========================================================

      case "dashboard":
        return (
          <DashboardView
            onNavigate={setActiveTab}
            realtimePredictions={
              predictionHistory
            }
          />
        );

      // ========================================================
      // PREDICTION
      // ========================================================

      case "prediction":
        return (
          <PredictionView
            prediction={
              apiResponse?.prediction
            }

            recommendationReport={
              apiResponse?.recommendation_report
            }

            predictionInput={
              predictionInput
            }

            onInputChange={
              setPredictionInput
            }

            onRunPrediction={() =>
              handleRunPrediction(
                predictionInput,
                false
              )
            }

            onResetPrediction={
              handleResetPrediction
            }

            loading={loading}

            isSyncing={isSyncing}

            error={error}

            hasAnalyzed={
              hasAnalyzed
            }
          />
        );

      // ========================================================
      // ANALYTICS
      // ========================================================

      case "analytics":
        return (
          <AnalyticsView
            realtimePredictions={
              predictionHistory
            }
          />
        );

      default:
        return null;
    }
  };

  // ============================================================
  // MAIN APPLICATION
  // ============================================================

  return (
    <>
      {!currentUser && !guestAccess ? (
        <AuthGateView
          onGuestAccess={() => {
            setGuestAccess(true);
          }}
        />
      ) : (
        <>
          <Navbar
            activeTab={
              activeTab
            }

            onTabChange={
              setActiveTab
            }

            onOpenCommandPalette={() => {}}

            onOpenChat={() =>
              setActiveTab(
                "prediction"
              )
            }

            currentUser={
              currentUser
            }

            onOpenAuthModal={(
              mode = "login"
            ) => {
              setAuthModalMode(
                mode
              );

              setAuthModalOpen(
                true
              );
            }}

            onLogout={
              logOutUser
            }
          />

          <main className="w-full px-4 md:px-6 lg:px-8 pt-20">

            {/* ==================================================
                LOADING MESSAGE
            ================================================== */}

            {loading && (
              <div className="flex items-center justify-center gap-3 py-6 bg-purple-950/20 border border-purple-800/40 rounded-xl mb-6 text-purple-300 text-xs font-mono animate-pulse">

                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />

                <span>
                  AI Multimodal Engine
                  analyzing image
                  vectors, caption
                  sentiment, and
                  platform engagement
                  timing...
                </span>

              </div>
            )}

            {/* ==================================================
                ERROR MESSAGE
            ================================================== */}

            {error && (
              <div className="mb-4 rounded-xl bg-red-950/60 border border-red-800 p-4 text-red-300 text-xs flex items-center justify-between">

                <span>
                  {error}
                </span>

                <button
                  onClick={() =>
                    setError("")
                  }
                  className="text-red-400 hover:text-white font-bold ml-4"
                >
                  ✕
                </button>

              </div>
            )}

            {/* ==================================================
                PAGE CONTENT
            ================================================== */}

            {renderContent()}

          </main>

          {/* ====================================================
              AUTH MODAL
          ==================================================== */}

          <AuthModal
            isOpen={
              authModalOpen
            }

            initialMode={
              authModalMode
            }

            onClose={() =>
              setAuthModalOpen(
                false
              )
            }
          />

        </>
      )}
    </>
  );
}

export default App;