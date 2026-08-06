import React, { useState } from "react";
import {
  Database,
  Search,
  Filter,
  BarChart2,
  PieChart as PieIcon,
  Grid,
  Hash,
  Download,
  Eye,
  CheckCircle2,
  Layers,
  Sparkles
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from "recharts";
import { CORRELATION_MATRIX_DATA, PAST_PREDICTIONS_HISTORY } from "../data";
import { SafeThumbnail } from "./SafeThumbnail";

const CLASS_DISTRIBUTION_DATA = [
  { name: "Viral (>80 Score)", value: 42500, color: "#8B5CF6" },
  { name: "Moderate (50-80 Score)", value: 58000, color: "#06B6D4" },
  { name: "Low Reach (<50 Score)", value: 24500, color: "#64748B" },
];

const KEYWORD_WORD_CLOUD = [
  { text: "AI", weight: 98, color: "#8B5CF6" },
  { text: "virality", weight: 92, color: "#EC4899" },
  { text: "ResNet50", weight: 88, color: "#06B6D4" },
  { text: "cyberpunk", weight: 84, color: "#10B981" },
  { text: "web3", weight: 79, color: "#F59E0B" },
  { text: "engagement", weight: 76, color: "#8B5CF6" },
  { text: "growth", weight: 71, color: "#3B82F6" },
  { text: "algorithm", weight: 68, color: "#EC4899" },
  { text: "hooks", weight: 64, color: "#06B6D4" },
  { text: "TF-IDF", weight: 61, color: "#10B981" },
  { text: "confidence", weight: 58, color: "#8B5CF6" },
  { text: "SHAP", weight: 55, color: "#F59E0B" },
];

export default function DatasetExplorerView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("All");

  const filteredHistory = PAST_PREDICTIONS_HISTORY.filter((item) => {
    const matchesSearch =
      item.captionSnippet.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = platformFilter === "All" || item.platform === platformFilter;
    return matchesSearch && matchesPlatform;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-[#0F1420] border border-purple-500/20 space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-mono font-medium border border-purple-500/30">
            DATASET EXPLORER • MULTIMODAL CORPUS
          </span>
          <span className="text-xs text-gray-400 font-mono">• 125,000 Social Posts Sampled</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Database className="h-6 w-6 text-purple-400" />
          <span>Multimodal Dataset Explorer & Search Console</span>
        </h1>
        <p className="text-xs text-gray-400 max-w-3xl">
          Inspect global training distributions, class ratios, feature correlation matrices, keyword word clouds, and prediction history.
        </p>
      </div>

      {/* Dataset Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-[#0D111A] border border-white/10 space-y-1">
          <span className="text-xs font-mono text-gray-400 uppercase">Total Corpus Samples</span>
          <div className="text-2xl font-bold font-mono text-white">125,000</div>
          <p className="text-[11px] text-gray-500 font-mono">Multimodal triples (Image, Text, Meta)</p>
        </div>

        <div className="p-5 rounded-xl bg-[#0D111A] border border-white/10 space-y-1">
          <span className="text-xs font-mono text-gray-400 uppercase">Visual Feature Dims</span>
          <div className="text-2xl font-bold font-mono text-purple-400">512-d</div>
          <p className="text-[11px] text-gray-500 font-mono">CLIP & ResNet50 embeddings</p>
        </div>

        <div className="p-5 rounded-xl bg-[#0D111A] border border-white/10 space-y-1">
          <span className="text-xs font-mono text-gray-400 uppercase">Text Vocabulary Size</span>
          <div className="text-2xl font-bold font-mono text-pink-400">48,200</div>
          <p className="text-[11px] text-gray-500 font-mono">TF-IDF & sentiment tokens</p>
        </div>

        <div className="p-5 rounded-xl bg-[#0D111A] border border-white/10 space-y-1">
          <span className="text-xs font-mono text-gray-400 uppercase">Platforms Covered</span>
          <div className="text-2xl font-bold font-mono text-cyan-400">5 Major</div>
          <p className="text-[11px] text-gray-500 font-mono">TikTok, IG, X, LinkedIn, YT Shorts</p>
        </div>
      </div>

      {/* Two Column Visualizers: Class Distribution & Word Cloud */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Distribution Chart */}
        <div className="p-6 rounded-2xl bg-[#0D111A] border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Dataset Class Distribution</h3>
              <p className="text-xs text-gray-400">Ratio of Viral vs Moderate vs Low reach samples</p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
              Balanced Corpus
            </span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={CLASS_DISTRIBUTION_DATA}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={4}
                >
                  {CLASS_DISTRIBUTION_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0A0D14",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px"
                  }}
                  formatter={(val: any) => [`${val.toLocaleString()} samples`, "Count"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-around text-xs font-mono pt-2 border-t border-white/10">
            {CLASS_DISTRIBUTION_DATA.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-gray-300">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Keyword Word Cloud Matrix */}
        <div className="p-6 rounded-2xl bg-[#0D111A] border border-white/10 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">High-Weight Keyword Matrix (Word Cloud)</h3>
            <p className="text-xs text-gray-400">Top TF-IDF keywords correlated with viral reach</p>
          </div>

          <div className="p-6 rounded-xl bg-black/40 border border-white/5 flex flex-wrap items-center justify-center gap-3 min-h-[220px]">
            {KEYWORD_WORD_CLOUD.map((word, idx) => (
              <span
                key={idx}
                className="font-mono font-bold transition hover:scale-110 cursor-pointer"
                style={{
                  fontSize: `${Math.max(12, Math.min(26, word.weight / 3.5))}px`,
                  color: word.color,
                  opacity: Math.max(0.6, word.weight / 100)
                }}
              >
                #{word.text}
              </span>
            ))}
          </div>

          <p className="text-[11px] text-gray-500 font-mono text-center">
            Clicking keywords filters prediction training subset
          </p>
        </div>
      </div>

      {/* Correlation Matrix Table */}
      <div className="p-6 rounded-2xl bg-[#0D111A] border border-white/10 space-y-4 shadow-xl">
        <h3 className="text-sm font-semibold text-white">Feature Correlation Matrix</h3>
        <p className="text-xs text-gray-400">Pearson correlation coefficient between input parameters and Virality Outcome</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {CORRELATION_MATRIX_DATA.map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-200">{item.featureA}</span>
                <span className={`font-mono font-bold ${item.correlation > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {item.correlation > 0 ? `+${item.correlation}` : item.correlation}
                </span>
              </div>
              <p className="text-[10px] text-gray-500">Correlated with: {item.featureB}</p>
            </div>
          ))}
        </div>
      </div>

      {/* History Search & Filter Table */}
      <div className="p-6 rounded-2xl bg-[#0D111A] border border-white/10 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Prediction History Console</h3>
            <p className="text-xs text-gray-400">Search and audit past multimodal evaluation runs</p>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search caption or ID..."
                className="bg-black/60 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500 font-sans"
              />
            </div>

            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-purple-300 font-mono focus:outline-none focus:border-purple-500"
            >
              <option value="All">All Channels</option>
              <option value="TikTok">TikTok</option>
              <option value="Instagram">Instagram</option>
              <option value="Twitter / X">Twitter / X</option>
              <option value="YouTube Shorts">YouTube Shorts</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 font-mono text-[11px] uppercase">
                <th className="py-3 px-4 font-semibold">Post Caption & ID</th>
                <th className="py-3 px-4 font-semibold">Platform</th>
                <th className="py-3 px-4 font-semibold">Posting Time</th>
                <th className="py-3 px-4 font-semibold">Virality Score</th>
                <th className="py-3 px-4 font-semibold">Confidence</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {filteredHistory.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <SafeThumbnail src={item.imageUrl} className="w-8 h-8 rounded object-cover shrink-0 border border-white/10" />
                      <div>
                        <p className="font-medium text-gray-200 line-clamp-1 max-w-xs">{item.captionSnippet}</p>
                        <span className="text-[10px] font-mono text-gray-500">ID: {item.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-gray-400">{item.platform}</td>
                  <td className="py-3 px-4 font-mono text-gray-400">{item.postingTime}</td>
                  <td className="py-3 px-4 font-mono font-bold text-purple-400">{item.viralityScore}/100</td>
                  <td className="py-3 px-4 font-mono text-emerald-400">{item.confidence}%</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`https://content-virality-hub.preview.emergentagent.com/result/${item.id}`);
                      }}
                      className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] font-mono text-gray-300 transition border border-white/5"
                    >
                      Copy Link
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
