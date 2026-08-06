import React from "react";
import {
  TrendingUp,
  CheckCircle2,
  Zap,
  Activity,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  Award,
  Layers,
  Clock,
  ExternalLink,
  Flame,
  Image as ImageIcon,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import { NavTab } from "./Navbar";
import { SafeThumbnail } from "./SafeThumbnail";

import type { PredictionFormState } from "../types";

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
  realtimePredictions?: any[];
}

export default function DashboardView({
  onNavigate,
  realtimePredictions = [],
}: DashboardViewProps) {
  console.log("DashboardView Rendered");
  const totalInferences = realtimePredictions.length;

  // Real-time Avg Virality Score
  const avgViralityScore = totalInferences > 0
    ? (realtimePredictions.reduce((acc, curr) => acc + (Number(curr.viralityScore) || 0), 0) / totalInferences).toFixed(1)
    : "0.0";

  // Real-time Avg Confidence Score
  const avgConfidence = totalInferences > 0
    ? (realtimePredictions.reduce((acc, curr) => acc + (Number(curr.confidence) || 92), 0) / totalInferences).toFixed(1)
    : "0.0";

  // Peak Virality Score
  const peakScore = totalInferences > 0
    ? Math.max(...realtimePredictions.map((p) => Number(p.viralityScore) || 0))
    : 0;

  // Platform Breakdown calculated dynamically from user's predictions
  const PLATFORMS = ["TikTok", "Instagram", "Twitter / X", "YouTube Shorts", "LinkedIn"];
  const platformStats = PLATFORMS.map((platform) => {
    const key = platform.toLowerCase().split(" ")[0];
    const items = realtimePredictions.filter((p) =>
      (p.platform || "").toLowerCase().includes(key)
    );
    const count = items.length;
    const avgScore = count > 0
      ? Math.round(items.reduce((sum, item) => sum + (Number(item.viralityScore) || 0), 0) / count)
      : 0;
    return {
      platform,
      count,
      avgScore
    };
  });

  // Chart data from actual predictions (reversed so oldest to newest)
  const chartData = totalInferences > 0
    ? realtimePredictions.slice().reverse().map((item, index) => ({
        run: `#${index + 1}`,
        viralityScore: Number(item.viralityScore) || 0,
        platform: item.platform || "Platform",
        time: item.timestamp || "Live"
      }))
    : [
        { run: "Baseline 1", viralityScore: 0, platform: "—", time: "—" },
        { run: "Baseline 2", viralityScore: 0, platform: "—", time: "—" },
        { run: "Baseline 3", viralityScore: 0, platform: "—", time: "—" },
      ];

  return (
    <>
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-xl bg-zinc-900/90 border border-zinc-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px] font-mono border border-zinc-700/60 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE REAL-TIME STREAMING
            </span>
            <span className="text-xs text-zinc-500 font-mono">• Inference System Active</span>
          </div>
          <h1 className="text-xl md:text-2xl font-semibold text-zinc-100 tracking-tight">
            Virality Analytics & Performance Dashboard
          </h1>
          <p className="text-xs text-zinc-400 max-w-2xl">
            Real-time analytics engine tracking your submitted post predictions, virality scoring curves, and platform channel performance.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate("prediction")}
            className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 font-medium text-xs flex items-center gap-2 transition shadow-xs"
          >
            <Zap className="h-3.5 w-3.5 text-zinc-800" />
            <span>New Prediction</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-2 hover:border-zinc-700/80 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total User Inferences</span>
            <div className="p-1.5 rounded bg-zinc-800 text-zinc-400">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-zinc-100 font-mono">{totalInferences.toLocaleString()}</span>
            <span className="text-xs font-medium text-emerald-400 font-mono">Real-Time</span>
          </div>
          <p className="text-[11px] text-zinc-500">Evaluated content payloads in session</p>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-2 hover:border-zinc-700/80 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Avg Virality Score</span>
            <div className="p-1.5 rounded bg-zinc-800 text-zinc-400">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-zinc-100 font-mono">{avgViralityScore}</span>
            <span className="text-xs font-mono text-zinc-500">/ 100</span>
          </div>
          <p className="text-[11px] text-zinc-500">Live mean prediction score</p>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-2 hover:border-zinc-700/80 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Model Confidence</span>
            <div className="p-1.5 rounded bg-zinc-800 text-zinc-400">
              <CheckCircle2 className="h-3.5 w-3.5 text-purple-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-zinc-100 font-mono">{avgConfidence}%</span>
            <span className="text-xs font-medium text-zinc-400 font-mono">Ensemble</span>
          </div>
          <p className="text-[11px] text-zinc-500">Average feature attribution stability</p>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-2 hover:border-zinc-700/80 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Peak Virality Index</span>
            <div className="p-1.5 rounded bg-zinc-800 text-zinc-400">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-zinc-100 font-mono">{peakScore}</span>
            <span className="text-xs font-mono text-zinc-500">/ 100</span>
          </div>
          <p className="text-[11px] text-zinc-500">Highest virality score recorded</p>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart: Real-time Prediction Virality Trend */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200">Real-Time Prediction Virality Trend</h3>
              <p className="text-xs text-zinc-500">Sequential virality score curve from user predictions</p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700/60 text-zinc-400">
              Live Curve
            </span>
          </div>

          <div className="h-60 w-full relative">
            {totalInferences === 0 && (
              <div className="absolute inset-0 bg-zinc-950/70 rounded-lg backdrop-blur-xs flex flex-col items-center justify-center z-10 p-4 text-center space-y-2">
                <Sparkles className="h-6 w-6 text-amber-400" />
                <p className="text-xs font-medium text-zinc-200">No predictions recorded yet</p>
                <p className="text-[11px] text-zinc-500 max-w-xs">Run your first prediction in the workspace to plot real-time virality trends.</p>
                <button
                  onClick={() => onNavigate("prediction")}
                  className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono border border-zinc-700 transition"
                >
                  Execute First Prediction
                </button>
              </div>
            )}

            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="run" stroke="#52525B" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} stroke="#52525B" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181B",
                    borderColor: "#27272A",
                    borderRadius: "6px",
                    color: "#F4F4F5",
                    fontSize: "12px"
                  }}
                />
                <Area type="monotone" dataKey="viralityScore" name="Virality Index" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#emeraldGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Platform Breakdown */}
        <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-200">Platform Benchmarks</h3>
            <p className="text-xs text-zinc-500">Real-time prediction counts & avg score by channel</p>
          </div>

          <div className="space-y-3.5">
            {platformStats.map((plat, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-300">{plat.platform}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-zinc-500">{plat.count} runs</span>
                    <span className="font-semibold text-zinc-200">
                      {plat.count > 0 ? `${plat.avgScore}/100` : "—"}
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                    style={{ width: `${plat.count > 0 ? plat.avgScore : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => onNavigate("analytics")}
            className="w-full py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition flex items-center justify-center gap-1.5 border border-zinc-700/60"
          >
            <span>View Model Audit</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
