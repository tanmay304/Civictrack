/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { useCivic } from "../context/CivicContext";
import { UserBadge } from "./UserBadge";
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot 
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { UserProfile } from "../types";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  BarChart3, 
  PieChart as PieIcon, 
  Trophy, 
  Sparkles,
  Users,
  Award,
  Loader2,
  Calendar,
  Globe,
  Lightbulb
} from "lucide-react";
import { motion } from "motion/react";

interface AIInsight {
  title: string;
  description: string;
  icon: "alert" | "trend" | "clock" | "globe" | "success";
}

export const Dashboard: React.FC = () => {
  const { issues, loadingIssues } = useCivic();
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  
  // AI Insights state
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [insightsFetched, setInsightsFetched] = useState(false);

  // Fetch AI Insights on data load
  useEffect(() => {
    if (loadingIssues || issues.length === 0 || insightsFetched) return;

    const fetchInsights = async () => {
      setLoadingInsights(true);
      setInsightsError(null);

      // Compute month names
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const countsByMonth: { [key: string]: number } = {};
      issues.forEach(i => {
        if (i.createdAt) {
          try {
            const date = i.createdAt.toDate ? i.createdAt.toDate() : new Date(i.createdAt);
            const month = monthNames[date.getMonth()];
            countsByMonth[month] = (countsByMonth[month] || 0) + 1;
          } catch (e) {}
        }
      });

      // Category counts
      const categoryMap: { [key: string]: number } = {};
      issues.forEach(i => {
        const category = i.category || "Other";
        categoryMap[category] = (categoryMap[category] || 0) + 1;
      });

      // Round lat/lng to 3 decimal places to cluster
      const roundedClusters: { [key: string]: { lat: number; lng: number; total: number; unresolved: number } } = {};
      issues.forEach(i => {
        const roundedLat = Math.round(i.lat * 1000) / 1000;
        const roundedLng = Math.round(i.lng * 1000) / 1000;
        const key = `${roundedLat},${roundedLng}`;
        if (!roundedClusters[key]) {
          roundedClusters[key] = { lat: roundedLat, lng: roundedLng, total: 0, unresolved: 0 };
        }
        roundedClusters[key].total++;
        if (i.status !== "resolved") {
          roundedClusters[key].unresolved++;
        }
      });
      const geographicClusters = Object.values(roundedClusters)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      // Average resolution times
      const resolutionTimesByCategory: { [key: string]: { totalDays: number; count: number } } = {};
      issues.forEach(i => {
        if (i.status === "resolved") {
          const category = i.category || "Other";
          let reportedTime: number | null = null;
          if (i.createdAt) {
            reportedTime = i.createdAt.toDate ? i.createdAt.toDate().getTime() : new Date(i.createdAt).getTime();
          } else {
            const firstHistory = i.statusHistory?.find(h => h.status === "reported");
            if (firstHistory?.timestamp) {
              reportedTime = firstHistory.timestamp.toDate ? firstHistory.timestamp.toDate().getTime() : new Date(firstHistory.timestamp).getTime();
            }
          }
          
          let resolvedTime: number | null = null;
          const resolvedHistory = i.statusHistory?.find(h => h.status === "resolved");
          if (resolvedHistory?.timestamp) {
            resolvedTime = resolvedHistory.timestamp.toDate ? resolvedHistory.timestamp.toDate().getTime() : new Date(resolvedHistory.timestamp).getTime();
          }
          
          if (reportedTime && resolvedTime && resolvedTime >= reportedTime) {
            const diffMs = resolvedTime - reportedTime;
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            if (!resolutionTimesByCategory[category]) {
              resolutionTimesByCategory[category] = { totalDays: 0, count: 0 };
            }
            resolutionTimesByCategory[category].totalDays += diffDays;
            resolutionTimesByCategory[category].count++;
          }
        }
      });
      const avgResolutionTimesByCategory: { [key: string]: number } = {};
      Object.keys(resolutionTimesByCategory).forEach(cat => {
        avgResolutionTimesByCategory[cat] = resolutionTimesByCategory[cat].totalDays / resolutionTimesByCategory[cat].count;
      });

      const issuesSummary = {
        totalIssuesCount: issues.length,
        countsByCategory: categoryMap,
        countsByMonth,
        geographicClusters,
        avgResolutionTimesByCategory
      };

      try {
        const res = await fetch("/api/gemini/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ issuesSummary })
        });
        if (!res.ok) {
          throw new Error("Failed to load AI insights from server");
        }
        const data = await res.json();
        if (data && data.insights) {
          setInsights(data.insights);
        } else {
          throw new Error("Invalid response format");
        }
        setInsightsFetched(true);
      } catch (err: any) {
        console.error("Fetch insights error:", err);
        setInsightsError(err.message || "An error occurred while loading AI insights");
      } finally {
        setLoadingInsights(false);
      }
    };

    fetchInsights();
  }, [issues, loadingIssues, insightsFetched]);

  // Fetch leaderboard data in real-time
  useEffect(() => {
    setLoadingLeaderboard(true);
    const q = query(collection(db, "users"), orderBy("points", "desc"), limit(5));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList: UserProfile[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        usersList.push({
          uid: doc.id,
          name: data.name || "Civic Member",
          points: data.points || 0,
          badges: data.badges || [],
          isAdmin: data.isAdmin || false
        });
      });
      setLeaderboard(usersList);
      setLoadingLeaderboard(false);
    }, (error) => {
      console.error("Leaderboard subscribe failed:", error);
      setLoadingLeaderboard(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Compute aggregate stats from issues list
  const stats = useMemo(() => {
    const totalIssues = issues.length;
    const resolvedIssues = issues.filter(i => i.status === "resolved");
    const totalResolved = resolvedIssues.length;
    
    // Resolution rate percentage
    const resolutionRate = totalIssues > 0 ? (totalResolved / totalIssues) * 100 : 0;
    
    // Average time-to-resolution (in days) for resolved issues
    let totalDaysToResolution = 0;
    let resolvedWithTimestampsCount = 0;
    
    resolvedIssues.forEach(issue => {
      let reportedTime: number | null = null;
      if (issue.createdAt) {
        reportedTime = issue.createdAt.toDate ? issue.createdAt.toDate().getTime() : new Date(issue.createdAt).getTime();
      } else {
        const firstHistory = issue.statusHistory?.find(h => h.status === "reported");
        if (firstHistory?.timestamp) {
          reportedTime = firstHistory.timestamp.toDate ? firstHistory.timestamp.toDate().getTime() : new Date(firstHistory.timestamp).getTime();
        }
      }
      
      let resolvedTime: number | null = null;
      const resolvedHistory = issue.statusHistory?.find(h => h.status === "resolved");
      if (resolvedHistory?.timestamp) {
        resolvedTime = resolvedHistory.timestamp.toDate ? resolvedHistory.timestamp.toDate().getTime() : new Date(resolvedHistory.timestamp).getTime();
      }
      
      if (reportedTime && resolvedTime && resolvedTime >= reportedTime) {
        const diffMs = resolvedTime - reportedTime;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        totalDaysToResolution += diffDays;
        resolvedWithTimestampsCount++;
      }
    });
    
    const avgTimeToResolution = resolvedWithTimestampsCount > 0 
      ? (totalDaysToResolution / resolvedWithTimestampsCount) 
      : 0;
      
    // Category counts data for BarChart
    const categoryMap: { [key: string]: number } = {};
    issues.forEach(i => {
      const category = i.category || "Other";
      categoryMap[category] = (categoryMap[category] || 0) + 1;
    });
    
    const categoryData = Object.keys(categoryMap).map(cat => ({
      name: cat,
      count: categoryMap[cat]
    }));
    
    // Status counts data for PieChart
    let reported = 0, verified = 0, inProgress = 0, resolved = 0;
    issues.forEach(i => {
      if (i.status === "reported") reported++;
      else if (i.status === "verified") verified++;
      else if (i.status === "in-progress") inProgress++;
      else if (i.status === "resolved") resolved++;
    });
    
    const statusData = [
      { name: "Reported", value: reported, color: "#FF8A4C" },     // Signal Orange
      { name: "Verified", value: verified, color: "#2D5BFF" },     // Civic Blue
      { name: "In Progress", value: inProgress, color: "#FFC93C" }, // Spark Yellow
      { name: "Resolved", value: resolved, color: "#34C77B" }      // Resolved Green
    ].filter(s => s.value > 0);
    
    return {
      totalIssues,
      totalResolved,
      resolutionRate,
      avgTimeToResolution,
      categoryData,
      statusData,
      reportedCount: reported,
      verifiedCount: verified,
      inProgressCount: inProgress,
      resolvedCount: resolved
    };
  }, [issues]);

  const localhostIssuesCount = useMemo(() => {
    return issues.filter(i => 
      (i.imageUrl && (i.imageUrl.includes("localhost") || i.imageUrl.includes("127.0.0.1"))) ||
      (i.videoUrl && (i.videoUrl.includes("localhost") || i.videoUrl.includes("127.0.0.1")))
    ).length;
  }, [issues]);

  const topCategories = useMemo(() => {
    return [...stats.categoryData]
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [stats.categoryData]);

  if (loadingIssues) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4" id="dashboard-loading">
        <Loader2 className="h-10 w-10 animate-spin text-civic-blue" />
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Retrieving city analytics dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10" id="dashboard-page">
      {/* Header and Welcome */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-ink flex items-center space-x-2">
            <TrendingUp className="h-8 w-8 text-civic-blue" />
            <span>Civic Analytics Dashboard</span>
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Visualizing neighborhood issues, operational performance, and top contributors in real-time.
          </p>
        </div>
        <div className="sticker-badge sticker-badge-blue">
          <Sparkles className="h-4 w-4 text-civic-blue animate-pulse" />
          <span>Real-time Sync Active</span>
        </div>
      </div>

      {/* Localhost files warning banner */}
      {localhostIssuesCount > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
          id="localhost-warning-banner"
        >
          <div className="flex items-start space-x-3.5">
            <div className="p-2 bg-red-100 text-red-600 rounded-2xl border border-red-200 flex-shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-red-950">Localhost Media Detected ({localhostIssuesCount} issues)</h4>
              <p className="text-xs font-semibold text-red-800/80 mt-1 max-w-2xl leading-relaxed">
                Some test issues in your database are saved with local fallback server URLs (<code className="bg-red-100 px-1 rounded border border-red-200">localhost</code>). While these images show up fine on your local machine, other community members accessing the app won't be able to see them. Please locate these issues and re-upload them.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="dashboard-kpis">
        {/* KPI 1: Total Issues */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between"
          id="kpi-total-reported"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-orange-50/50 text-[#FF8A4C] border border-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Reported</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active local sightings</p>
            </div>
          </div>
          <div className="mt-4 flex">
            <span className="sticker-badge sticker-badge-orange text-3xl font-bold py-1 px-4 tracking-normal">
              {stats.totalIssues}
            </span>
          </div>
        </motion.div>

        {/* KPI 2: Total Resolved */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between"
          id="kpi-total-resolved"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-50/50 text-[#34C77B] border border-green-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Resolved</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Successfully repaired</p>
            </div>
          </div>
          <div className="mt-4 flex">
            <span className="sticker-badge sticker-badge-green text-3xl font-bold py-1 px-4 tracking-normal">
              {stats.totalResolved}
            </span>
          </div>
        </motion.div>

        {/* KPI 3: Resolution Rate */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between"
          id="kpi-resolution-rate"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-50/50 text-[#2D5BFF] border border-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Resolution Rate</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Efficiency tracking</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col space-y-3">
            <div className="flex">
              <span className="sticker-badge sticker-badge-blue text-3xl font-bold py-1 px-4 tracking-normal">
                {stats.resolutionRate.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${stats.resolutionRate}%` }}
                transition={{ duration: 0.8 }}
                className="bg-[#2D5BFF] h-full rounded-full"
              />
            </div>
          </div>
        </motion.div>

        {/* KPI 4: Time to Resolution */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between"
          id="kpi-time-to-resolution"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-amber-50/50 text-[#FFC93C] border border-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Avg Resolution Time</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">From report to repair</p>
            </div>
          </div>
          <div className="mt-4 flex">
            <span className="sticker-badge sticker-badge-yellow text-3xl font-bold py-1 px-4 tracking-normal">
              {stats.avgTimeToResolution > 0 ? `${stats.avgTimeToResolution.toFixed(1)} Days` : "N/A"}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="dashboard-charts">
        {/* Category Bar Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-[420px]" id="chart-by-category">
          <div className="flex items-center space-x-2.5 mb-4">
            <div className="w-10 h-10 bg-blue-50 text-civic-blue rounded-xl flex items-center justify-center border border-blue-100">
              <BarChart3 className="h-5.5 w-5.5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-ink uppercase tracking-wider">Reports by Category</h4>
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Distribution of civic issues across types</p>
            </div>
          </div>

          {/* Top category sticker highlights */}
          {topCategories.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-4 bg-[#F7F8FC] p-3.5 rounded-2xl border border-slate-150">
              <span className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Top Types:</span>
              {topCategories.map((cat, cIdx) => {
                const badgeColors = ["sticker-badge-blue", "sticker-badge-orange", "sticker-badge-yellow"];
                return (
                  <span key={cat.name} className={`sticker-badge ${badgeColors[cIdx % badgeColors.length]} text-[9px] px-2.5 py-0.5 scale-90 origin-left`}>
                    {cat.name} ({cat.count})
                  </span>
                );
              })}
            </div>
          )}

          <div className="flex-1 min-h-0 w-full">
            {stats.categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.categoryData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: "#64748b", fontSize: 10, fontWeight: "600" }}
                    axisLine={{ stroke: "#e2e8f0", strokeWidth: 1 }}
                  />
                  <YAxis 
                    tick={{ fill: "#64748b", fontSize: 10, fontWeight: "600" }}
                    axisLine={{ stroke: "#e2e8f0", strokeWidth: 1 }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "#ffffff", 
                      borderRadius: "12px", 
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                      fontFamily: "sans-serif",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#1A1F36"
                    }}
                  />
                  <Bar dataKey="count" fill="#2D5BFF" radius={[6, 6, 0, 0]}>
                    {stats.categoryData.map((entry, index) => {
                      const colors = ["#2D5BFF", "#FF8A4C", "#34C77B", "#FFC93C", "#1A1F36", "#9A4CFF"];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs font-semibold">
                No categorical data available.
              </div>
            )}
          </div>
        </div>

        {/* Status Pie Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-[420px]" id="chart-by-status">
          <div className="flex items-center space-x-2.5 mb-4">
            <div className="w-10 h-10 bg-amber-50 text-[#D29A00] rounded-xl flex items-center justify-center border border-amber-100">
              <PieIcon className="h-5.5 w-5.5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-ink uppercase tracking-wider">Reports by Lifecycle Status</h4>
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Current state of active issues</p>
            </div>
          </div>
          <div className="flex-1 min-h-0 flex flex-col md:flex-row items-center justify-center gap-6">
            {stats.statusData.length > 0 ? (
              <>
                <div className="w-1/2 h-full min-h-[180px] max-h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: "#ffffff", 
                          borderRadius: "12px", 
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                          fontSize: "12px",
                          fontWeight: "600"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legend */}
                <div className="flex flex-col gap-2.5 flex-1 w-full justify-center">
                  {stats.statusData.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs font-semibold text-ink bg-slate-50 dark:bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors hover:bg-slate-100 dark:bg-slate-800/70">
                      <div className="flex items-center space-x-2">
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{entry.name}</span>
                      </div>
                      <span className="font-sans text-xs text-slate-500 dark:text-slate-400 font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-lg">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs font-semibold">
                No status data available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI-Generated Insights Section */}
      <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50/50 border border-slate-200 dark:border-slate-700 rounded-3xl p-8 space-y-6 shadow-sm" id="dashboard-ai-insights">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 bg-amber-50 text-[#D29A00] rounded-xl flex items-center justify-center border border-amber-100">
              <Lightbulb className="h-5.5 w-5.5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink uppercase tracking-wider flex items-center space-x-1.5">
                <span>AI-Generated Insights</span>
                <Sparkles className="h-4 w-4 text-spark-yellow animate-pulse" />
              </h3>
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                Gemini AI reasoning dynamically over live civic report patterns
              </p>
            </div>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-none w-fit">
            No Future Predictions • Pure live-data synthesis
          </span>
        </div>

        {loadingInsights ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3 bg-white/40 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400 dark:text-slate-500" />
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Analyzing city operational reports...</p>
          </div>
        ) : insightsError ? (
          <div className="p-5 bg-red-50/50 border border-red-250 rounded-2xl text-center text-xs font-semibold text-red-600">
            {insightsError}
          </div>
        ) : insights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, idx) => {
              // Icon selector
              const getIcon = (type: string) => {
                switch (type) {
                  case "alert": return <AlertTriangle className="h-5 w-5 text-[#FF8A4C]" />;
                  case "trend": return <TrendingUp className="h-5 w-5 text-[#2D5BFF]" />;
                  case "clock": return <Clock className="h-5 w-5 text-[#D29A00]" />;
                  case "globe": return <Globe className="h-5 w-5 text-[#2D5BFF]" />;
                  case "success": return <CheckCircle2 className="h-5 w-5 text-[#34C77B]" />;
                  default: return <Lightbulb className="h-5 w-5 text-[#2D5BFF]" />;
                }
              };
              
              const bgColors = {
                alert: "bg-[#FFF3EB] text-[#FF8A4C]",
                trend: "bg-[#EBF0FF] text-[#2D5BFF]",
                clock: "bg-[#FFFCEB] text-[#D29A00]",
                globe: "bg-[#EBF0FF] text-[#2D5BFF]",
                success: "bg-[#EBF9F2] text-[#34C77B]"
              };

              const activeType = insight.icon || "globe";

              return (
                <motion.div
                  key={idx}
                  whileHover={{ y: -1 }}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-150 shadow-sm flex items-start space-x-4"
                  id={`ai-insight-${idx}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border border-slate-100 dark:border-slate-800 ${bgColors[activeType as keyof typeof bgColors] || bgColors.globe}`}>
                    {getIcon(activeType)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-ink leading-tight">{insight.title}</h4>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                      {insight.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 space-y-2 bg-white/60 dark:bg-slate-900/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
            <Lightbulb className="h-8 w-8 text-slate-300" />
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">No report patterns detected yet. Build more reports to trigger insights!</p>
          </div>
        )}
      </div>

      {/* Leaderboard Table (Spark Yellow Theme for Gamification) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 space-y-6 shadow-sm" id="dashboard-leaderboard">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-amber-50/70 text-[#D29A00] rounded-2xl flex items-center justify-center flex-shrink-0 border border-amber-100">
              <Trophy className="h-6 w-6 text-[#D29A00]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-ink uppercase tracking-wider">Top Contributors Leaderboard</h3>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Honoring our community's most active and helpful neighbors</p>
            </div>
          </div>
          <div className="sticker-badge sticker-badge-yellow self-start sm:self-auto">
            <Award className="h-4 w-4 text-[#D29A00]" />
            <span>Top 5 Users</span>
          </div>
        </div>

        {loadingLeaderboard ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400 dark:text-slate-500" />
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Loading civic standings...</p>
          </div>
        ) : leaderboard.length > 0 ? (
          <div className="overflow-x-auto bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-3">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Contributor Name</th>
                  <th className="py-3 px-4 text-center">Badges Earned</th>
                  <th className="py-3 px-4 text-right">Reputation Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaderboard.map((user, idx) => {
                  const isTop3 = idx < 3;
                  const medalColors = [
                    "text-[#D29A00] bg-amber-50 border-amber-200", 
                    "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700", 
                    "text-[#C68A4C] bg-[#F7F0EB] border-[#ECD5C5]"
                  ];
                  
                  return (
                    <tr key={user.uid} className="hover:bg-slate-100 dark:bg-slate-800/30 transition-colors">
                      {/* Rank Column */}
                      <td className="py-4 px-4 font-semibold text-xs">
                        {isTop3 ? (
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full border font-bold ${medalColors[idx]}`}>
                            {idx + 1}
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-8 h-8 text-slate-400 dark:text-slate-500 font-semibold">
                            {idx + 1}
                          </span>
                        )}
                      </td>
                      {/* Contributor Name */}
                      <td className="py-4 px-4 font-bold text-ink text-sm">
                        <div className="flex items-center space-x-2">
                          <span>{user.name}</span>
                          <UserBadge points={user.points} />
                          {user.isAdmin && (
                            <span className="text-[8px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-red-200">
                              Moderator
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Badges Earned */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-md mx-auto">
                          {user.badges && user.badges.length > 0 ? (
                            user.badges.slice(0, 3).map((badge, bIdx) => {
                              let badgeColor = "sticker-badge sticker-badge-ink text-[10px] scale-90";
                              if (badge === "Civic Starter") badgeColor = "sticker-badge sticker-badge-blue text-[10px] scale-90";
                              if (badge === "First Responder") badgeColor = "sticker-badge sticker-badge-green text-[10px] scale-90";
                              if (badge === "Active Citizen") badgeColor = "sticker-badge sticker-badge-yellow text-[10px] scale-90";
                              if (badge === "Civic Guardian") badgeColor = "sticker-badge sticker-badge-orange text-[10px] scale-90";
                              
                              return (
                                <span key={bIdx} className={badgeColor}>
                                  {badge}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[10px] text-slate-300 italic">No badges</span>
                          )}
                          {user.badges && user.badges.length > 3 && (
                            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full">
                              +{user.badges.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Score Column */}
                      <td className="py-4 px-4 text-right">
                        <span className="font-sans text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full">
                          {user.points} PTS
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-slate-400 dark:text-slate-500 font-semibold text-sm bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-700">
            No active contributors yet. Join the movement!
          </div>
        )}
      </div>
    </div>
  );
};
