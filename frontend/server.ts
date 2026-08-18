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

function getSimulatedChatResponse(message: string, context?: any) {
  const msgLower = (message || "").toLowerCase();

  // Context-aware fallback: if we have real prediction data and the user
  // is asking a generic "what should I improve" question, answer with
  // the actual top weakness instead of the generic canned reply below.
  if (
    context &&
    (msgLower.includes("improve") ||
      msgLower.includes("suggest") ||
      msgLower.includes("better") ||
      msgLower.includes("viral") ||
      msgLower.includes("wrong"))
  ) {
    const topWeakness =
      Array.isArray(context.weaknesses) && context.weaknesses.length > 0
        ? context.weaknesses[0]
        : null;

    if (topWeakness) {
      return `Based on your current prediction (${
        typeof context.viralityScore === "number" ? context.viralityScore : "?"
      }% virality), the highest-impact fix right now is: ${topWeakness} Address that first, then revisit hashtags and posting time.`;
    }
  }

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
// AI Advisor context -> Gemini system instruction
//
// Builds a system prompt that includes the ACTUAL current prediction
// result (caption, score, strengths/weaknesses, etc.) when the frontend
// sends one, so the advisor can answer using real data instead of
// asking the user to re-paste it. Falls back to an honest "no
// prediction yet" instruction when context is absent -- never pretends
// to have data it doesn't.
//
// UPDATED (this pass): two correctness fixes based on real chat output
// review --
//
// 1. Gemini was fabricating a numeric "caption score" (e.g. "83/100")
//    that does not exist anywhere in AdvisorContext, and was also
//    stating a precise new predicted percentage (e.g. "83%-88%") after
//    hypothetical changes as if it had re-run the ML model. The old
//    rule ("never invent a score... not listed above") was too vague --
//    it didn't explicitly cover fabricated *sub*-metrics or predictive
//    percentages phrased with false precision. Rule 1 and rule 5 below
//    close that gap.
//
// 2. Gemini was replying with full markdown (###, **, >, ---), but the
//    chat bubble in AIConsultantModal.tsx renders plain text only
//    (whitespace-pre-line, no markdown parser) -- so users were seeing
//    literal asterisks/hashes/angle-brackets in the UI. Rule 6 tells
//    Gemini to stop using markdown syntax entirely.
// ------------------------------------------------------------

function buildAdvisorSystemInstruction(context: any): string {
  const base =
    "You are the ViralAI Chief Virality Architect, a virality consultant embedded inside a prediction tool.";

  if (!context || typeof context !== "object") {
    return (
      base +
      " No prediction result has been shared for this conversation yet. If the user asks how to improve or go viral, tell them to run a prediction first (or paste their caption/details directly) so you have real data to work from -- do not fabricate a score or caption you were not given. You may still give general best-practice guidance if they ask a broad question, but be upfront that it's general advice, not analysis of a specific post." +
      " Format your replies as plain conversational text suitable for a small chat bubble -- no markdown headers (###), bold asterisks, blockquotes (>), or horizontal rules (---). Use short paragraphs and simple numbered lists (1. 2. 3.) only, since markdown symbols will render as literal characters, not formatting."
    );
  }

  const lines: string[] = [base, ""];

  lines.push(
    "The user currently has a REAL post loaded in the prediction tool. This is not optional background info -- it is the subject of this conversation. Treat every question, however generically phrased (\"how do I go viral\", \"how can I improve\", \"any tips\"), as a question about THIS specific post unless the user clearly asks about something else entirely. Do not default to a generic framework/checklist when this data is available -- open your answer by referencing at least one concrete detail from below (the caption, the score, or a specific weakness), then build your advice around it."
  );

  lines.push("");
  lines.push("CURRENT POST DATA:");

  if (context.caption) lines.push(`- Caption: "${context.caption}"`);
  if (context.platform) lines.push(`- Platform: ${context.platform}`);
  if (context.category) lines.push(`- Category: ${context.category}`);
  if (context.mediaType) lines.push(`- Media type: ${context.mediaType}`);
  if (typeof context.viralityScore === "number") {
    lines.push(`- Predicted virality score: ${context.viralityScore}%`);
  }

  if (context.postingTime) {
    lines.push(
      `- Posting time: ${context.postingTime.current_time ?? "unspecified"} ` +
        `(status: ${context.postingTime.performance ?? "unknown"}, ` +
        `recommended window: ${context.postingTime.recommended_window ?? "unknown"})`
    );
  }

  if (Array.isArray(context.strengths) && context.strengths.length > 0) {
    lines.push(`- Strengths already identified: ${context.strengths.join("; ")}`);
  }

  if (Array.isArray(context.weaknesses) && context.weaknesses.length > 0) {
    lines.push(`- Weaknesses already identified: ${context.weaknesses.join("; ")}`);
  }

  if (Array.isArray(context.suggestedHashtags) && context.suggestedHashtags.length > 0) {
    lines.push(`- System-suggested hashtags: ${context.suggestedHashtags.join(", ")}`);
  }

  if (Array.isArray(context.topImprovements) && context.topImprovements.length > 0) {
    lines.push("- Top improvements already identified by the system:");
    for (const imp of context.topImprovements.slice(0, 5)) {
      lines.push(`  * ${imp.title}: ${imp.why} ${imp.how}`);
    }
  }

  lines.push("");
  lines.push(
    "Rules: " +
    "(1) Never invent a score, caption, or metric not listed above -- this includes fabricated sub-scores like a numeric \"caption score\", \"visual score\", or \"engagement score\" that are not explicitly provided in CURRENT POST DATA. If you want to describe caption or image quality, use qualitative language (e.g. \"your caption is a bit generic\" or \"the caption is on the shorter side\") instead of making up a number. " +
    "(2) Never ask the user to paste data that's already listed above. " +
    "(3) Keep answers focused and specific to this post rather than a long generic multi-phase framework -- 3 to 6 concrete, prioritized suggestions is usually enough. " +
    "(4) You may add general technique/best-practice color, but it must be applied TO this post's actual weaknesses, not offered as a standalone checklist. " +
    "(5) If asked to predict a new score after hypothetical changes, do NOT state a precise new percentage or percentage range as if it were recalculated by the ML model -- you have not re-run any prediction. Instead, describe the expected DIRECTION and rough MAGNITUDE qualitatively (e.g. \"this should meaningfully improve your score, though the exact number would need a fresh prediction run\") and explicitly say a new prediction run is needed for an actual number. " +
    "(6) Format replies as plain conversational text suitable for a small chat bubble -- no markdown headers (###), bold asterisks (**text**), blockquotes (>), or horizontal rules (---). Use short paragraphs and simple numbered lists (1. 2. 3.) only, since markdown symbols will render as literal characters, not formatting, in this UI."
  );

  return lines.join("\n");
}

// ------------------------------------------------------------
// Gemini caption generation (Step 3)
//
// Reuses the same `ai` client and chats.create()/sendMessage() pattern
// as /api/chat. Falls back honestly (not silently) when GEMINI_API_KEY
// is missing or the call fails -- caller must check `source` and never
// present a non-"gemini" result as if Gemini generated it.
// ------------------------------------------------------------

async function generateCaptionWithGemini(params: {
  originalCaption: string;
  category: string;
  platform: string;
  imageAnalysis?: any;
}): Promise<{ caption: string | null; source: "gemini" | "unavailable" | "error"; reason?: string }> {
  if (!ai) {
    return {
      caption: null,
      source: "unavailable",
      reason: "GEMINI_API_KEY is not configured on the server.",
    };
  }

  try {
    const imageContext =
      params.imageAnalysis && params.imageAnalysis.brightness !== undefined
        ? `The uploaded image is ${params.imageAnalysis.brightness_label || ""}, ${
            params.imageAnalysis.tone || ""
          }, ${params.imageAnalysis.composition || ""}, with ${
            params.imageAnalysis.detail_label || "moderate detail"
          }.`
        : "No image was supplied.";

    const prompt = [
      `Original caption: "${params.originalCaption || "(empty)"}"`,
      `Content category: ${params.category}`,
      `Target platform: ${params.platform}`,
      imageContext,
      "",
      "Rewrite this into a genuinely improved social media caption for the target platform. Keep the original idea/topic. Add a natural hook and a touch of personality, and end with a specific question or call-to-action that actually fits this content -- not a generic one. Keep it concise (roughly 20-40 words). Return ONLY the caption text, no preamble, no quotes, no markdown.",
    ].join("\n");

    const chat = ai.chats.create({
      model: "gemini-3.6-flash",
      config: {
        systemInstruction:
          "You are a social media copywriter. You write concise, natural, platform-appropriate captions. You never use robotic templated phrasing.",
      },
      history: [],
    });

    const response = await chat.sendMessage({ message: prompt });
    const text = (response.text || "").trim();

    if (!text) {
      return { caption: null, source: "error", reason: "Gemini returned an empty response." };
    }

    return { caption: text, source: "gemini" };
  } catch (error: any) {
    console.warn(
      "Gemini caption generation failed, falling back to template caption:",
      error?.message || error
    );
    return { caption: null, source: "error", reason: error?.message || "Gemini API call failed." };
  }
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
      keywords,
      hashtags,
      imageBase64,
      imageMimeType,
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

      keywords: keywords || "",
      hashtags: hashtags || "",
      imageBase64: imageBase64 || "",
      imageMimeType: imageMimeType || "",
    };

    console.log(
      "Sending real ML prediction request to FastAPI:",
      {
        ...predictionPayload,
        imageBase64: predictionPayload.imageBase64
          ? `<${predictionPayload.imageBase64.length} chars>`
          : "",
      }
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
    // Step 3: replace the static per-category caption template with a
    // genuine Gemini rewrite. If Gemini is unavailable or fails, KEEP
    // the Python template but label it honestly via caption_source --
    // never present the template as if Gemini generated it.
    // --------------------------------------------------------

    if (recommendationReport?.caption_analysis) {
      const geminiResult = await generateCaptionWithGemini({
        originalCaption: predictionPayload.caption,
        category:
          recommendationReport.category ||
          predictionPayload.content_category,
        platform: predictionPayload.platform,
        imageAnalysis: recommendationReport.image_analysis,
      });

      if (geminiResult.source === "gemini" && geminiResult.caption) {
        recommendationReport.caption_analysis.ai_suggested_caption =
          geminiResult.caption;
        recommendationReport.caption_analysis.caption_source = "gemini";
        recommendationReport.caption_analysis.reason =
          "Generated by Gemini based on your original caption, topic, and image analysis.";
      } else {
        recommendationReport.caption_analysis.caption_source =
          geminiResult.source; // "unavailable" | "error"
        recommendationReport.caption_analysis.caption_source_note =
          geminiResult.reason || "";
      }
    }
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
    // --------------------------------------------------------

    const confidence = Math.round(
      Math.abs(viralProbability - 0.5) * 200
    );

    // --------------------------------------------------------
    // Reach forecast / AI Content Coach
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
    // AI Content Coach -- always sent as an OBJECT
    // --------------------------------------------------------

    const safeAiContentCoach = {
      message: reachForecast,
      current_virality:
        aiContentCoach &&
        typeof aiContentCoach === "object" &&
        typeof aiContentCoach.current_virality === "string"
          ? aiContentCoach.current_virality
          : `${viralityScore}%`,
    };

    // --------------------------------------------------------
    // Sentiment
    // --------------------------------------------------------

    let sentiment =
      sentimentAnalysis?.emotion ||
      sentimentAnalysis?.recommendation ||
      recommendationReport?.sentiment ||
      "Based on caption sentiment analysis.";

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

      sentiment,

      engagementProbability,

      confidence,

      reachForecast,

      explainableAI,

      hashtagIntelligence,

      suggestedHooks,

      textualFeatures: {
        semanticKeywords:
          recommendationReport?.caption_analysis
            ?.semantic_keywords || [],

        algorithmKeywords:
          "TF-IDF Vectorizer + VADER",

        sentiment:
          sentimentAnalysis,
      },

      visualFeatures: {
        message: predictionPayload.imageBase64
          ? "Image was analyzed using handcrafted visual features (brightness, colorfulness, edge density, saturation, warm/cool ratio, aspect ratio) as part of the ML prediction."
          : "No image was supplied for this prediction -- neutral default visual features were used instead.",
      },

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

      pipelineBreakdown: {
        fusionLayer:
          "Text + Image + Metadata ML Prediction",

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

      mocked: false,

      recommendationReport: recommendationReport
        ? {
            ...recommendationReport,
            ai_content_coach: safeAiContentCoach,
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
              ai_content_coach: safeAiContentCoach,
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
    context,
  } = req.body;

  if (!ai) {
    const reply =
      getSimulatedChatResponse(
        message || "",
        context
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
            buildAdvisorSystemInstruction(context),
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
        message || "",
        context
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