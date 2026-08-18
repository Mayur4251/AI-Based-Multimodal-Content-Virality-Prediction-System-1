import React, { useState } from "react";

import {
  Sparkles,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  Zap,
  TrendingUp,
  Cpu,
  ArrowRight,
  ShieldCheck,
  Globe,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  updateProfile,
} from "firebase/auth";

import { auth } from "../lib/firebase";

interface AuthGateViewProps {
  onGuestAccess?: () => void;
}

export default function AuthGateView({
  onGuestAccess,
}: AuthGateViewProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  const [error, setError] = useState("");

  // --------------------------------------------------
  // EMAIL LOGIN / SIGNUP
  // --------------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    if (mode === "signup" && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        // Create Firebase account
        const result = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

        // Save display name to Firebase user profile
        if (displayName.trim()) {
          await updateProfile(result.user, {
            displayName: displayName.trim(),
          });
        }
      } else {
        // Login with Firebase email/password
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
      }

      setLoading(false);
    } catch (err: any) {
      setLoading(false);

      console.error("Auth gate error:", err);

      const code = err?.code || "";

      if (code === "auth/email-already-in-use") {
        setError(
          "An account with this email already exists. Please switch to Sign In."
        );
      } else if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found"
      ) {
        setError(
          "Invalid credentials. Please verify your email and password."
        );
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (code === "auth/weak-password") {
        setError(
          "Password is too weak. Please use at least 6 characters."
        );
      } else if (code === "auth/too-many-requests") {
        setError(
          "Too many attempts. Please wait a moment and try again."
        );
      } else {
        setError(
          err?.message ||
            "Authentication failed. Please try again."
        );
      }
    }
  };

  // --------------------------------------------------
  // GOOGLE LOGIN
  // --------------------------------------------------

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();

      await signInWithPopup(auth, provider);

      setLoading(false);
    } catch (err: any) {
      setLoading(false);

      console.error("Google Auth error:", err);

      if (err?.code !== "auth/popup-closed-by-user") {
        setError(
          "Google sign-in failed. Please try again or use email sign in."
        );
      }
    }
  };

  // --------------------------------------------------
  // GUEST LOGIN
  // --------------------------------------------------

  const handleGuestClick = async () => {
    setError("");
    setGuestLoading(true);

    try {
      await signInAnonymously(auth);

      if (onGuestAccess) {
        onGuestAccess();
      }
    } catch (err: any) {
      console.error("Guest authentication error:", err);

      setError(
        err?.message ||
          "Guest access is currently unavailable. Please sign in or create an account."
      );
    } finally {
      setGuestLoading(false);
    }
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col justify-between selection:bg-purple-500 selection:text-white relative overflow-hidden">

      {/* Background ambient lighting glows */}

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/15 blur-[140px] rounded-full pointer-events-none" />

      <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      {/* --------------------------------------------------
          TOP HEADER
      -------------------------------------------------- */}

      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-zinc-800/60">

        <div className="flex items-center gap-3">

          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5 shadow-lg shadow-purple-900/30">

            <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">

              <Zap className="w-5 h-5 text-purple-400 fill-purple-400" />

            </div>

          </div>

          <div>

            <div className="flex items-center gap-2">

              <span className="text-lg font-extrabold tracking-tight text-white">
                ViralAI
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 font-medium">
              Multimodal Content Engine
            </p>

          </div>

        </div>

        <button
          onClick={handleGuestClick}
          disabled={guestLoading}
          className="text-xs font-semibold text-zinc-300 hover:text-white px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition flex items-center gap-2 group disabled:opacity-50"
        >

          <span>
            {guestLoading
              ? "Opening Guest Session..."
              : "Continue as Guest"}
          </span>

          <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition" />

        </button>

      </header>

      {/* --------------------------------------------------
          MAIN AUTHENTICATION GATE
      -------------------------------------------------- */}

      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 py-12 my-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

        {/* --------------------------------------------------
            LEFT COLUMN
        -------------------------------------------------- */}

        <div className="lg:col-span-7 space-y-8">

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/80 border border-purple-800/80 text-purple-300 text-xs font-mono font-semibold">

            <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />

            <span>
              AUTHENTICATION GATEWAY · SYSTEM ONLINE
            </span>

          </div>

          <div className="space-y-4">

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.1]">

              Predict{" "}

              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
                Virality
              </span>{" "}

              Before You Post

            </h1>

            <p className="text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
              Sign in or authenticate to access multimodal image vision
              analytics, AI caption sentiment scoring, and real-time
              cross-platform virality benchmarking.
            </p>

          </div>

          {/* Feature Highlights */}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">

            {/* Vision AI */}

            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">

              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">

                <Cpu className="w-4 h-4" />

              </div>

              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Vision AI Vectors
              </h3>

              <p className="text-[11px] text-zinc-400 leading-snug">
                Deep multimodal image feature extraction and thumbnail
                scoring.
              </p>

            </div>

            {/* Reach Prediction */}

            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">

              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">

                <TrendingUp className="w-4 h-4" />

              </div>

              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Reach Prediction
              </h3>

              <p className="text-[11px] text-zinc-400 leading-snug">
                Calculated viral probability scores across 4 social
                platforms.
              </p>

            </div>

            {/* Firestore */}

            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">

              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">

                <Globe className="w-4 h-4" />

              </div>

              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Live Firestore
              </h3>

              <p className="text-[11px] text-zinc-400 leading-snug">
                Instant database synchronization and cross-creator
                history.
              </p>

            </div>

          </div>

          {/* Trust Footer */}

          <div className="flex items-center gap-6 pt-4 text-xs font-mono text-zinc-500">

            <div className="flex items-center gap-1.5">

              <ShieldCheck className="w-4 h-4 text-emerald-400" />

              <span>
                Firebase Auth Protected
              </span>

            </div>

          </div>

        </div>

        {/* --------------------------------------------------
            RIGHT COLUMN - AUTH CARD
        -------------------------------------------------- */}

        <div className="lg:col-span-5">

          <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-6 relative overflow-hidden">

            {/* Authentication Card Header */}

            <div className="space-y-4">

              <div className="text-center space-y-1">

                <h2 className="text-xl font-bold text-white tracking-tight">

                  {mode === "login"
                    ? "Sign In to ViralAI"
                    : "Create Creator Account"}

                </h2>

                <p className="text-xs text-zinc-400">

                  {mode === "login"
                    ? "Enter your credentials below to access your dashboard"
                    : "Register to save custom predictions and unlock full insights"}

                </p>

              </div>

              {/* Login / Register Tabs */}

              <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-950/80 border border-zinc-800">

                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-2 ${
                    mode === "login"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-900/30 font-bold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >

                  <LogIn className="w-3.5 h-3.5" />

                  <span>
                    Sign In
                  </span>

                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError("");
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-2 ${
                    mode === "signup"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-900/30 font-bold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >

                  <UserPlus className="w-3.5 h-3.5" />

                  <span>
                    Register
                  </span>

                </button>

              </div>

            </div>

            {/* Error Banner */}

            {error && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-800/80 text-red-300 text-xs flex items-start gap-2.5">

                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />

                <span className="leading-snug">
                  {error}
                </span>

              </div>
            )}

            {/* Google Authentication */}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-700/80 text-xs font-semibold text-white transition flex items-center justify-center gap-3 group disabled:opacity-50"
            >

              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
              >

                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"
                />

                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />

                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.2-.7-.4-1.5-.4-2.3z"
                />

                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                />

              </svg>

              <span>
                Continue with Google
              </span>

            </button>

            {/* Divider */}

            <div className="relative flex items-center justify-center">

              <div className="border-t border-zinc-800 w-full" />

              <span className="bg-zinc-900 px-3 text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-semibold absolute">
                OR EMAIL AUTH
              </span>

            </div>

            {/* Email / Password Form */}

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >

              {/* Display Name - Signup only */}

              {mode === "signup" && (
                <div className="space-y-1">

                  <label className="text-[11px] font-mono font-semibold text-zinc-400">
                    Display Name
                  </label>

                  <div className="relative">

                    <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />

                    <input
                      type="text"
                      placeholder="e.g. Alex Creator"
                      value={displayName}
                      onChange={(e) =>
                        setDisplayName(e.target.value)
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition"
                    />

                  </div>

                </div>
              )}

              {/* Email */}

              <div className="space-y-1">

                <label className="text-[11px] font-mono font-semibold text-zinc-400">
                  Email Address
                </label>

                <div className="relative">

                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />

                  <input
                    type="email"
                    required
                    placeholder="creator@domain.com"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition"
                  />

                </div>

              </div>

              {/* Password */}

              <div className="space-y-1">

                <label className="text-[11px] font-mono font-semibold text-zinc-400">
                  Password
                </label>

                <div className="relative">

                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-10 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
                  >

                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}

                  </button>

                </div>

              </div>

              {/* Submit */}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-purple-900/30 transition transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >

                {loading ? (
                  <span className="flex items-center gap-2 font-mono">

                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />

                    Authenticating...

                  </span>
                ) : (
                  <>
                    <span>
                      {mode === "login"
                        ? "Sign In to Dashboard"
                        : "Create Account & Enter"}
                    </span>

                    <ArrowRight className="w-4 h-4" />
                  </>
                )}

              </button>

            </form>

            {/* Direct Guest Bypass */}

            <div className="pt-2 border-t border-zinc-800/80 text-center space-y-2">

              <p className="text-[11px] text-zinc-500">
                Just exploring the app without an account?
              </p>

              <button
                type="button"
                onClick={handleGuestClick}
                disabled={guestLoading}
                className="w-full py-2 px-3 rounded-xl bg-zinc-950/60 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition flex items-center justify-center gap-2"
              >

                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />

                <span>
                  {guestLoading
                    ? "Opening Guest Session..."
                    : "Enter Dashboard as Guest"}
                </span>

              </button>

            </div>

          </div>

        </div>

      </main>

      {/* --------------------------------------------------
          FOOTER
      -------------------------------------------------- */}

    </div>
  );
}