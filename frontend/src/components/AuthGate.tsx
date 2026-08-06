import React, { useState } from "react";
import { Sparkles, Mail, Lock, User as UserIcon, AlertCircle, LogIn, UserPlus, CheckCircle2, Zap, BarChart3, ShieldCheck, Flame } from "lucide-react";
import { signUpUser, signInUser, signInWithGoogle } from "../lib/firebase";

export default function AuthGate() {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    if (mode === "signup" && password.length < 6) {
      setError("Password should be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        await signUpUser(email, password, displayName);
        setSuccess("Account created! Redirecting to dashboard...");
      } else {
        await signInUser(email, password);
        setSuccess("Signed in successfully! Redirecting...");
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let message = err.message || "An authentication error occurred.";
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        message = "Invalid email or password credentials.";
      } else if (err.code === "auth/email-already-in-use") {
        message = "An account with this email already exists. Try signing in.";
      } else if (err.code === "auth/popup-closed-by-user") {
        message = "Sign-in popup was closed before completing.";
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      setSuccess("Signed in with Google! Redirecting...");
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") {
        setError("Sign-in popup was closed. Click 'Continue with Google' when ready.");
      } else if (err?.code === "auth/popup-blocked") {
        setError("Sign-in popup was blocked by browser. Please enable popups.");
      } else {
        console.error("Google sign in error:", err);
        setError(err?.message || "Google Sign-In failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-amber-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-2xl bg-[#0e1017] border border-zinc-800/80 shadow-2xl overflow-hidden z-10">
        
        {/* LEFT COLUMN: Value Proposition & Feature Badges (5 cols) */}
        <div className="lg:col-span-5 p-6 sm:p-8 bg-gradient-to-br from-zinc-950 via-[#0a0c12] to-zinc-950 border-b lg:border-b-0 lg:border-r border-zinc-800/80 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-zinc-950 shadow-md">
                <Flame className="h-5 w-5 fill-current" />
              </div>
              <div>
                <span className="text-base font-bold font-mono text-zinc-100 tracking-tight">ViralAI Studio</span>
                <span className="block text-[10px] font-mono text-zinc-500">v2.4 Multimodal Engine</span>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 leading-tight">
                Predict Content Virality Before You Publish.
              </h1>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Sign up to unlock real-time ResNet50 visual extraction, TF-IDF hook scoring, SHAP explainable AI, and cloud prediction history.
              </p>
            </div>

            {/* Value Highlights */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                <Zap className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Ensemble Virality Scoring</h4>
                  <p className="text-[11px] text-zinc-500">Combines CatBoost, SVM, and Neural Nets for 94%+ accuracy.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                <BarChart3 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">SHAP Feature Explanations</h4>
                  <p className="text-[11px] text-zinc-500">Know exactly why your caption or visual scored low or high.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                <ShieldCheck className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Firestore Cloud Sync</h4>
                  <p className="text-[11px] text-zinc-500">Save and access your predictions across all your devices.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Free Access Tier</span>
            <span>Instant Setup</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Sign Up / Sign In Form (7 cols) */}
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-center space-y-5 bg-[#0e1017]">
          {/* Header */}
          <div className="space-y-1">
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-mono border border-zinc-700/60">
              AUTHENTICATION GATE
            </span>
            <h2 className="text-lg font-bold text-zinc-100">
              {mode === "signup" ? "Create Your Free Account" : "Welcome Back"}
            </h2>
            <p className="text-xs text-zinc-400">
              {mode === "signup"
                ? "Sign up first to enter the ViralAI prediction workspace."
                : "Enter your credentials to access your saved predictions."}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border border-zinc-800 bg-zinc-950 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition flex items-center justify-center gap-1.5 ${
                mode === "signup"
                  ? "bg-zinc-800 text-zinc-100 border border-zinc-700/80 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Sign Up</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition flex items-center justify-center gap-1.5 ${
                mode === "login"
                  ? "bg-zinc-800 text-zinc-100 border border-zinc-700/80 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </button>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-800/80 text-red-200 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                <span className="leading-relaxed">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* Google SSO Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-zinc-950 hover:bg-zinc-900 text-zinc-200 font-medium text-xs border border-zinc-800 transition flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center my-1">
            <div className="border-t border-zinc-800 w-full" />
            <span className="bg-[#0e1017] px-2 text-[10px] font-mono text-zinc-500 uppercase absolute">OR EMAIL</span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">Display Name</label>
                <div className="relative">
                  <UserIcon className="h-3.5 w-3.5 absolute left-3 top-2.5 text-zinc-500" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">Email Address</label>
              <div className="relative">
                <Mail className="h-3.5 w-3.5 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">Password</label>
              <div className="relative">
                <Lock className="h-3.5 w-3.5 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 font-semibold text-xs transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2 shadow-xs"
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-zinc-600 border-t-zinc-900 animate-spin" />
              ) : mode === "signup" ? (
                <>
                  <UserPlus className="h-3.5 w-3.5 text-zinc-900" />
                  <span>Create Account & Enter Platform</span>
                </>
              ) : (
                <>
                  <LogIn className="h-3.5 w-3.5 text-zinc-900" />
                  <span>Sign In & Enter Platform</span>
                </>
              )}
            </button>
          </form>

          {/* Toggle Switch */}
          <div className="text-center pt-2 border-t border-zinc-800/60">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setError(null);
                setSuccess(null);
              }}
              className="text-xs text-zinc-400 hover:text-zinc-200 underline font-sans transition"
            >
              {mode === "signup"
                ? "Already registered? Sign in here"
                : "Need an account? Sign up here"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
