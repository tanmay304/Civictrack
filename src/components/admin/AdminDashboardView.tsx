/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { useCivic } from "../../context/CivicContext";
import { 
  Users, 
  FileText, 
  Clock, 
  CheckCircle2, 
  Wrench, 
  CheckCheck, 
  XCircle, 
  TrendingUp, 
  Award,
  ArrowUpRight,
  Sparkles,
  MapPin,
  ExternalLink,
  ShieldAlert
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area 
} from "recharts";
import { motion } from "motion/react";
import { Issue, UserProfile, AdminStatCards } from "../../types";

interface AdminDashboardViewProps {
  onNavigateToIssues: () => void;
  onNavigateToUsers: () => void;
  onNavigateToAnalytics: () => void;
  onViewIssueDetail: (issue: Issue) => void;
}

const STATUS_COLORS: Record<string, string> = {
  reported: "#f59e0b",
  verified: "#3b82f6",
  "in-progress": "#8b5cf6",
  resolved: "#10b981",
  rejected: "#ef4444"
};

const CATEGORY_COLORS = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0284c7"];

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  onNavigateToIssues,
  onNavigateToUsers,
  onNavigateToAnalytics,
  onViewIssueDetail
}) => {
  const { issues, allUsers } = useCivic();

  // Compute 8 KPI statistics
  const stats: AdminStatCards = useMemo(() => {
    const totalUsers = allUsers.length || 1;
    const totalReports = issues.length;
    const pendingReports = issues.filter(i => i.status === "reported").length;
    const verifiedReports = issues.filter(i => i.status === "verified").length;
    const inProgressReports = issues.filter(i => i.status === "in-progress").length;
    const resolvedReports = issues.filter(i => i.status === "resolved").length;
    const rejectedReports = issues.filter(i => i.status === "rejected").length;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const reportsThisMonth = issues.filter(i => {
      if (!i.createdAt) return false;
      const d = i.createdAt.seconds ? new Date(i.createdAt.seconds * 1000) : new Date(i.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    return {
      totalUsers,
      totalReports,
      pendingReports,
      verifiedReports,
      inProgressReports,
      resolvedReports,
      rejectedReports,
      reportsThisMonth
    };
  }, [issues, allUsers]);

  // Chart data: Reports by Category
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    issues.forEach(i => {
      const cat = i.category || "Uncategorized";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.keys(counts).map((key, idx) => ({
      name: key,
      count: counts[key],
      fill: CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
    }));
  }, [issues]);

  // Chart data: Reports by Status
  const statusData = useMemo(() => {
    return [
      { name: "Reported (Pending)", value: stats.pendingReports, color: "#f59e0b" },
      { name: "Verified", value: stats.verifiedReports, color: "#3b82f6" },
      { name: "In Progress", value: stats.inProgressReports, color: "#8b5cf6" },
      { name: "Resolved", value: stats.resolvedReports, color: "#10b981" },
      { name: "Rejected", value: stats.rejectedReports, color: "#ef4444" }
    ].filter(d => d.value > 0);
  }, [stats]);

  // Monthly trend chart data
  const monthlyData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const currentMonthIdx = now.getMonth();
    
    // Construct last 6 months trend
    const list = [];
    for (let i = 5; i >= 0; i--) {
      const mIdx = (currentMonthIdx - i + 12) % 12;
      const count = issues.filter(iss => {
        if (!iss.createdAt) return false;
        const d = iss.createdAt.seconds ? new Date(iss.createdAt.seconds * 1000) : new Date(iss.createdAt);
        return d.getMonth() === mIdx;
      }).length;

      list.push({
        month: months[mIdx],
        reports: count
      });
    }
    return list;
  }, [issues]);

  // Top Contributors / Reporters Leaderboard
  const topContributors = useMemo(() => {
    return [...allUsers]
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 5);
  }, [allUsers]);

  // Recent 5 Issues
  const recentIssues = useMemo(() => {
    return [...issues].slice(0, 5);
  }, [issues]);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 text-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-blue-500/10">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-white">
              Live Operations
            </span>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight">
            Municipal Command Center
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 max-w-2xl">
            Real-time administrative telemetry, citizen report queues, automated AI categorization insights, and operational statistics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToIssues}
            className="px-5 py-3 rounded-2xl bg-white text-blue-900 font-bold text-xs shadow-lg hover:bg-blue-50 transition-all flex items-center space-x-2 cursor-pointer"
          >
            <span>Manage All Issues</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 8 Top KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Total Users */}
        <motion.div 
          whileHover={{ y: -3 }}
          onClick={onNavigateToUsers}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Users</span>
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display">
              {stats.totalUsers}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Registered Citizens & Officers</p>
          </div>
        </motion.div>

        {/* Card 2: Total Reports */}
        <motion.div 
          whileHover={{ y: -3 }}
          onClick={onNavigateToIssues}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Reports</span>
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display">
              {stats.totalReports}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">All time reported issues</p>
          </div>
        </motion.div>

        {/* Card 3: Pending Reports */}
        <motion.div 
          whileHover={{ y: -3 }}
          onClick={onNavigateToIssues}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-amber-200 dark:border-amber-900/40 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pending Verification</span>
            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/60 text-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-display">
              {stats.pendingReports}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Awaiting admin review</p>
          </div>
        </motion.div>

        {/* Card 4: Verified Reports */}
        <motion.div 
          whileHover={{ y: -3 }}
          onClick={onNavigateToIssues}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-blue-200 dark:border-blue-900/40 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Verified</span>
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 font-display">
              {stats.verifiedReports}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Confirmed valid issues</p>
          </div>
        </motion.div>

        {/* Card 5: In Progress */}
        <motion.div 
          whileHover={{ y: -3 }}
          onClick={onNavigateToIssues}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-purple-200 dark:border-purple-900/40 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">In Progress</span>
            <div className="w-10 h-10 bg-purple-50 dark:bg-purple-950/60 text-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 font-display">
              {stats.inProgressReports}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Active municipal crew work</p>
          </div>
        </motion.div>

        {/* Card 6: Resolved */}
        <motion.div 
          whileHover={{ y: -3 }}
          onClick={onNavigateToIssues}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Resolved</span>
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-display">
              {stats.resolvedReports}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Successfully completed</p>
          </div>
        </motion.div>

        {/* Card 7: Rejected */}
        <motion.div 
          whileHover={{ y: -3 }}
          onClick={onNavigateToIssues}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-rose-200 dark:border-rose-900/40 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Rejected</span>
            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/60 text-rose-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-display">
              {stats.rejectedReports}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Invalid or duplicate items</p>
          </div>
        </motion.div>

        {/* Card 8: Reports This Month */}
        <motion.div 
          whileHover={{ y: -3 }}
          onClick={onNavigateToAnalytics}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">This Month</span>
            <div className="w-10 h-10 bg-sky-50 dark:bg-sky-950/60 text-sky-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display">
              {stats.reportsThisMonth}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">New issues current month</p>
          </div>
        </motion.div>
      </div>

      {/* Analytics Visualizations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Reports by Category (Bar Chart) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                Reports by Category
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Distribution of civic issues reported by citizen community</p>
            </div>
          </div>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "12px" }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Reports by Status (Donut Chart) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display">
              Status Breakdown
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Current state of reported tickets</p>
          </div>

          <div className="h-56 my-2 w-full flex items-center justify-center">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-status-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No data available</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            {statusData.map((st, i) => (
              <div key={i} className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: st.color }} />
                <span className="text-slate-600 dark:text-slate-300 font-medium truncate">{st.name}: <strong className="text-slate-900 dark:text-white">{st.value}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard + Recent Reports Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Citizen Contributors */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-amber-100 dark:bg-amber-950/60 text-amber-600 rounded-xl flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                Top Contributors
              </h2>
            </div>
            <button 
              onClick={onNavigateToUsers}
              className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {topContributors.map((usr, idx) => (
              <div 
                key={usr.uid} 
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center space-x-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                    idx === 0 ? "bg-amber-400 text-amber-950" : idx === 1 ? "bg-slate-300 text-slate-900" : idx === 2 ? "bg-amber-700 text-amber-100" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                      {usr.name}
                    </p>
                    <p className="text-[10px] text-slate-500 capitalize">{usr.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                    {usr.points || 0} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Reports Live Stream */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                Latest Civic Reports
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Real-time incoming report queue</p>
            </div>
            <button 
              onClick={onNavigateToIssues}
              className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
            >
              Full Queue
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Issue</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Reporter</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {recentIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-3">
                        <img 
                          src={issue.imageUrl || "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=120"} 
                          alt={issue.title}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
                        />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                            {issue.title}
                          </p>
                          <p className="text-[10px] text-slate-400 flex items-center space-x-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>Lat {issue.lat.toFixed(2)}, Lng {issue.lng.toFixed(2)}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-600 dark:text-slate-300">
                      {issue.category}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {issue.reporterName}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                        issue.status === "reported" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300" :
                        issue.status === "verified" ? "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300" :
                        issue.status === "in-progress" ? "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300" :
                        issue.status === "resolved" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300" :
                        "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300"
                      }`}>
                        {issue.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onViewIssueDetail(issue)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
