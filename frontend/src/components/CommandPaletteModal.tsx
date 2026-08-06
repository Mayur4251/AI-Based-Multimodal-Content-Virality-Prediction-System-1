import React, { useState } from "react";
import { Search, X, LayoutDashboard, Zap, BarChart3 } from "lucide-react";
import { NavTab } from "./Navbar";

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: NavTab) => void;
}

export default function CommandPaletteModal({
  isOpen,
  onClose,
  onSelectTab
}: CommandPaletteModalProps) {
  const [query, setQuery] = useState("");

  if (!isOpen) return null;

  const commands = [
    { id: "dashboard", label: "Dashboard Console", icon: LayoutDashboard, desc: "Key virality metrics & history" },
    { id: "prediction", label: "Prediction Engine", icon: Zap, desc: "Upload image & caption for AI run" },
    { id: "analytics", label: "Analytics & Benchmarks", icon: BarChart3, desc: "Confusion matrix & ROC curves" },
  ] as const;

  const filtered = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.desc.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="p-3 border-b border-zinc-800 flex items-center gap-3 bg-zinc-950/60">
          <Search className="h-4 w-4 text-zinc-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, views, or metrics..."
            className="w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none font-sans"
          />
          <button
            onClick={onClose}
            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-2 max-h-72 overflow-y-auto space-y-1">
          {filtered.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.id}
                onClick={() => {
                  onSelectTab(cmd.id as NavTab);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-zinc-800 border border-transparent text-left transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-zinc-950 text-zinc-400 group-hover:text-zinc-100 transition border border-zinc-800">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-zinc-100 block">{cmd.label}</span>
                    <span className="text-[10px] text-zinc-400 block">{cmd.desc}</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 group-hover:text-zinc-300">Jump ↵</span>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-6 text-center text-xs text-zinc-500 font-mono">
              No matching commands found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
