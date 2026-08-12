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
  savePredictionToCloud,
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
  const [activeTab, setActiveTab] =
    useState<NavTab>("dashboard");

  const [currentUser, setCurrentUser] =
    useState<FirebaseUser | null>(null);

  const [guestAccess, setGuestAccess] =
    useState(false);

  const [authModalOpen, setAuthModalOpen] =
    useState(false);

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

  const [loading, setLoading] =
    useState(false);

  const [isSyncing, setIsSyncing] =
    useState(false);

  /*
   * Real-time prediction toggle.
   */
  const [realtimeSync, setRealtimeSync] =
    useState(false);

  const [error, setError] =
    useState("");

  const [hasAnalyzed, setHasAnalyzed] =
    useState(false);

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

  useEffect(() => {
    const unsubscribe =
      subscribeGlobalPredictions(
        (docs) => {
          /*
           * FIRESTORE IS THE SINGLE SOURCE OF TRUTH.
           * Dashboard and Analytics are always rebuilt from
           * persisted Firestore documents.
           */
          if (Array.isArray(docs)) {
            console.log(
              `\ud83d\udd25 Firestore predictions loaded: ${docs.length}`
            );
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
              resolve(
                reader.result as string
              );
            };

            reader.onerror = () => {
              reject(
                new Error(
                  "Failed to read image"
                )
              );
            };

            reader.readAsDataURL(
              targetInput.image!
            );
          }
        );

        imageMimeType =
          targetInput.image.type;
      }

      // ========================================================
      // API PAYLOAD
      // ========================================================

      const payload = {
        caption: targetInput.caption,
        post_hour: targetInput.post_hour,
        day_of_week: targetInput.day_of_week,
        follower_count:
          targetInput.follower_count,

        early_likes:
          targetInput.early_likes,

        early_comments:
          targetInput.early_comments,

        early_shares:
          targetInput.early_shares,

        saves: targetInput.saves,
        reach: targetInput.reach,
        impressions: targetInput.impressions,

        media_type:
          targetInput.media_type,

        content_category:
          targetInput.content_category,

        platform:
          targetInput.platform,

        model:
          targetInput.model,

        keywords:
          targetInput.keywords,

        hashtags:
          targetInput.hashtags,

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

      /*
       * IMPORTANT:
       *
       * Frontend calls:
       *
       * /api/predict
       *
       * The request is handled by server.ts.
       *
       * server.ts then communicates with FastAPI.
       *
       * Therefore we keep this as:
       *
       * ${API_BASE_URL}/api/predict
       */

      const response = await fetch(
        `${API_BASE_URL}/api/predict`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const text =
          await response.text();

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

      // ========================================================
      // BACKEND FAILURE
      // ========================================================

      if (data.success === false) {
        throw new Error(
          data.message ||
            "Prediction Failed"
        );
      }

      // ========================================================
      // GET REAL PREDICTION
      // ========================================================

      /*
       * server.ts returns:
       *
       * {
       *   success: true,
       *   prediction: {...},
       *   recommendation_report: {...},
       *   recommendations: [...],
       *   explainable_ai: {...}
       * }
       *
       * We must NOT throw away those fields.
       */

      const prediction =
        data.prediction ?? data;

      if (!prediction) {
        throw new Error(
          data.message ||
            "Backend did not return prediction data."
        );
      }

      // ========================================================
      // REAL VIRALITY SCORE
      // ========================================================

      /*
       * The real FastAPI ML model returns:
       *
       * viral_probability
       *
       * Example:
       *
       * 0.791
       *
       * This means:
       *
       * 79.1%
       *
       * If server.ts has already converted this to
       * viralityScore, use that value.
       *
       * Otherwise convert the real ML probability here.
       *
       * NO RANDOM VALUE.
       * NO MOCK VALUE.
       */

      let realViralityScore =
        Number(
          prediction.viralityScore
        );

      if (
        !Number.isFinite(
          realViralityScore
        )
      ) {
        const realProbability =
          Number(
            prediction.viral_probability
          );

        if (
          Number.isFinite(
            realProbability
          )
        ) {
          realViralityScore =
            realProbability * 100;
        }
      }

      if (
        !Number.isFinite(
          realViralityScore
        )
      ) {
        throw new Error(
          "Backend did not return a valid ML virality probability."
        );
      }

      // Keep score between 0 and 100.
      realViralityScore =
        Math.max(
          0,
          Math.min(
            100,
            realViralityScore
          )
        );

      // ========================================================
      // KEEP REAL BACKEND RESPONSE
      // ========================================================

      /*
       * IMPORTANT FIX:
       *
       * Previously your code created:
       *
       * {
       *   success: true,
       *   prediction: prediction
       * }
       *
       * That removed:
       *
       * recommendation_report
       * recommendations
       * explainable_ai
       *
       * Now we keep ALL fields returned by server.ts.
       */

      const normalizedPrediction = {
        ...prediction,

        /*
         * Only add viralityScore when the backend did not
         * already provide it.
         *
         * This is still the real ML probability.
         */
        viralityScore:
          Number.isFinite(
            Number(
              prediction.viralityScore
            )
          )
            ? Number(
                prediction.viralityScore
              )
            : realViralityScore,
      };

      const normalizedResponse:
        PredictApiResponse = {
        ...data,

        success: true,

        prediction:
          normalizedPrediction,

        /*
         * VERY IMPORTANT:
         * Preserve recommendation report.
         */
        recommendation_report:
          data.recommendation_report,

        /*
         * Preserve recommendation list.
         */
        recommendations:
          data.recommendations,

        /*
         * Preserve explainable AI data.
         */
        explainable_ai:
          data.explainable_ai,
      };

      console.log(
        "Normalized REAL prediction:",
        normalizedResponse
      );

      console.log(
        "Recommendation report:",
        normalizedResponse
          .recommendation_report
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

      const viralityScore =
        Math.max(
          0,
          Math.min(
            100,
            Number(
              normalizedPrediction
                .viralityScore
            )
          )
        );

      const confidenceValue =
        Number.isFinite(
          Number(
            normalizedPrediction
              .confidence
          )
        )
          ? Number(
              normalizedPrediction
                .confidence
            )
          : viralityScore;

      const predictedReach =
        normalizedPrediction
          .predictedReach ??
        normalizedPrediction
          .reachForecast ??
        "—";

      const newHistory:
        HistoryEntry = {
        id:
          Date.now().toString(),

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
      // SAVE TO FIRESTORE FIRST
      // ========================================================
      //
      // Firestore is the permanent source of truth.
      // We wait for the write to succeed before updating the
      // local React history. This prevents the UI from showing
      // a new count that disappears after a page refresh.
      // ========================================================

      const firestoreUserId =
        currentUser?.uid || "guest_user";

      let firestorePredictionId: string;

      try {
        firestorePredictionId =
          await savePredictionToCloud(
            firestoreUserId,
            {
              platform: targetInput.platform,
              caption: targetInput.caption,
              captionSnippet: targetInput.caption,
              imageUrl: imageBase64,
              followers: targetInput.follower_count,
              likes: targetInput.early_likes,
              comments: targetInput.early_comments,
              postingTime: targetInput.post_hour,
              viralityScore: viralityScore,
              confidence: confidenceValue,
              predictedReach: predictedReach,
              performanceCategory:
                normalizedPrediction.performanceCategory,
              topHook: normalizedPrediction.topHook,
              timestamp: new Date().toISOString(),
            }
          );

        console.log(
          "\u2705 Prediction successfully persisted to Firestore:",
          firestorePredictionId
        );
      } catch (firestoreError: any) {
        console.error(
          "\u274c Prediction was NOT persisted to Firestore:",
          firestoreError
        );

        throw new Error(
          firestoreError?.message ||
            "Prediction was generated but could not be saved to Firestore. Please check your Firestore permissions and try again."
        );
      }

      // ========================================================
      // UPDATE LOCAL HISTORY ONLY AFTER FIRESTORE SUCCESS
      // ========================================================

      const persistedHistoryEntry: HistoryEntry = {
        ...newHistory,
        id: firestorePredictionId,
      };

      setPredictionHistory(
        (previousHistory) => [
          persistedHistoryEntry,

          ...previousHistory
            .filter(
              (item) =>
                item.id !== firestorePredictionId
            )
            .slice(0, 49),
        ]
      );

      console.log(
        "\u2705 Local prediction history updated from persisted Firestore document:",
        firestorePredictionId
      );

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

  useEffect(() => {
    if (!realtimeSync) {
      return;
    }

    const hasContent = Boolean(
      (predictionInput.caption &&
        predictionInput.caption
          .trim()
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

            /*
             * IMPORTANT:
             * The REAL recommendation report from
             * recommendation_engine.py is passed here.
             */
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
      {!currentUser &&
      !guestAccess ? (
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