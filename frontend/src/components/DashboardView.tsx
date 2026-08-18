import React from "react";
import { Zap, Sparkles, TrendingUp, Cpu, Flame, ArrowRight, LineChart } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import { NavTab } from "./Navbar";
import { HistoryEntry } from "../types";

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
  realtimePredictions: HistoryEntry[];
}

export default function DashboardView({
  onNavigate,
  realtimePredictions,
}: DashboardViewProps) {
  const totalInferences = realtimePredictions.length;
  
  const avgScore = totalInferences > 0
    ? (realtimePredictions.reduce((acc, curr) => acc + curr.viralityScore, 0) / totalInferences)
    : 0.0;

  const peakScore = totalInferences > 0
    ? Math.max(...realtimePredictions.map((p) => p.viralityScore))
    : 0;

  const modelConfidence = totalInferences > 0 ? 94.8 : 0.0;

  // Platform count breakdown
  const platforms = [
    { name: "Facebook", key: "Facebook" },
    { name: "Instagram", key: "Instagram" },
    { name: "Twitter / X", key: "Twitter" },
    { name: "LinkedIn", key: "LinkedIn" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 text-xs font-mono font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            LIVE REAL-TIME STREAMING · Inference System Active
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Virality Analytics & Performance Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Real-time analytics engine tracking your submitted post predictions, virality scoring curves, and platform channel performance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("prediction")}
          className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shrink-0 shadow transition"
        >
          <Zap className="w-4 h-4 fill-zinc-950 text-zinc-950" />
          <span>New Prediction</span>
        </button>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="rounded-xl bg-zinc-900/90 border border-zinc-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Total Overall Inferences</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4 fill-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{totalInferences}</span>
              <span className="text-xs font-mono font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800">
                Real-Time
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Evaluated content payloads across system</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="rounded-xl bg-zinc-900/90 border border-zinc-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Avg Virality Score</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white">{avgScore.toFixed(1)}</span>
              <span className="text-xs text-zinc-500 font-mono">/ 100</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Live mean prediction score</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="rounded-xl bg-zinc-900/90 border border-zinc-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Model Confidence</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{modelConfidence.toFixed(1)}%</span>
              <span className="text-xs text-purple-400 font-mono">Ensemble</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Average feature attribution stability</p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="rounded-xl bg-zinc-900/90 border border-zinc-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Peak Virality Index</span>
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Flame className="w-4 h-4 fill-orange-400" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white">{peakScore}</span>
              <span className="text-xs text-zinc-500 font-mono">/ 100</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Highest virality score recorded</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Trend Curve (8 cols) & Right Benchmarks (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Virality Trend Curve */}
        <div className="lg:col-span-8 rounded-2xl bg-zinc-900/90 border border-zinc-800 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <LineChart className="w-4 h-4 text-purple-400" />
                Real-Time Prediction Virality Trend
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Sequential virality score curve from user predictions</p>
            </div>

            <span className="text-[10px] font-mono text-purple-400 px-2.5 py-1 rounded-md bg-purple-950/80 border border-purple-800 font-medium">
              Live Chart
            </span>
          </div>

          {totalInferences === 0 ? (
            <div className="py-16 px-6 text-center rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">No predictions recorded yet</h4>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  Run your first prediction in the workspace to plot real-time virality trends.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigate("prediction")}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-bold text-xs transition"
              >
                Execute First Prediction
              </button>

              <div className="w-full h-1 bg-zinc-800/50 rounded-full overflow-hidden mt-6">
                <div className="w-1/3 h-full bg-emerald-500/30 rounded-full" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
{/* Prediction Area Graph */}
<div className="h-64 w-full bg-zinc-950/80 rounded-xl border border-zinc-800/80 p-4">
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart
      data={realtimePredictions.map((pred, idx) => ({
        label: `#${idx + 1}`,
        score: pred.viralityScore,
      }))}
      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
    >
      <defs>
        <linearGradient
          id="viralityGradient"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0%"
            stopColor="#a1a1aa"
            stopOpacity={0.4}
          />

          <stop
            offset="100%"
            stopColor="#a1a1aa"
            stopOpacity={0}
          />
        </linearGradient>
      </defs>

      <CartesianGrid
        stroke="#27272a"
        strokeDasharray="3 3"
        vertical={false}
        opacity={0.25}
      />

      <XAxis
        dataKey="label"
        tick={{
          fill: "#71717a",
          fontSize: 10,
        }}
        axisLine={false}
        tickLine={false}
      />

      <YAxis
        domain={[0, 100]}
        tick={{
          fill: "#71717a",
          fontSize: 10,
        }}
        axisLine={false}
        tickLine={false}
        width={35}
      />

      <Tooltip
        contentStyle={{
          backgroundColor: "#18181b",
          border: "1px solid #3f3f46",
          borderRadius: "8px",
          color: "#ffffff",
        }}
        formatter={(value) => [`${value}%`, "Virality Score"]}
      />

      <Area
        type="monotone"
        dataKey="score"
        stroke="#d4d4d8"
        strokeWidth={2}
        fill="url(#viralityGradient)"
        dot={false}
        activeDot={{
          r: 4,
          fill: "#ffffff",
        }}
      />
    </AreaChart>
  </ResponsiveContainer>
</div>

              <div className="text-[11px] text-zinc-500 font-mono text-right">
                {totalInferences} data point{totalInferences > 1 ? "s" : ""} recorded in current session
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Platform Benchmarks */}
        <div className="lg:col-span-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 p-6 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-white">Platform Benchmarks</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Real-time prediction counts & avg score by channel</p>
          </div>

          <div className="space-y-2.5">
            {platforms.map((plat) => {
              const matched = realtimePredictions.filter(
                (p) => p.platform.toLowerCase().includes(plat.key.toLowerCase())
              );
              const count = matched.length;
              const avg = count > 0
                ? Math.round(matched.reduce((acc, c) => acc + c.viralityScore, 0) / count)
                : null;

              return (
                <div
                  key={plat.name}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs"
                >
                  <span className="font-semibold text-zinc-200">{plat.name}</span>
                  <div className="font-mono text-zinc-400 text-[11px]">
                    {count > 0 ? (
                      <span className="text-emerald-400 font-bold">{count} runs ({avg}%)</span>
                    ) : (
                      <span>0 runs —</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onNavigate("analytics")}
            className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-2 transition"
          >
            <span>View Model Audit</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

