import React from "react";
import { Sparkles, Download, Printer, Zap, BarChart3 } from "lucide-react";
import { HistoryEntry } from "../types";

interface AnalyticsViewProps {
  realtimePredictions: HistoryEntry[];
}

export default function AnalyticsView({
  realtimePredictions,
}: AnalyticsViewProps) {
  /*
   * ============================================================
   * REAL-TIME DATA NORMALIZATION
   * ============================================================
   */

  const safePredictions = Array.isArray(realtimePredictions)
    ? realtimePredictions
    : [];

  /*
   * Get a valid virality score from each prediction.
   *
   * Primary field:
   *   p.viralityScore
   *
   * The fallback checks make the analytics page safer if the
   * backend response structure changes slightly.
   */
  const getViralityScore = (prediction: any): number => {
    const possibleScore =
      prediction?.viralityScore ??
      prediction?.prediction?.viralityScore ??
      prediction?.score ??
      prediction?.prediction?.score;

    const numericScore = Number(possibleScore);

    if (!Number.isFinite(numericScore)) {
      return 0;
    }

    return Math.max(0, Math.min(100, numericScore));
  };

  /*
   * Only valid real-time prediction records are used.
   */
  const realtimeScores = safePredictions.map(getViralityScore);

  /*
   * ============================================================
   * REAL-TIME BASIC METRICS
   * ============================================================
   */

  const totalInferences = realtimeScores.length;

  const avgScore =
    totalInferences > 0
      ? realtimeScores.reduce((sum, score) => sum + score, 0) /
        totalInferences
      : 0;

  /*
   * ============================================================
   * REAL-TIME VIRALITY CLASSIFICATION
   * ============================================================
   */

  const highViralityCount = realtimeScores.filter(
    (score) => score >= 80
  ).length;

  const moderateViralityCount = realtimeScores.filter(
    (score) => score >= 50 && score < 80
  ).length;

  const lowViralityCount = realtimeScores.filter(
    (score) => score < 50
  ).length;

  /*
   * Always return a number.
   * This prevents NaN from appearing in the UI.
   */

  const highViralityRate =
    totalInferences > 0
      ? (highViralityCount / totalInferences) * 100
      : 0;

  const moderateViralityRate =
    totalInferences > 0
      ? (moderateViralityCount / totalInferences) * 100
      : 0;

  const lowViralityRate =
    totalInferences > 0
      ? (lowViralityCount / totalInferences) * 100
      : 0;

  /*
   * ============================================================
   * REAL-TIME MODEL CONFIDENCE
   * ============================================================
   *
   * Different backend versions may call this field:
   *   confidence
   *   modelConfidence
   *   predictionConfidence
   *
   * If the backend doesn't provide confidence yet, we use 0
   * rather than displaying NaN.
   */

  const getConfidence = (prediction: any): number | null => {
    const possibleConfidence =
      prediction?.modelConfidence ??
      prediction?.confidence ??
      prediction?.predictionConfidence ??
      prediction?.prediction?.modelConfidence ??
      prediction?.prediction?.confidence ??
      prediction?.prediction?.predictionConfidence;

    if (
      possibleConfidence === undefined ||
      possibleConfidence === null ||
      possibleConfidence === ""
    ) {
      return null;
    }

    let value = Number(possibleConfidence);

    if (!Number.isFinite(value)) {
      return null;
    }

    /*
     * If backend sends confidence as 0-1,
     * convert it to 0-100.
     */
    if (value >= 0 && value <= 1) {
      value = value * 100;
    }

    return Math.max(0, Math.min(100, value));
  };

  const confidenceValues = safePredictions
    .map(getConfidence)
    .filter((value): value is number => value !== null);

  const meanModelConfidence =
    confidenceValues.length > 0
      ? confidenceValues.reduce((sum, value) => sum + value, 0) /
        confidenceValues.length
      : 0;

  /*
   * ============================================================
   * BAR GRAPH DATA
   * ============================================================
   */

  const viralityChartData = [
    {
      name: "Viral",
      count: highViralityCount,
      percentage: highViralityRate,
      label: "≥80",
    },
    {
      name: "Moderate",
      count: moderateViralityCount,
      percentage: moderateViralityRate,
      label: "50-79",
    },
    {
      name: "Low",
      count: lowViralityCount,
      percentage: lowViralityRate,
      label: "<50",
    },
  ];

  const maxBarValue = Math.max(
    highViralityCount,
    moderateViralityCount,
    lowViralityCount,
    1
  );

  /*
   * ============================================================
   * REAL-TIME PLATFORM DATA
   * ============================================================
   */

  // Only these platforms are shown in Analytics.
  // TikTok and YouTube Shorts are intentionally excluded.
  const ANALYTICS_PLATFORMS = [
    "Instagram",
    "Twitter / X",
    "LinkedIn",
    "Facebook",
  ] as const;

  const normalizePlatform = (platform: unknown): string | null => {
    const value = String(platform ?? "").trim().toLowerCase();

    if (value === "instagram" || value.includes("instagram")) {
      return "Instagram";
    }

    if (
      value === "twitter" ||
      value === "twitter/x" ||
      value === "twitter / x" ||
      value.includes("twitter") ||
      value.includes("x.com")
    ) {
      return "Twitter / X";
    }

    if (value === "linkedin" || value.includes("linkedin")) {
      return "LinkedIn";
    }

    if (value === "facebook" || value.includes("facebook")) {
      return "Facebook";
    }

    // TikTok and YouTube Shorts are deliberately ignored.
    return null;
  };

  const platformCounts: Record<string, number> = {
    Instagram: 0,
    "Twitter / X": 0,
    LinkedIn: 0,
    Facebook: 0,
  };

  safePredictions.forEach((prediction: any) => {
    const rawPlatform =
      prediction?.platform ??
      prediction?.prediction?.platform ??
      "";

    const normalizedPlatform = normalizePlatform(rawPlatform);

    if (normalizedPlatform) {
      platformCounts[normalizedPlatform] += 1;
    }
  });

  const supportedPlatformTotal = Object.values(platformCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  const platformData = ANALYTICS_PLATFORMS.map((platform) => {
    const count = platformCounts[platform];

    return {
      platform,
      count,
      percentage:
        supportedPlatformTotal > 0
          ? (count / supportedPlatformTotal) * 100
          : 0,
    };
  });

  /*
   * ============================================================
   * REAL-TIME EXPORT
   * ============================================================
   */

  const handleExportCSV = () => {
    if (safePredictions.length === 0) {
      alert("No real-time prediction data available to export.");
      return;
    }

    const headers = [
      "ID",
      "Platform",
      "Caption",
      "Virality Score",
      "Predicted Reach",
      "Timestamp",
    ];

    const rows = safePredictions.map((prediction: any) => [
      prediction?.id ?? "",
      `"${String(prediction?.platform ?? "").replace(/"/g, '""')}"`,
      `"${String(prediction?.caption ?? "").replace(/"/g, '""')}"`,
      getViralityScore(prediction).toFixed(2),
      `"${String(prediction?.predictedReach ?? "").replace(
        /"/g,
        '""'
      )}"`,
      `"${String(prediction?.timestamp ?? "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);

    const link = document.createElement("a");

    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `viralai_realtime_analytics_${Date.now()}.csv`
    );

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /*
   * ============================================================
   * RETURN
   * ============================================================
   */

  return (
    <div className="space-y-6">
      {/* ======================================================
          TOP BANNER
      ====================================================== */}

      <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 text-xs font-mono font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />

            OVERALL REAL-TIME ANALYSIS ACTIVE ·{" "}
            {totalInferences} Total Inference
            {totalInferences === 1 ? "" : "s"} Evaluated
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Real-Time Virality Analysis & Model Evaluation
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Live analytics calculated directly from submitted post
            predictions.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs flex items-center gap-2 transition shadow"
          >
            <Download className="w-3.5 h-3.5 text-zinc-950" />

            <span>Export Real-Time CSV Report</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 transition"
            title="Print Report"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ======================================================
          SECTION TITLE
      ====================================================== */}

      <div className="text-[11px] font-mono uppercase tracking-wider font-bold text-zinc-400 flex items-center gap-1.5 pt-1">
        <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />

        OVERALL REAL-TIME ANALYTICS
      </div>

      {/* ======================================================
          REAL-TIME STAT CARDS
      ====================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL PREDICTIONS */}

        <div className="rounded-xl bg-zinc-900/90 border border-zinc-800 p-5 space-y-2">
          <div className="text-[11px] font-mono font-bold text-zinc-400 uppercase">
            OVERALL PREDICTIONS
          </div>

          <div className="text-2xl font-black text-white">
            {totalInferences}
          </div>

          <div className="text-[11px] text-emerald-400 font-mono font-semibold">
            Live System Stream
          </div>
        </div>

        {/* AVERAGE SCORE */}

        <div className="rounded-xl bg-zinc-900/90 border border-zinc-800 p-5 space-y-2">
          <div className="text-[11px] font-mono font-bold text-zinc-400 uppercase">
            AVERAGE VIRALITY SCORE
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white">
              {avgScore.toFixed(1)}
            </span>

            <span className="text-xs text-zinc-500 font-mono">
              / 100
            </span>
          </div>

          <div className="text-[11px] text-zinc-500">
            Live average prediction score
          </div>
        </div>

        {/* HIGH VIRALITY */}

        <div className="rounded-xl bg-zinc-900/90 border border-zinc-800 p-5 space-y-2">
          <div className="text-[11px] font-mono font-bold text-zinc-400 uppercase">
            HIGH VIRALITY RATE
          </div>

          <div className="text-2xl font-black text-white">
            {highViralityRate.toFixed(1)}%
          </div>

          <div className="text-[11px] text-zinc-500">
            Live posts scored ≥ 80
          </div>
        </div>

        {/* MODEL CONFIDENCE */}

        <div className="rounded-xl bg-zinc-900/90 border border-zinc-800 p-5 space-y-2">
          <div className="text-[11px] font-mono font-bold text-zinc-400 uppercase">
            MEAN MODEL CONFIDENCE
          </div>

          <div className="text-2xl font-black text-white">
            {meanModelConfidence.toFixed(1)}%
          </div>

          <div className="text-[11px] text-zinc-500">
            Live prediction confidence
          </div>
        </div>
      </div>

      {/* ======================================================
          BAR GRAPH + PLATFORM DATA
      ====================================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ====================================================
            BAR GRAPH
        ==================================================== */}

        <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />

                Real-Time Virality Class Distribution
              </h3>

              <p className="text-xs text-zinc-400 mt-0.5">
                Live distribution of submitted predictions
              </p>
            </div>

            <span className="text-[10px] font-mono text-emerald-400 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-800 font-bold">
              LIVE DATA
            </span>
          </div>

          {totalInferences === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center rounded-xl bg-zinc-950/60 border border-zinc-800/80">
              <Sparkles className="w-6 h-6 text-amber-400 mb-3" />

              <h4 className="text-xs font-bold text-white">
                No predictions available
              </h4>

              <p className="text-[11px] text-zinc-400 mt-1 text-center">
                Submit a prediction to generate live analytics.
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Y AXIS */}

              <div className="absolute left-0 top-0 bottom-10 flex flex-col justify-between text-[9px] font-mono text-zinc-600">
                <span>{maxBarValue}</span>
                <span>{Math.round(maxBarValue * 0.75)}</span>
                <span>{Math.round(maxBarValue * 0.5)}</span>
                <span>{Math.round(maxBarValue * 0.25)}</span>
                <span>0</span>
              </div>

              {/* GRAPH */}

              <div className="ml-8 h-64 relative">
                {/* GRID */}

                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  <div className="border-t border-zinc-800/60 border-dashed" />
                  <div className="border-t border-zinc-800/60 border-dashed" />
                  <div className="border-t border-zinc-800/60 border-dashed" />
                  <div className="border-t border-zinc-800/60 border-dashed" />
                  <div className="border-t border-zinc-800/60 border-dashed" />
                </div>

                {/* BARS */}

                <div className="absolute inset-0 flex items-end justify-around gap-6 px-8 pb-8">
                  {viralityChartData.map((item) => {
                    const barHeight =
                      (item.count / maxBarValue) * 100;

                    const barClass =
                      item.name === "Viral"
                        ? "bg-emerald-500"
                        : item.name === "Moderate"
                        ? "bg-amber-500"
                        : "bg-rose-500";

                    const textClass =
                      item.name === "Viral"
                        ? "text-emerald-400"
                        : item.name === "Moderate"
                        ? "text-amber-400"
                        : "text-rose-400";

                    return (
                      <div
                        key={item.name}
                        className="h-full flex-1 max-w-[120px] flex flex-col items-center justify-end"
                      >
                        {/* COUNT */}

                        <div
                          className={`text-xs font-mono font-bold mb-2 ${textClass}`}
                        >
                          {item.count}
                        </div>

                        {/* BAR */}

                        <div className="w-full h-[calc(100%-45px)] flex items-end">
                          <div
                            className={`w-full ${barClass} rounded-t-lg transition-all duration-500 shadow-lg`}
                            style={{
                              height: `${barHeight}%`,
                              minHeight:
                                item.count > 0 ? "8px" : "0px",
                            }}
                          />
                        </div>

                        {/* LABEL */}

                        <div className="mt-3 text-center">
                          <div className="text-[11px] font-bold text-zinc-300">
                            {item.name}
                          </div>

                          <div className="text-[9px] font-mono text-zinc-500">
                            {item.label}
                          </div>

                          <div
                            className={`text-[10px] font-mono font-bold ${textClass}`}
                          >
                            {item.percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ====================================================
            REAL-TIME PLATFORM BREAKDOWN
        ==================================================== */}

        <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">
                Real-Time Platform Distribution
              </h3>

              <p className="text-xs text-zinc-400 mt-0.5">
                Live prediction counts by platform
              </p>
            </div>

            <span className="text-[10px] font-mono text-emerald-400 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-800 font-bold">
              LIVE DATA
            </span>
          </div>

          {platformData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center rounded-xl bg-zinc-950/60 border border-zinc-800/80">
              <Sparkles className="w-6 h-6 text-purple-400 mb-3" />

              <h4 className="text-xs font-bold text-white">
                No platform data
              </h4>

              <p className="text-[11px] text-zinc-400 mt-1">
                Platform information will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {platformData.map((item) => (
                <div key={item.platform}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-semibold text-zinc-300">
                      {item.platform}
                    </span>

                    <span className="text-xs font-mono text-emerald-400">
                      {item.count}{" "}
                      {item.count === 1 ? "run" : "runs"} (
                      {item.percentage.toFixed(1)}%)
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${item.percentage}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================
          REAL-TIME PREDICTION SUMMARY
      ====================================================== */}

      <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">
              Real-Time Prediction Summary
            </h3>

            <p className="text-xs text-zinc-400 mt-0.5">
              Current live prediction classification
            </p>
          </div>

          <span className="text-[10px] font-mono text-emerald-400 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-800 font-bold">
            LIVE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* VIRAL */}

          <div className="rounded-xl bg-zinc-950/80 border border-emerald-900/50 p-5">
            <div className="flex justify-between">
              <span className="text-[11px] font-mono font-bold text-emerald-400">
                VIRAL
              </span>

              <span className="text-[11px] font-mono text-emerald-400">
                {highViralityRate.toFixed(1)}%
              </span>
            </div>

            <div className="text-3xl font-black text-white mt-3">
              {highViralityCount}
            </div>

            <p className="text-[10px] text-zinc-500 mt-1">
              Scores ≥ 80
            </p>
          </div>

          {/* MODERATE */}

          <div className="rounded-xl bg-zinc-950/80 border border-amber-900/50 p-5">
            <div className="flex justify-between">
              <span className="text-[11px] font-mono font-bold text-amber-400">
                MODERATE
              </span>

              <span className="text-[11px] font-mono text-amber-400">
                {moderateViralityRate.toFixed(1)}%
              </span>
            </div>

            <div className="text-3xl font-black text-white mt-3">
              {moderateViralityCount}
            </div>

            <p className="text-[10px] text-zinc-500 mt-1">
              Scores 50-79
            </p>
          </div>

          {/* LOW */}

          <div className="rounded-xl bg-zinc-950/80 border border-rose-900/50 p-5">
            <div className="flex justify-between">
              <span className="text-[11px] font-mono font-bold text-rose-400">
                LOW
              </span>

              <span className="text-[11px] font-mono text-rose-400">
                {lowViralityRate.toFixed(1)}%
              </span>
            </div>

            <div className="text-3xl font-black text-white mt-3">
              {lowViralityCount}
            </div>

            <p className="text-[10px] text-zinc-500 mt-1">
              Scores &lt; 50
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
