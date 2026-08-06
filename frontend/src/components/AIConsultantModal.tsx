import React, { useState } from "react";
import { X, Send, Sparkles, Bot, User, Flame } from "lucide-react";
import { ChatMessage } from "../types";

interface AIConsultantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIConsultantModal({ isOpen, onClose }: AIConsultantModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I am the ViralAI Chief Virality Architect. Ask me anything about hook copy, visual composition, or algorithmic distribution trends.",
      timestamp: new Date()
    }
  ]);
  const [inputMsg, setInputMsg] = useState("");
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSendMessage = async () => {
    if (!inputMsg.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputMsg,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMsg("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: inputMsg,
          history: messages.map((m) => ({ role: m.role, content: m.content }))
        })
      });
      const data = await response.json();

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || "I recommend focusing on high emotional arousal in the first 3 seconds of video or first line of copy.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      const fallbackMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I recommend testing a high-contrast visual focal point and a curiosity-based hook line.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col h-[520px] overflow-hidden">
        {/* Header */}
        <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-zinc-100 font-sans flex items-center gap-1.5">
                <span>AI Virality Consultant</span>
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono">Gemini-Powered Strategy Assistant</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 font-sans text-xs leading-relaxed">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300 shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              )}

              <div
                className={`max-w-[80%] p-3 rounded-lg border ${
                  msg.role === "user"
                    ? "bg-zinc-100 text-zinc-900 border-zinc-200 rounded-tr-none font-medium"
                    : "bg-zinc-950 text-zinc-200 border-zinc-800 rounded-tl-none"
                }`}
              >
                {msg.content}
              </div>

              {msg.role === "user" && (
                <div className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300 shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}

          {isSending && (
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
              <div className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse" />
              <span>Analyzing virality metrics...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950/60 flex items-center gap-2">
          <input
            type="text"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Ask about hook copy, timing, or visual contrast..."
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMsg.trim() || isSending}
            className="p-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 transition disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
