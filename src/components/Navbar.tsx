/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useCivic } from "../context/CivicContext";
import { LogIn, LogOut, ShieldAlert, Award, Loader2, Phone, Menu, X, Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserBadge } from "./UserBadge";

interface NavbarProps {
  onNavigate: (tab: "landing" | "dashboard" | "feed" | "report" | "map" | "profile" | "emergency" | "admin-portal" | "admin-login") => void;
  activeTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, activeTab }) => {
  const { user, profile, loadingAuth, signIn, logOut } = useCivic();
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const handleNavClick = (tab: "landing" | "dashboard" | "feed" | "report" | "map" | "profile" | "emergency") => {
    onNavigate(tab);
    setIsOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Left Side: Logo & Navigation */}
          <div className="flex items-center lg:space-x-4 xl:space-x-8">
            {/* Logo & Brand (Always on the Left) */}
            <div 
              onClick={() => handleNavClick(user ? "dashboard" : "landing")}
              className="flex items-center space-x-2.5 cursor-pointer group flex-shrink-0"
              id="nav-brand"
            >
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-200 transition-all group-hover:bg-blue-700">
                <ShieldAlert className="h-5.5 w-5.5" />
              </div>
              <span className="hidden sm:block font-display font-black text-2xl tracking-tight text-blue-900 dark:text-blue-100">
                CivicTrack
              </span>
            </div>

            {/* Desktop Navigation Links (visible on lg and above) */}
            {user && (
              <nav className="hidden lg:flex items-center space-x-3 xl:space-x-6" id="nav-desktop-links">
                <button
                onClick={() => onNavigate("dashboard")}
                className={`relative text-xs font-bold uppercase tracking-widest transition-colors py-2 focus:outline-none focus:ring-0 focus-visible:outline-none cursor-pointer ${
                  activeTab === "dashboard"
                    ? "text-blue-600"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-50"
                }`}
                id="nav-btn-dashboard"
              >
                <span>Dashboard</span>
                {activeTab === "dashboard" && (
                  <motion.span 
                    layoutId="activeNavUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"
                  />
                )}
              </button>

              <button
                onClick={() => onNavigate("feed")}
                className={`relative text-xs font-bold uppercase tracking-widest transition-colors py-2 focus:outline-none focus:ring-0 focus-visible:outline-none cursor-pointer ${
                  activeTab === "feed"
                    ? "text-blue-600"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-50"
                }`}
                id="nav-btn-feed"
              >
                <span>Issue Feed</span>
                {activeTab === "feed" && (
                  <motion.span 
                    layoutId="activeNavUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"
                  />
                )}
              </button>

              <button
                onClick={() => onNavigate("map")}
                className={`relative text-xs font-bold uppercase tracking-widest transition-colors py-2 focus:outline-none focus:ring-0 focus-visible:outline-none cursor-pointer ${
                  activeTab === "map"
                    ? "text-blue-600"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-50"
                }`}
                id="nav-btn-map"
              >
                <span>Map</span>
                {activeTab === "map" && (
                  <motion.span 
                    layoutId="activeNavUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"
                  />
                )}
              </button>

              <button
                onClick={() => onNavigate("profile")}
                className={`relative text-xs font-bold uppercase tracking-widest transition-colors py-2 focus:outline-none focus:ring-0 focus-visible:outline-none cursor-pointer ${
                  activeTab === "profile"
                    ? "text-blue-600"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-50"
                }`}
                id="nav-btn-profile"
              >
                <span>Profile</span>
                {activeTab === "profile" && (
                  <motion.span 
                    layoutId="activeNavUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"
                  />
                )}
              </button>

              <button
                onClick={() => onNavigate("report")}
                className={`relative text-xs font-bold uppercase tracking-widest transition-colors py-2 focus:outline-none focus:ring-0 focus-visible:outline-none cursor-pointer ${
                  activeTab === "report"
                    ? "text-green-600"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-50"
                }`}
                id="nav-btn-report"
              >
                <span>Report Issue</span>
                {activeTab === "report" && (
                  <motion.span 
                    layoutId="activeNavUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 rounded-full"
                  />
                )}
              </button>
            </nav>
          )}
          </div>

          {/* Desktop Right Panel (Emergency, Points, User Profile, Sign Out - visible on lg) */}
          <div className="hidden lg:flex items-center space-x-3 xl:space-x-5" id="nav-desktop-right">
            {/* Emergency Contacts Button (Always visible) */}
            <button
              onClick={() => onNavigate("emergency")}
              className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl border-2 font-black uppercase tracking-widest text-xs transition-all shadow-sm cursor-pointer focus:outline-none focus:ring-0 ${
                activeTab === "emergency"
                  ? "bg-[#FF8A4C] text-white border-ink shadow-[2px_2px_0px_#1A1F36]"
                  : "bg-[#FFF1EB] hover:bg-[#FF8A4C]/15 text-[#FF8A4C] border-[#FF8A4C] hover:-translate-y-0.5 active:translate-y-0"
              }`}
              id="nav-btn-emergency"
            >
              <Phone className="h-4 w-4 animate-pulse" />
              <span>Emergency</span>
            </button>

            {/* Admin Portal Button */}
            <button
              onClick={() => onNavigate("admin-portal")}
              className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl border-2 font-black uppercase tracking-widest text-xs transition-all shadow-sm cursor-pointer focus:outline-none focus:ring-0 ${
                activeTab === "admin-portal" || activeTab === "admin-login"
                  ? "bg-purple-600 text-white border-purple-800 shadow-[2px_2px_0px_#1A1F36]"
                  : "bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border-purple-400 dark:border-purple-800 hover:-translate-y-0.5"
              }`}
              id="nav-btn-admin-portal"
            >
              <ShieldAlert className="h-4 w-4" />
              <span>Admin Portal</span>
            </button>

            {/* Vertical separator */}
            <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700" />

            {/* Auth & Utilities panel */}
            <div className="flex items-center space-x-2 xl:space-x-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-50 transition-colors"
                title="Toggle Dark Mode"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              {loadingAuth ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-400 dark:text-slate-500" />
              ) : user ? (
                <div className="flex items-center space-x-3 xl:space-x-4" id="nav-user-panel">
                  {/* Profile Image / Name / Achievement Badge */}
                  <div 
                    className="flex items-center space-x-3 cursor-pointer shrink-0"
                    onClick={() => onNavigate("profile")}
                    id="nav-user-profile-trigger"
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || "User"}
                        className="h-10 w-10 rounded-full border-2 border-blue-100 object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-sm border-2 border-blue-100 shrink-0">
                        {user.displayName?.charAt(0) || "U"}
                      </div>
                    )}
                    
                    <div className="hidden xl:flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-950 dark:text-slate-50 hover:text-blue-600 transition-colors truncate max-w-[130px] 2xl:max-w-[200px]">
                        {profile?.name || user.displayName || "User"}
                      </span>
                      {profile && <div className="shrink-0 flex items-center"><UserBadge points={profile.points} /></div>}
                    </div>
                  </div>

                  {/* Logout Button */}
                  <button
                    onClick={async () => {
                      await logOut();
                      onNavigate("landing");
                    }}
                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer focus:outline-none focus:ring-0 shrink-0 ml-1"
                    title="Sign Out"
                    id="nav-btn-logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={signIn}
                  className="flex items-center space-x-1.5 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold shadow-md shadow-blue-100 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer focus:outline-none focus:ring-0"
                  id="nav-btn-login"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Right Bar (Hamburger Menu - visible on mobile) */}
          <div className="flex lg:hidden items-center" id="nav-mobile-right">
            {/* Hamburger Toggle */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-950 transition-colors focus:outline-none focus:ring-0 cursor-pointer"
              aria-label="Toggle Menu"
              id="nav-mobile-hamburger"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer (Smooth Dropdown via AnimatePresence) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 overflow-hidden"
            id="nav-mobile-drawer"
          >
            <div className="px-4 pt-2 pb-6 space-y-4">
              
              {/* Emergency Contacts Button (Mobile Drawer) */}
              <button
                onClick={() => handleNavClick("emergency")}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border font-black uppercase tracking-widest text-[12px] transition-all shadow-sm cursor-pointer focus:outline-none focus:ring-0 ${
                  activeTab === "emergency"
                    ? "bg-[#FF8A4C] text-white border-ink shadow-[1px_1px_0px_#1A1F36]"
                    : "bg-[#FFF1EB] text-[#FF8A4C] border-[#FF8A4C] hover:bg-[#FF8A4C] hover:text-white"
                }`}
                id="nav-btn-emergency-mobile-drawer"
              >
                <Phone className="h-4 w-4 animate-pulse" />
                <span>Emergency Contacts</span>
              </button>

              {/* Profile Card if Logged In */}
              {user && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col space-y-3">
                  <div className="flex items-center space-x-3">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || "User"}
                        className="h-10 w-10 rounded-full border-2 border-blue-100 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-sm border-2 border-blue-100">
                        {user.displayName?.charAt(0) || "U"}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-950 dark:text-slate-50 flex items-center flex-wrap gap-1">
                        {profile?.name || user.displayName || "User"}
                        {profile && <UserBadge points={profile.points} />}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{user.email}</span>
                    </div>
                  </div>

                  {profile && (
                    <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-xl border border-green-100 text-xs font-black uppercase tracking-wider w-fit">
                      <Award className="h-3.5 w-3.5 text-green-600" />
                      <span>{profile.points} Reputation Points</span>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation list */}
              {user ? (
                <div className="flex flex-col space-y-1">
                  <button
                    onClick={() => handleNavClick("dashboard")}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all cursor-pointer focus:outline-none ${
                      activeTab === "dashboard"
                        ? "bg-blue-50 text-blue-600"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-950 hover:text-slate-900 dark:text-slate-50"
                    }`}
                  >
                    <span>Dashboard</span>
                    <span className={`h-1.5 w-1.5 rounded-full bg-blue-600 transition-opacity ${activeTab === "dashboard" ? "opacity-100" : "opacity-0"}`} />
                  </button>

                  <button
                    onClick={() => handleNavClick("feed")}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all cursor-pointer focus:outline-none ${
                      activeTab === "feed"
                        ? "bg-blue-50 text-blue-600"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-950 hover:text-slate-900 dark:text-slate-50"
                    }`}
                  >
                    <span>Issue Feed</span>
                    <span className={`h-1.5 w-1.5 rounded-full bg-blue-600 transition-opacity ${activeTab === "feed" ? "opacity-100" : "opacity-0"}`} />
                  </button>

                  <button
                    onClick={() => handleNavClick("map")}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all cursor-pointer focus:outline-none ${
                      activeTab === "map"
                        ? "bg-blue-50 text-blue-600"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-950 hover:text-slate-900 dark:text-slate-50"
                    }`}
                  >
                    <span>Map</span>
                    <span className={`h-1.5 w-1.5 rounded-full bg-blue-600 transition-opacity ${activeTab === "map" ? "opacity-100" : "opacity-0"}`} />
                  </button>

                  <button
                    onClick={() => handleNavClick("profile")}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all cursor-pointer focus:outline-none ${
                      activeTab === "profile"
                        ? "bg-blue-50 text-blue-600"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-950 hover:text-slate-900 dark:text-slate-50"
                    }`}
                  >
                    <span>Profile</span>
                    <span className={`h-1.5 w-1.5 rounded-full bg-blue-600 transition-opacity ${activeTab === "profile" ? "opacity-100" : "opacity-0"}`} />
                  </button>

                  <button
                    onClick={() => handleNavClick("report")}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all cursor-pointer focus:outline-none ${
                      activeTab === "report"
                        ? "bg-green-50 text-green-700 border border-green-100"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-950 hover:text-slate-900 dark:text-slate-50"
                    }`}
                  >
                    <span>Report Issue</span>
                    <span className={`h-1.5 w-1.5 rounded-full bg-green-500 transition-opacity ${activeTab === "report" ? "opacity-100" : "opacity-0"}`} />
                  </button>
                </div>
              ) : (
                <div className="py-2 text-center text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Sign in to track issues, view interactive maps, and submit verified reports.
                </div>
              )}

              {/* Action Buttons inside mobile drawer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col space-y-3">
                {/* Theme Toggle (Mobile Drawer) */}
                <button
                  onClick={toggleTheme}
                  className="flex items-center justify-center space-x-2 w-full py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer focus:outline-none"
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
                </button>

                {user ? (
                  <button
                    onClick={async () => {
                      await logOut();
                      handleNavClick("landing");
                    }}
                    className="flex items-center justify-center space-x-2 w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-bold transition-colors cursor-pointer focus:outline-none"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      signIn();
                      setIsOpen(false);
                    }}
                    className="flex items-center justify-center space-x-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-100 transition-colors cursor-pointer focus:outline-none"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Sign In</span>
                  </button>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
