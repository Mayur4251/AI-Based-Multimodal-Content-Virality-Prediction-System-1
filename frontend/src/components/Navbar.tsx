import React, { useState, useEffect } from "react";
import {
  Flame,
  Menu,
  X,
  Sparkles,
  LayoutDashboard,
  Zap,
  BarChart3,
  User,
  LogIn,
  LogOut,
  UserPlus
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";

export type NavTab = "dashboard" | "prediction" | "analytics";

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenCommandPalette: () => void;
  onOpenChat: () => void;
  currentUser: FirebaseUser | null;
  onOpenAuthModal: (mode?: "login" | "signup") => void;
  onLogout: () => void;
}

export default function Navbar({
  activeTab,
  onTabChange,
  onOpenCommandPalette,
  onOpenChat,
  currentUser,
  onOpenAuthModal,
  onLogout
}: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "prediction", label: "Prediction Engine", icon: Zap },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ] as const;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 border-b ${
        scrolled
          ? "bg-[#0A0D14]/90 backdrop-blur-md border-white/10 shadow-lg"
          : "bg-[#0A0D14]/70 backdrop-blur-sm border-white/5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div
          onClick={() => onTabChange("dashboard")}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
        >
          <div className="h-8 w-8 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-200 group-hover:border-zinc-500 transition">
            <Flame className="h-4 w-4 text-zinc-300 group-hover:text-white transition" />
          </div>
          <div className="flex flex-col">
            <span className="font-sans font-semibold text-sm tracking-tight text-zinc-100 flex items-center gap-2">
              ViralAI <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60 font-normal">v3.2</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-sans tracking-normal">Multimodal Content Virality Engine</span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 bg-zinc-900/80 p-1 rounded-lg border border-zinc-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as NavTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition duration-150 ${
                  isActive
                    ? "bg-zinc-800 text-zinc-100 border border-zinc-700/80 shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-zinc-200" : "text-zinc-500"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* AI Consultant Trigger */}
          <button
            onClick={onOpenChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-medium transition"
          >
            <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
            <span>AI Advisor</span>
          </button>

          {/* Authentication Section */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-xs text-zinc-200 transition"
              >
                <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-100 uppercase">
                  {currentUser.displayName ? currentUser.displayName[0] : currentUser.email ? currentUser.email[0] : "U"}
                </div>
                <span className="hidden sm:inline font-medium max-w-[100px] truncate">
                  {currentUser.displayName || currentUser.email?.split("@")[0]}
                </span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl p-2 z-50 space-y-2">
                  <div className="px-2 py-1.5 border-b border-zinc-800">
                    <p className="text-xs font-semibold text-zinc-200 truncate">
                      {currentUser.displayName || "ViralAI User"}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-mono truncate">
                      {currentUser.email}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-red-400 hover:bg-red-950/40 hover:text-red-300 transition text-left"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onOpenAuthModal("login")}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium transition"
              >
                <LogIn className="h-3.5 w-3.5 text-zinc-400" />
                <span>Sign In</span>
              </button>
              <button
                onClick={() => onOpenAuthModal("signup")}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-medium transition shadow-xs"
              >
                <UserPlus className="h-3.5 w-3.5 text-zinc-700" />
                <span>Sign Up</span>
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0A0D14] border-b border-white/10 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id as NavTab);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? "bg-zinc-800 text-zinc-100 border border-zinc-700/80 shadow-xs font-semibold"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-zinc-200" : "text-zinc-500"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
