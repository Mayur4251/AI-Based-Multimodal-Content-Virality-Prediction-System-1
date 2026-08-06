import React from "react";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers,
  Sparkles,
  Zap,
  Info
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine
} from "recharts";
import { SHAP_FEATURE_DATA } from "../data";

export default function ExplainableAIView() {
  const positiveFeatures = SHAP_FEATURE_DATA.filter((f) => f.shapValue > 0);
  const negativeFeatures = SHAP_FEATURE_DATA.filter((f) => f.shapValue < 0);

  const chartData = SHAP_FEATURE_DATA.map((item) => ({
    name: item.featureName,
    shapValue: +(item.shapValue * 100).toFixed(1),
    modality: item.modality
  }));

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-[#0F1420] border border-purple-500/20 space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-mono font-medium border border-purple-500/30">
            EXPLAINABLE AI (XAI) • SHAP VALUES
          </span>
          <span className="text-xs text-gray-400 font-mono">• KernelSHAP Feature Attribution</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Brain className="h-6 w-6 text-purple-400" />
          <span>SHAP Feature Attribution & Model Interpretability</span>
        </h1>
        <p className="text-xs text-gray-400 max-w-3xl">
          SHAP (Shapley Additive exPlanations) breaks down the exact mathematical contribution of each visual, textual, and metadata feature toward the final virality score.
        </p>
      </div>

      {/* Main Graph: SHAP Feature Importance Waterfall / Bar Chart */}
      <div className="p-6 rounded-2xl bg-[#0D111A] border border-white/10 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">SHAP Feature Contribution Chart (% Impact)</h3>
            <p className="text-xs text-gray-400">Positive values increase predicted virality score; negative values decrease it</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Positive Impact
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-2.5 rounded bg-rose-500" /> Negative Impact
            </span>
          </div>
        </div>

        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 5, right: 30, left: 140, bottom: 5 }}
            >
              <XAxis type="number" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} unit="%" />
              <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} width={130} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0A0D14",
                  borderColor: "rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "12px"
                }}
                formatter={(val: any) => [`${val}%`, "SHAP Impact"]}
              />
              <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
              <Bar dataKey="shapValue" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.shapValue >= 0 ? "#10B981" : "#F43F5E"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column Cards: Positive vs Negative Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Positive Drivers */}
        <div className="p-6 rounded-2xl bg-[#0D111A] border border-emerald-500/20 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2 font-mono uppercase">
              <TrendingUp className="h-4 w-4" /> Positive Virality Drivers ({positiveFeatures.length})
            </h3>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Score Boosters
            </span>
          </div>

          <div className="space-y-3">
            {positiveFeatures.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    {item.featureName}
                  </span>
                  <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    +{(item.shapValue * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-gray-400 pl-6 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Negative Drivers */}
        <div className="p-6 rounded-2xl bg-[#0D111A] border border-rose-500/20 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2 font-mono uppercase">
              <TrendingDown className="h-4 w-4" /> Negative Friction Factors ({negativeFeatures.length})
            </h3>
            <span className="text-xs font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              Optimization Needed
            </span>
          </div>

          <div className="space-y-3">
            {negativeFeatures.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                    {item.featureName}
                  </span>
                  <span className="font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                    {(item.shapValue * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-gray-400 pl-6 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
