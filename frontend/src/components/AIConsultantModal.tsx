import React, { useState } from "react";
import { X, Send, Sparkles, Bot, User, Flame, AlertTriangle } from "lucide-react";
import { ChatMessage } from "../types";

export interface AdvisorPostingTime {
  current_time?: string;
  recommended_window?: string;
  performance?: string;
}

export interface AdvisorImprovement {
  title: string;
  why: string;
  how: string;
}

export interface AdvisorContext {
  caption: string;
  platform: string;
  category: string;
  mediaType: string;
  viralityScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestedHashtags: string[];
  postingTime: AdvisorPostingTime | null;
  topImprovements: AdvisorImprovement[];
}

interface AIConsultantModalProps {
  isOpen: boolean;
  onClose: () => void;
  context?: AdvisorContext | null;
}

export default function AIConsultantModal({ isOpen, onClose, context }: AIConsultantModalProps) {
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

    // Send the CURRENT message + prior history explicitly, so the
    // request never depends on a stale closure over `messages`.
    const historyForRequest = messages.map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    const sentMessage = inputMsg;
    setInputMsg("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: sentMessage,
          history: historyForRequest,
          context: context ?? null,
        })
      });

      // Don't assume the body is JSON just because the request didn't
      // throw -- a misrouted request (wrong port, dev server serving
      // index.html instead of hitting Express) returns 200/404 HTML,
      // and json() on that throws, previously landing silently in the
      // generic catch block below with no indication anything was wrong.
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();

      if (!data || typeof data.reply !== "string" || !data.reply.trim()) {
        throw new Error("Server returned an empty or invalid response.");
      }

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        // If the backend fell back to its own simulated responder
        // (Gemini key missing/unavailable), say so plainly instead of
        // presenting a canned line as if it were a real, tailored answer.
        content: data.fallbackMode
          ? `${data.reply}\n\n(Note: the AI model is temporarily unavailable, so this is a general suggestion rather than a fully tailored answer.)`
          : data.reply,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("Chat error:", err);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "⚠️ I couldn't reach the AI service just now, so I don't have a real answer to your last question. Please check your connection and try again.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const captionSnippet =
    context?.caption && context.caption.length > 60
      ? `${context.caption.slice(0, 60)}…`
      : context?.caption;

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

        {context ? (
          <div className="px-4 py-2 border-b border-zinc-800 bg-purple-950/20 flex items-center gap-2">
            <Flame className="h-3 w-3 text-purple-300 shrink-0" />
            <span className="text-[10px] text-purple-200 truncate">
              Advising on: "{captionSnippet || "(no caption)"}" · {context.platform} · {context.viralityScore}% virality
            </span>
          </div>
        ) : (
          <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-950/40 flex items-center gap-2">
            <Flame className="h-3 w-3 text-zinc-600 shrink-0" />
            <span className="text-[10px] text-zinc-500">
              No prediction loaded yet — run a prediction first for advice grounded in your actual result.
            </span>
          </div>
        )}

        {/* Messages Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 font-sans text-xs leading-relaxed">
          {messages.map((msg) => {
            const isError = msg.role === "assistant" && msg.content.startsWith("⚠️");
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                    isError
                      ? "bg-red-950/40 border-red-800/60 text-red-300"
                      : "bg-zinc-800 border-zinc-700/60 text-zinc-300"
                  }`}>
                    {isError ? <AlertTriangle className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>
                )}

                <div
                  className={`max-w-[80%] p-3 rounded-lg border whitespace-pre-line ${
                    msg.role === "user"
                      ? "bg-zinc-100 text-zinc-900 border-zinc-200 rounded-tr-none font-medium"
                      : isError
                      ? "bg-red-950/30 text-red-200 border-red-800/60 rounded-tl-none"
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
            );
          })}

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
            onKeyDown={(e) => e.key === "Enter" && !isSending && handleSendMessage()}
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