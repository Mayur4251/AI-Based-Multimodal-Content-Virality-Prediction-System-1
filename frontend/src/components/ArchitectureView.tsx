import React from "react";
import {
  GitBranch,
  ArrowDown,
  Layers,
  Cpu,
  Brain,
  Lightbulb,
  CheckCircle2,
  Sparkles,
  Database,
  Eye,
  MessageSquare,
  Clock
} from "lucide-react";

export default function ArchitectureView() {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-[#0F1420] border border-purple-500/20 space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-mono font-medium border border-purple-500/30">
            SYSTEM ARCHITECTURE FLOW
          </span>
          <span className="text-xs text-gray-400 font-mono">• Multimodal Fusion Pipeline</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <GitBranch className="h-6 w-6 text-purple-400" />
          <span>Multimodal Pipeline Architecture Diagram</span>
        </h1>
        <p className="text-xs text-gray-400 max-w-3xl">
          Complete neural graph showing feature extraction from image, caption, and metadata inputs through the Hierarchical Fusion Layer, Voting Ensemble, SHAP Explainable AI, and Recommendation Engine.
        </p>
      </div>

      {/* Main Flowchart Node Diagram */}
      <div className="p-8 rounded-2xl bg-[#0D111A] border border-white/10 space-y-6 shadow-2xl relative overflow-hidden">
        {/* Step 1: Input Post */}
        <div className="flex flex-col items-center">
          <div className="px-6 py-3 rounded-xl bg-purple-600/20 border border-purple-500/40 text-white font-mono font-bold text-sm shadow-lg flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span>1. Social Media Post Input</span>
          </div>
          <ArrowDown className="h-6 w-6 text-purple-400 my-2 animate-bounce" />
        </div>

        {/* Step 2: Three Concurrently Processing Modality Channels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Channel A: Image */}
          <div className="p-5 rounded-xl bg-white/[0.02] border border-purple-500/20 space-y-3 relative group hover:border-purple-500/50 transition">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-300">
              <Eye className="h-4 w-4 text-purple-400" /> Image Branch
            </div>

            <div className="space-y-2 text-xs text-gray-300 font-mono">
              <div className="p-2.5 rounded-lg bg-black/50 border border-white/5">
                Image Input
              </div>
              <ArrowDown className="h-4 w-4 text-gray-500 mx-auto" />
              <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 font-bold">
                Pretrained ResNet50
              </div>
              <ArrowDown className="h-4 w-4 text-gray-500 mx-auto" />
              <div className="p-2.5 rounded-lg bg-black/50 border border-white/5 text-emerald-400">
                Visual Features (512-d)
              </div>
            </div>
          </div>

          {/* Channel B: Caption */}
          <div className="p-5 rounded-xl bg-white/[0.02] border border-pink-500/20 space-y-3 relative group hover:border-pink-500/50 transition">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-pink-300">
              <MessageSquare className="h-4 w-4 text-pink-400" /> Caption Branch
            </div>

            <div className="space-y-2 text-xs text-gray-300 font-mono">
              <div className="p-2.5 rounded-lg bg-black/50 border border-white/5">
                Caption Input
              </div>
              <ArrowDown className="h-4 w-4 text-gray-500 mx-auto" />
              <div className="p-2.5 rounded-lg bg-pink-500/10 border border-pink-500/30 text-pink-300 font-bold">
                TF-IDF Vectorizer
              </div>
              <ArrowDown className="h-4 w-4 text-gray-500 mx-auto" />
              <div className="p-2.5 rounded-lg bg-black/50 border border-white/5 text-purple-300">
                Sentiment & Keywords
              </div>
              <ArrowDown className="h-4 w-4 text-gray-500 mx-auto" />
              <div className="p-2.5 rounded-lg bg-black/50 border border-white/5 text-emerald-400">
                Text Features (258-d)
              </div>
            </div>
          </div>

          {/* Channel C: Metadata */}
          <div className="p-5 rounded-xl bg-white/[0.02] border border-cyan-500/20 space-y-3 relative group hover:border-cyan-500/50 transition">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300">
              <Clock className="h-4 w-4 text-cyan-400" /> Metadata Branch
            </div>

            <div className="space-y-2 text-xs text-gray-300 font-mono">
              <div className="p-2.5 rounded-lg bg-black/50 border border-white/5">
                Likes, Comments, Shares, Followers, Post Time
              </div>
              <ArrowDown className="h-4 w-4 text-gray-500 mx-auto" />
              <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold">
                Metadata Normalizer Engine
              </div>
              <ArrowDown className="h-4 w-4 text-gray-500 mx-auto" />
              <div className="p-2.5 rounded-lg bg-black/50 border border-white/5 text-emerald-400">
                Metadata Features (96-d)
              </div>
            </div>
          </div>
        </div>

        {/* Down Arrow to Fusion */}
        <div className="flex justify-center">
          <ArrowDown className="h-6 w-6 text-purple-400" />
        </div>

        {/* Step 3: Hierarchical Multimodal Fusion Layer */}
        <div className="p-5 rounded-xl bg-gradient-to-r from-purple-900/20 via-indigo-900/20 to-purple-900/20 border border-purple-500/40 text-center space-y-2 shadow-lg">
          <div className="text-sm font-bold text-purple-300 font-mono flex items-center justify-center gap-2">
            <Layers className="h-4 w-4 text-purple-400" />
            <span>Hierarchical Multimodal Fusion Layer</span>
          </div>
          <p className="text-xs text-gray-400 max-w-xl mx-auto">
            Cross-attention fusion layer concatenates visual embeddings, TF-IDF sentiment vectors, and engagement velocity parameters into a unified multimodal tensor.
          </p>
        </div>

        {/* Down Arrow */}
        <div className="flex justify-center">
          <ArrowDown className="h-6 w-6 text-purple-400" />
        </div>

        {/* Step 4: Voting Ensemble (Random Forest, SVM, XGBoost) */}
        <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10 space-y-3 text-center">
          <div className="text-xs font-bold text-white font-mono uppercase flex items-center justify-center gap-2">
            <Cpu className="h-4 w-4 text-purple-400" /> Voting Ensemble Meta-Classifier
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-black/50 border border-white/10 text-gray-300">
              <span className="font-bold text-purple-400 block">Random Forest</span>
              <span className="text-[10px] text-gray-500">Decision Forest Regression</span>
            </div>
            <div className="p-3 rounded-lg bg-black/50 border border-white/10 text-gray-300">
              <span className="font-bold text-pink-400 block">Support Vector Machine</span>
              <span className="text-[10px] text-gray-500">RBF Kernel Boundary</span>
            </div>
            <div className="p-3 rounded-lg bg-black/50 border border-white/10 text-gray-300">
              <span className="font-bold text-cyan-400 block">XGBoost Classifier</span>
              <span className="text-[10px] text-gray-500">Gradient Boosted Trees</span>
            </div>
          </div>
        </div>

        {/* Down Arrow */}
        <div className="flex justify-center">
          <ArrowDown className="h-6 w-6 text-purple-400" />
        </div>

        {/* Step 5: Virality Prediction Output */}
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center font-mono">
          <span className="text-xs text-emerald-400 font-bold block uppercase">Virality Prediction Score (0-100)</span>
          <span className="text-xl font-extrabold text-white">Calibrated Regression Output</span>
        </div>

        {/* Down Arrow */}
        <div className="flex justify-center">
          <ArrowDown className="h-6 w-6 text-purple-400" />
        </div>

        {/* Step 6 & 7: Explainable AI & Recommendation Engine */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-300 font-mono">
              <Brain className="h-4 w-4 text-purple-400" /> Explainable AI (XAI)
            </div>
            <p className="text-[11px] text-gray-400">SHAP feature attribution breakdown</p>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 font-mono">
              <Lightbulb className="h-4 w-4 text-amber-400" /> Recommendation Engine
            </div>
            <p className="text-[11px] text-gray-400">Actionable visual, copy & timing tweaks</p>
          </div>
        </div>
      </div>
    </div>
  );
}
