import React, { useState } from "react";
import {
  Settings,
  Code,
  Terminal,
  Copy,
  Check,
  CheckCircle2,
  Sliders,
  Cpu,
  Database,
  Layers,
  Sparkles,
  Server
} from "lucide-react";
import { SOFTWARE_STACK_DATA } from "../data";

export default function ModelsSettingsView() {
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<"python" | "curl" | "fastapi">("fastapi");

  // Hyperparameters State
  const [resnetLayers, setResnetLayers] = useState("4 (Frozen Base)");
  const [xgboostLr, setXgboostLr] = useState("0.05");
  const [ensembleWeight, setEnsembleWeight] = useState("Soft Voting (Probabilistic)");

  const pythonSnippet = `import requests

url = "https://content-virality-hub.preview.emergentagent.com/api/predict"
payload = {
    "caption": "The year is 2042. Artificial Minds represent 90% of global creative outputs...",
    "hashtags": "web3, cyberpunk, generativeart",
    "platform": "TikTok",
    "likes": 1250,
    "comments": 184,
    "shares": 420,
    "followers": 48200,
    "postingTime": "18:30 UTC"
}

response = requests.post(url, json=payload)
data = response.json()
print("Virality Score:", data["viralityScore"])
print("Confidence:", data["confidence"])`;

  const curlSnippet = `curl -X POST "https://content-virality-hub.preview.emergentagent.com/api/predict" \\
  -H "Content-Type: application/json" \\
  -d '{
    "caption": "The year is 2042...",
    "hashtags": "web3, cyberpunk",
    "platform": "TikTok",
    "likes": 1250,
    "comments": 184,
    "shares": 420
  }'`;

  const fastapiSnippet = `from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np

app = FastAPI(title="Multimodal Content Virality Prediction API")

class PostPayload(BaseModel):
    caption: str
    hashtags: str
    platform: str
    likes: int
    comments: int
    shares: int
    followers: int

@app.post("/api/predict")
async def predict_virality(payload: PostPayload):
    # 1. Image ResNet50 extraction
    # 2. TF-IDF + VADER sentiment extraction
    # 3. Hierarchical Fusion & Voting Ensemble
    return {
        "viralityScore": 92,
        "confidence": 96,
        "status": "success"
    }`;

  const getCodeText = () => {
    if (activeCodeTab === "python") return pythonSnippet;
    if (activeCodeTab === "curl") return curlSnippet;
    return fastapiSnippet;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(getCodeText());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-[#0F1420] border border-purple-500/20 space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-mono font-medium border border-purple-500/30">
            FASTAPI / REST API • MODEL SETTINGS
          </span>
          <span className="text-xs text-gray-400 font-mono">• Production Hyperparameter Console</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6 text-purple-400" />
          <span>Models, Hyperparameters & REST API Console</span>
        </h1>
        <p className="text-xs text-gray-400 max-w-3xl">
          Configure model ensemble weights, fine-tuning hyperparameters, or integrate the virality pipeline into your applications via FastAPI REST endpoints.
        </p>
      </div>

      {/* Model Hyperparameters Panel */}
      <div className="p-6 rounded-2xl bg-[#0D111A] border border-white/10 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase font-mono">
            <Sliders className="h-4 w-4 text-purple-400" /> Model Hyperparameters & Tuning
          </h3>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Active Status: Calibrated
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Hyperparameter 1 */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
            <label className="text-xs font-mono font-semibold text-gray-200 block">
              ResNet50 Backbone Layers
            </label>
            <select
              value={resnetLayers}
              onChange={(e) => setResnetLayers(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-500"
            >
              <option value="4 (Frozen Base)">4 (Frozen Base + Fine-Tuned Head)</option>
              <option value="Full Unfrozen">Full Unfrozen (Deep Retrain)</option>
              <option value="CLIP ViT-B/32">CLIP ViT-B/32 Alternative</option>
            </select>
            <p className="text-[10px] text-gray-500">Controls visual feature extraction depth</p>
          </div>

          {/* Hyperparameter 2 */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
            <label className="text-xs font-mono font-semibold text-gray-200 block">
              XGBoost Learning Rate (eta)
            </label>
            <select
              value={xgboostLr}
              onChange={(e) => setXgboostLr(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-500"
            >
              <option value="0.05">0.05 (Default High Stability)</option>
              <option value="0.01">0.01 (Slow Gradient Convergence)</option>
              <option value="0.10">0.10 (Aggressive Retraining)</option>
            </select>
            <p className="text-[10px] text-gray-500">Gradient boosted trees step size</p>
          </div>

          {/* Hyperparameter 3 */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
            <label className="text-xs font-mono font-semibold text-gray-200 block">
              Voting Ensemble Mode
            </label>
            <select
              value={ensembleWeight}
              onChange={(e) => setEnsembleWeight(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-500"
            >
              <option value="Soft Voting (Probabilistic)">Soft Voting (Probabilistic Mean)</option>
              <option value="Hard Voting (Majority)">Hard Voting (Majority Class)</option>
              <option value="Stacking Meta-Learner">Stacking Meta-Learner</option>
            </select>
            <p className="text-[10px] text-gray-500">Combines RF, SVM & XGBoost predictions</p>
          </div>
        </div>
      </div>

      {/* REST API & Code Documentation */}
      <div className="p-6 rounded-2xl bg-[#0D111A] border border-white/10 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono uppercase">
              <Terminal className="h-4 w-4 text-purple-400" /> REST API Endpoint & SDK Integration
            </h3>
            <p className="text-xs text-gray-400">Post payloads to `/api/predict` for instant predictions</p>
          </div>

          <div className="flex items-center gap-2 bg-black/40 p-1 rounded-lg border border-white/5">
            <button
              onClick={() => setActiveCodeTab("fastapi")}
              className={`px-3 py-1 rounded text-xs font-mono transition ${
                activeCodeTab === "fastapi" ? "bg-purple-600 text-white font-bold" : "text-gray-400 hover:text-white"
              }`}
            >
              FastAPI
            </button>
            <button
              onClick={() => setActiveCodeTab("python")}
              className={`px-3 py-1 rounded text-xs font-mono transition ${
                activeCodeTab === "python" ? "bg-purple-600 text-white font-bold" : "text-gray-400 hover:text-white"
              }`}
            >
              Python
            </button>
            <button
              onClick={() => setActiveCodeTab("curl")}
              className={`px-3 py-1 rounded text-xs font-mono transition ${
                activeCodeTab === "curl" ? "bg-purple-600 text-white font-bold" : "text-gray-400 hover:text-white"
              }`}
            >
              cURL
            </button>
          </div>
        </div>

        <div className="relative rounded-xl overflow-hidden bg-black/80 border border-white/10 p-4 font-mono text-xs text-purple-200">
          <button
            onClick={handleCopyCode}
            className="absolute top-3 right-3 px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] font-mono flex items-center gap-1.5 transition"
          >
            {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedCode ? "Copied" : "Copy Code"}</span>
          </button>
          <pre className="overflow-x-auto leading-relaxed pt-2">{getCodeText()}</pre>
        </div>
      </div>

      {/* Technology Stack Table */}
      <div className="p-6 rounded-2xl bg-[#0D111A] border border-white/10 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
          <Cpu className="h-4 w-4 text-purple-400" /> Technology Stack Specifications
        </h3>

        <div className="divide-y divide-white/5">
          {SOFTWARE_STACK_DATA.map((item, idx) => (
            <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="font-mono font-semibold text-gray-300">{item.component}</span>
              <span className="font-mono text-purple-300 bg-white/[0.02] px-3 py-1 rounded border border-white/5">
                {item.techStack}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
