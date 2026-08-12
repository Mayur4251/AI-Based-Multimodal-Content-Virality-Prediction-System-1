import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// FastAPI backend URL
const PYTHON_API_URL =
  process.env.PYTHON_API_URL || "http://127.0.0.1:8000";

// ------------------------------------------------------------
// Middleware
// ------------------------------------------------------------

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// ------------------------------------------------------------
// Gemini client
// ------------------------------------------------------------

let ai: GoogleGenAI | null = null;

const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    console.log("✓ Gemini AI initialized successfully.");
  } catch (error) {
    console.error("✗ Failed to initialize Gemini AI:", error);
  }
} else {
  console.log(
    "⚠ GEMINI_API_KEY not configured. Chat AI will use fallback mode."
  );
}

// ------------------------------------------------------------
// Chat fallback
// ------------------------------------------------------------

function getSimulatedChatResponse(message: string) {
  const msgLower = message.toLowerCase();

  if (
    msgLower.includes("caption") ||
    msgLower.includes("hook") ||
    msgLower.includes("write")
  ) {
    return "Your caption should begin with a clear topic or curiosity-driven statement and then give the audience a reason to continue reading.";
  }

  if (
    msgLower.includes("hashtag") ||
    msgLower.includes("tag") ||
    msgLower.includes("keyword")
  ) {
    return "Use hashtags that are directly related to the actual topic of your post instead of generic high-volume hashtags.";
  }

  if (
    msgLower.includes("image") ||
    msgLower.includes("visual") ||
    msgLower.includes("color") ||
    msgLower.includes("photo")
  ) {
    return "Use a clear image with a strong focal subject, good lighting and minimal visual clutter.";
  }

  if (
    msgLower.includes("time") ||
    msgLower.includes("when") ||
    msgLower.includes("schedule")
  ) {
    return "Use the posting-time recommendation generated from the historical dataset and your selected posting hour.";
  }

  return "The recommendation should be based on your caption, engagement signals, audience size, posting time and content category.";
}

// ------------------------------------------------------------
// Prediction API
//
// Real prediction is handled by FastAPI.
// server.ts does NOT generate random virality scores.
// ------------------------------------------------------------

app.post("/api/predict", async (req, res) => {
  try {
    const {
      caption,
      post_hour,
      day_of_week,
      follower_count,
      early_likes,
      early_comments,
      early_shares,
      saves,
      reach,
      impressions,
      media_type,
      content_category,
      platform,
      model,
    } = req.body;

    // --------------------------------------------------------
    // Basic validation
    // --------------------------------------------------------

    if (!caption || !String(caption).trim()) {
      return res.status(400).json({
        success: false,
        message: "Caption is required.",
      });
    }

    // --------------------------------------------------------
    // Build payload for Python ML backend
    // --------------------------------------------------------

    const predictionPayload = {
      caption: String(caption).trim(),

      post_hour: Number(post_hour ?? 18),
      day_of_week: Number(day_of_week ?? 1),

      follower_count: Number(follower_count ?? 0),

      early_likes: Number(early_likes ?? 0),
      early_comments: Number(early_comments ?? 0),
      early_shares: Number(early_shares ?? 0),

      saves: Number(saves ?? 0),
      reach: Number(reach ?? 0),
      impressions: Number(impressions ?? 0),

      media_type: media_type || "image",
      content_category: content_category || "Lifestyle",

      platform: platform || "Instagram",
      model: model || "ensemble",
    };

    console.log(
      "Sending real ML prediction request to FastAPI:",
      predictionPayload
    );

    // --------------------------------------------------------
    // Call Python FastAPI backend
    // --------------------------------------------------------

    const response = await fetch(`${PYTHON_API_URL}/api/predict`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(predictionPayload),
    });

    // --------------------------------------------------------
    // Handle FastAPI error
    // --------------------------------------------------------

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "FastAPI prediction error:",
        response.status,
        errorText
      );

      return res.status(502).json({
        success: false,
        message:
          `Python ML backend returned ${response.status}: ` +
          errorText.slice(0, 500),
      });
    }

    // --------------------------------------------------------
    // Read FastAPI response
    // --------------------------------------------------------

    const data = await response.json();

    console.log("Real FastAPI prediction response:", data);

    if (data.success === false) {
      return res.status(500).json({
        success: false,
        message: data.message || "Prediction failed.",
      });
    }

    // --------------------------------------------------------
    // Extract prediction
    // --------------------------------------------------------

    const backendPrediction = data.prediction || {};

    const viralProbability = Number(
      backendPrediction.viral_probability ?? 0
    );

    const viralityScore = Math.round(
      Math.max(0, Math.min(1, viralProbability)) * 100
    );

    // --------------------------------------------------------
    // Recommendation report
    // --------------------------------------------------------

    const recommendationReport =
      data.recommendation_report || null;

    // --------------------------------------------------------
    // Get recommendation information
    // --------------------------------------------------------

    const sentimentAnalysis =
      recommendationReport?.sentiment_analysis ||
      recommendationReport?.sentiment ||
      recommendationReport?.caption_analysis?.sentiment ||
      {};

    const engagementAnalysis =
      recommendationReport?.engagement_analysis || {};

    const explainability =
      recommendationReport?.explainability || {};

    const priorityActions =
      recommendationReport?.priority_actions || [];

    // --------------------------------------------------------
    // Engagement percentage
    //
    // Prefer the recommendation engine's actual engagement
    // percentage when available.
    // --------------------------------------------------------

    let engagementProbability = 0;

    if (
      typeof engagementAnalysis.engagement_rate_percent ===
      "number"
    ) {
      engagementProbability = Math.round(
        engagementAnalysis.engagement_rate_percent
      );
    } else if (
      typeof engagementAnalysis.engagement_rate ===
      "number"
    ) {
      engagementProbability = Math.round(
        engagementAnalysis.engagement_rate
      );
    } else {
      engagementProbability = viralityScore;
    }

    engagementProbability = Math.max(
      0,
      Math.min(100, engagementProbability)
    );

    // --------------------------------------------------------
    // Confidence
    //
    // Confidence is calculated from the ML probability.
    // It is NOT randomly generated.
    // --------------------------------------------------------

    const confidence = Math.round(
      Math.abs(viralProbability - 0.5) * 200
    );

    // --------------------------------------------------------
    // Reach forecast / AI Content Coach
    //
    // IMPORTANT:
    // ai_content_coach can be an OBJECT from the Python backend.
    // React cannot directly render an object.
    //
    // Keep the original recommendation report unchanged, but
    // create a frontend-safe string for the AI Content Coach
    // value so PredictionResult.tsx never receives a raw object
    // where a React child is expected.
    // --------------------------------------------------------

    let reachForecast = "Not available";

    const aiContentCoach =
      recommendationReport?.ai_content_coach;

    if (typeof aiContentCoach === "string") {
      reachForecast = aiContentCoach;
    } else if (
      aiContentCoach &&
      typeof aiContentCoach === "object"
    ) {
      if (
        typeof aiContentCoach.message === "string"
      ) {
        reachForecast =
          aiContentCoach.message;
      } else if (
        typeof aiContentCoach.reach_forecast === "string"
      ) {
        reachForecast =
          aiContentCoach.reach_forecast;
      } else if (
        typeof aiContentCoach.reachForecast === "string"
      ) {
        reachForecast =
          aiContentCoach.reachForecast;
      } else if (
        typeof aiContentCoach.current_virality === "string"
      ) {
        reachForecast =
          `Current virality: ${aiContentCoach.current_virality}`;
      } else {
        reachForecast = JSON.stringify(aiContentCoach);
      }
    }

    // --------------------------------------------------------
    // Sentiment
    // --------------------------------------------------------

    let sentiment =
      sentimentAnalysis?.emotion ||
      sentimentAnalysis?.recommendation ||
      recommendationReport?.sentiment ||
      "Based on caption sentiment analysis.";

    // Make sure sentiment is always a string
    if (typeof sentiment !== "string") {
      sentiment = "Based on caption sentiment analysis.";
    }

    // --------------------------------------------------------
    // Explainable AI
    // --------------------------------------------------------

    const explainableAI: string[] = [];

    if (
      Array.isArray(explainability.top_factors)
    ) {
      for (
        const factor of explainability.top_factors
      ) {
        if (factor?.reason) {
          explainableAI.push(
            `${factor.name}: ${factor.reason}`
          );
        }
      }
    }

    if (explainableAI.length === 0) {
      if (
        Array.isArray(
          recommendationReport?.strengths
        )
      ) {
        explainableAI.push(
          ...recommendationReport.strengths
        );
      }

      if (
        Array.isArray(
          recommendationReport?.weaknesses
        )
      ) {
        explainableAI.push(
          ...recommendationReport.weaknesses
        );
      }
    }

    // --------------------------------------------------------
    // Hashtag recommendations
    // --------------------------------------------------------

    const hashtagIntelligence =
      recommendationReport?.hashtag_analysis
        ?.recommended || [];

    // --------------------------------------------------------
    // Suggested hooks
    // --------------------------------------------------------

    const suggestedHooks =
      recommendationReport?.caption_analysis
        ?.suggested_hooks || [];

    // --------------------------------------------------------
    // Build frontend-compatible prediction object
    // --------------------------------------------------------

    const prediction = {
      // Main ML result
      viralityScore,

      viral_probability: Number(
        viralProbability.toFixed(4)
      ),

      viral:
        backendPrediction.viral ??
        Number(viralProbability >= 0.5),

      model:
        backendPrediction.model ||
        model ||
        "ensemble",

      // Analysis
      sentiment,

      engagementProbability,

      confidence,

      reachForecast,

      explainableAI,

      hashtagIntelligence,

      suggestedHooks,

      // ------------------------------------------------------
      // Textual features
      // ------------------------------------------------------

      textualFeatures: {
        semanticKeywords:
          recommendationReport?.caption_analysis
            ?.semantic_keywords || [],

        algorithmKeywords:
          "TF-IDF Vectorizer + VADER",

        sentiment:
          sentimentAnalysis,
      },

      // ------------------------------------------------------
      // Image information
      //
      // Image is NOT used for ML virality prediction.
      // ------------------------------------------------------

      visualFeatures: {
        message:
          "Image content is not used for ML prediction. Prediction is based on caption and structured input data.",
      },

      // ------------------------------------------------------
      // Metadata features
      // ------------------------------------------------------

      metadataFeatures: {
        postHour:
          predictionPayload.post_hour,

        dayOfWeek:
          predictionPayload.day_of_week,

        followerCount:
          predictionPayload.follower_count,

        earlyLikes:
          predictionPayload.early_likes,

        earlyComments:
          predictionPayload.early_comments,

        earlyShares:
          predictionPayload.early_shares,

        saves:
          predictionPayload.saves,

        reach:
          predictionPayload.reach,

        impressions:
          predictionPayload.impressions,

        mediaType:
          predictionPayload.media_type,

        contentCategory:
          predictionPayload.content_category,

        platform:
          predictionPayload.platform,
      },

      // ------------------------------------------------------
      // ML pipeline
      // ------------------------------------------------------

      pipelineBreakdown: {
        fusionLayer:
          "Text + Metadata ML Prediction",

        ensembleModels: {
          model:
            backendPrediction.model ||
            model ||
            "ensemble",

          viralProbability:
            Number(
              viralProbability.toFixed(4)
            ),
        },
      },

      // ------------------------------------------------------
      // IMPORTANT:
      // This is a REAL prediction.
      // ------------------------------------------------------

      mocked: false,

      // Complete recommendation report
      //
      // Keep all recommendation data intact, but make
      // ai_content_coach React-safe because the backend can
      // return it as an object.
      recommendationReport: recommendationReport
        ? {
            ...recommendationReport,
            ai_content_coach: reachForecast,
          }
        : null,
    };

    // --------------------------------------------------------
    // Final response
    // --------------------------------------------------------

    return res.json({
      success: true,

      prediction,

      recommendation_report:
        recommendationReport
          ? {
              ...recommendationReport,
              ai_content_coach: reachForecast,
            }
          : null,

      recommendations:
        priorityActions,

      explainable_ai:
        explainability,

      source:
        "python_ml_backend",
    });
  } catch (error: any) {
    console.error(
      "Prediction API error:",
      error?.message || error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Unable to connect to the Python ML backend.",
    });
  }
});

// ------------------------------------------------------------
// Chat API
// ------------------------------------------------------------

app.post("/api/chat", async (req, res) => {
  const {
    message,
    history,
  } = req.body;

  if (!ai) {
    const reply =
      getSimulatedChatResponse(
        message || ""
      );

    return res.json({
      reply,
      mocked: true,
    });
  }

  try {
    const formattedHistory =
      (history || []).map(
        (msg: any) => ({
          role:
            msg.role === "user"
              ? "user"
              : "model",

          parts: [
            {
              text: msg.content,
            },
          ],
        })
      );

    const chat =
      ai.chats.create({
        model:
          "gemini-3.6-flash",

        config: {
          systemInstruction:
            "You are the ViralAI Chief Virality Architect. Analyze social media content, captions, engagement patterns, posting strategy and audience behavior. Give practical, specific and evidence-based recommendations. Do not invent metrics or claim that a recommendation is based on data unless data is provided.",
        },

        history:
          formattedHistory,
      });

    const response =
      await chat.sendMessage({
        message,
      });

    return res.json({
      reply: response.text,
      mocked: false,
    });
  } catch (error: any) {
    console.warn(
      "Gemini Chat Notice - activating fallback assistant:",
      error?.message || error
    );

    const reply =
      getSimulatedChatResponse(
        message || ""
      );

    return res.json({
      reply,

      mocked: true,

      fallbackMode: true,

      fallbackReason:
        error?.message ||
        "Gemini API unavailable.",
    });
  }
});

// ------------------------------------------------------------
// Vite integration
// ------------------------------------------------------------

async function run() {
  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    const vite =
      await createViteServer({
        server: {
          middlewareMode: true,
        },

        appType: "spa",
      });

    app.use(
      vite.middlewares
    );

    console.log(
      "✓ Vite Dev Middleware mounted."
    );
  } else {
    const distPath =
      path.join(
        process.cwd(),
        "dist"
      );

    app.use(
      express.static(
        distPath
      )
    );

    app.get(
      "*",
      (req, res) => {
        res.sendFile(
          path.join(
            distPath,
            "index.html"
          )
        );
      }
    );

    console.log(
      "✓ Serving production build from dist/."
    );
  }

  app.listen(
    PORT,
    "0.0.0.0",
    () => {
      console.log(
        `🚀 ViralAI Server listening on http://localhost:${PORT}`
      );

      console.log(
        `🐍 Python ML backend: ${PYTHON_API_URL}`
      );
    }
  );
}

run().catch(
  (err) => {
    console.error(
      "Fatal startup error:",
      err
    );
  }
);