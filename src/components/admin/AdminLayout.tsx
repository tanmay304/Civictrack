/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useCivic } from "../../context/CivicContext";
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  BarChart3, 
  Bell, 
  History, 
  Settings, 
  User, 
  LogOut, 
  ShieldAlert,
  Moon,
  Sun,
  Menu,
  X,
  ArrowLeft,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AdminDashboardView } from "./AdminDashboardView";
import { AdminIssueManagement } from "./AdminIssueManagement";
import { AdminUserManagement } from "./AdminUserManagement";
import { AdminAnalytics } from "./AdminAnalytics";
import { AdminNotifications } from "./AdminNotifications";
import { AdminActivityLogs } from "./AdminActivityLogs";
import { AdminSettings } from "./AdminSettings";
import { AdminProfile } from "./AdminProfile";
import { ForbiddenPage } from "./ForbiddenPage";
import { AdminLogin } from "./AdminLogin";
import { Issue } from "../../types";

interface AdminLayoutProps {
  onBackToCitizen: () => void;
}

export type AdminTab = 
  | "dashboard" 
  | "issues" 
  | "users" 
  | "analytics" 
  | "notifications" 
  | "logs" 
  | "settings" 
  | "profile";

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onBackToCitizen }) => {
  const { user, profile, notifications, logOut, isDemo } = useCivic();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [targetDetailIssue, setTargetDetailIssue] = useState<Issue | null>(null);

  // Protected Route Verification:
  // Check if user is logged in and has role === "admin" or "moderator" (or isDemo)
  const isAuthorized = isDemo || (profile && (profile.role === "admin" || profile.role === "moderator" || profile.isAdmin));

  if (!user && !isDemo) {
    return <AdminLogin onLoginSuccess={() => setActiveTab("dashboard")} onBackToCitizen={onBackToCitizen} />;
  }

  if (!isAuthorized) {
    return <ForbiddenPage onBackToDashboard={onBackToCitizen} />;
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  const navItems = [
    { id: "dashboard" as AdminTab, label: "Dashboard", icon: LayoutDashboard },
    { id: "issues" as AdminTab, label: "Issue Management", icon: FileText },
    { id: "users" as AdminTab, label: "Users", icon: Users },
    { id: "analytics" as AdminTab, label: "Analytics", icon: BarChart3 },
    { id: "notifications" as AdminTab, label: "Notifications", icon: Bell, badge: unreadCount },
    { id: "logs" as AdminTab, label: "Activity Logs", icon: History },
    { id: "settings" as AdminTab, label: "Settings", icon: Settings },
    { id: "profile" as AdminTab, label: "Profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-50 antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm h-16 flex items-center px-4 sm:px-6 lg:px-8 justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div 
            onClick={onBackToCitizen}
            className="flex items-center space-x-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="font-display font-black text-lg text-slate-900 dark:text-white tracking-tight flex items-center space-x-1.5">
                <span>CivicTrack</span>
                <span className="text-[10px] bg-blue-600 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Enterprise
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToCitizen}
            className="hidden sm:flex items-center space-x-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Citizen Site</span>
          </button>

          {/* Quick Notification Bell */}
          <button
            onClick={() => setActiveTab("notifications")}
            className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            )}
          </button>

          {/* Profile User Badge */}
          <div 
            onClick={() => setActiveTab("profile")}
            className="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-800 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              {profile?.name ? profile.name.charAt(0).toUpperCase() : "A"}
            </div>
            <span className="hidden md:inline font-bold text-xs text-slate-800 dark:text-slate-200">
              {profile?.name || "Admin"}
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex w-full max-w-[1600px] mx-auto">
        {/* Sidebar Navigation */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-300 transform
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}>
          <div className="p-4 space-y-6 pt-6">
            <div className="px-3">
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                Navigation Menu
              </span>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25 font-black"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
                        isActive ? "bg-white text-blue-600" : "bg-blue-600 text-white"
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer Logout */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={logOut}
              className="w-full flex items-center space-x-3 px-3.5 py-3 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout Admin Session</span>
            </button>
          </div>
        </aside>

        {/* Main Dashboard Workspace Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "dashboard" && (
                <AdminDashboardView
                  onNavigateToIssues={() => setActiveTab("issues")}
                  onNavigateToUsers={() => setActiveTab("users")}
                  onNavigateToAnalytics={() => setActiveTab("analytics")}
                  onViewIssueDetail={(issue) => {
                    setTargetDetailIssue(issue);
                    setActiveTab("issues");
                  }}
                />
              )}
              {activeTab === "issues" && <AdminIssueManagement />}
              {activeTab === "users" && <AdminUserManagement />}
              {activeTab === "analytics" && <AdminAnalytics />}
              {activeTab === "notifications" && <AdminNotifications />}
              {activeTab === "logs" && <AdminActivityLogs />}
              {activeTab === "settings" && <AdminSettings />}
              {activeTab === "profile" && <AdminProfile />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
