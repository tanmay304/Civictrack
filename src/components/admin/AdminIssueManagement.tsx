/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { useCivic } from "../../context/CivicContext";
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Wrench, 
  CheckCheck, 
  Trash2, 
  Eye, 
  MapPin, 
  Sparkles, 
  Clock, 
  User, 
  Calendar,
  AlertTriangle,
  X,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  Send
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Issue, IssueStatus } from "../../types";
import { exportToCSV, exportToPDF, formatIssuesForExport } from "../../services/exportService";

export const AdminIssueManagement: React.FC = () => {
  const { issues, changeStatus, verifyIssue, rejectIssue, deleteIssue } = useCivic();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  // Selected Issue for Drawer/Modal
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [remarks, setRemarks] = useState("");
  const [newStatus, setNewStatus] = useState<IssueStatus | "">("");

  // Confirmation modal state for deletion
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Dynamic Category options
  const categories = useMemo(() => {
    const set = new Set<string>();
    issues.forEach(i => set.add(i.category));
    return Array.from(set);
  }, [issues]);

  // Filtered Issues list
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch = 
        issue.id.toLowerCase().includes(query) ||
        issue.title.toLowerCase().includes(query) ||
        issue.reporterName.toLowerCase().includes(query) ||
        (issue.reporterEmail && issue.reporterEmail.toLowerCase().includes(query)) ||
        issue.category.toLowerCase().includes(query) ||
        (issue.aiCategory && issue.aiCategory.toLowerCase().includes(query));

      const matchesStatus = statusFilter === "all" || issue.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || issue.category === categoryFilter;
      const matchesSeverity = severityFilter === "all" || String(issue.severity) === severityFilter;

      return matchesSearch && matchesStatus && matchesCategory && matchesSeverity;
    });
  }, [issues, searchTerm, statusFilter, categoryFilter, severityFilter]);

  const handleOpenDetail = (issue: Issue) => {
    setSelectedIssue(issue);
    setNewStatus(issue.status);
    setRemarks(issue.remarks || "");
  };

  const handleUpdateStatusSubmit = async () => {
    if (!selectedIssue || !newStatus) return;
    await changeStatus(selectedIssue.id, newStatus as IssueStatus, remarks);
    setSelectedIssue(null);
    setRemarks("");
  };

  const handleExportCSV = () => {
    const formatted = formatIssuesForExport(filteredIssues);
    exportToCSV(formatted, "civictrack_issues_export");
  };

  const handleExportPDF = () => {
    const summary = [
      { label: "Total Filtered Issues", value: filteredIssues.length },
      { label: "Pending", value: filteredIssues.filter(i => i.status === "reported").length },
      { label: "Verified", value: filteredIssues.filter(i => i.status === "verified").length },
      { label: "Resolved", value: filteredIssues.filter(i => i.status === "resolved").length },
    ];
    const headers = ["ID", "Title", "Category", "Severity", "Status", "Reporter", "Date"];
    const rows = filteredIssues.map(i => [
      i.id,
      i.title,
      i.category,
      i.severity,
      i.status.toUpperCase(),
      i.reporterName,
      i.createdAt?.seconds ? new Date(i.createdAt.seconds * 1000).toLocaleDateString() : "N/A"
    ]);
    exportToPDF("Civic Issue Audit & Management Report", summary, headers, rows, "civictrack_issues_report");
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Export Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-slate-900 dark:text-white tracking-tight">
            Issue Management Portal
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review citizen submissions, trigger status workflows, inspect Gemini AI telemetry, and manage Firestore state.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center space-x-2 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/20 flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>PDF Executive Summary</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Field */}
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, title, reporter, category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="reported">Reported (Pending)</option>
              <option value="verified">Verified</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="lg:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div className="lg:col-span-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Severity</option>
              <option value="5">Severity 5 (Critical)</option>
              <option value="4">Severity 4 (High)</option>
              <option value="3">Severity 3 (Moderate)</option>
              <option value="2">Severity 2 (Low)</option>
              <option value="1">Severity 1 (Minor)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>Showing <strong>{filteredIssues.length}</strong> of {issues.length} total reports</span>
          {(searchTerm || statusFilter !== "all" || categoryFilter !== "all" || severityFilter !== "all") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setCategoryFilter("all");
                setSeverityFilter("all");
              }}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Issue Interactive Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-4">Photo</th>
                <th className="py-4 px-4">Title & ID</th>
                <th className="py-4 px-4">Reporter</th>
                <th className="py-4 px-4">Category</th>
                <th className="py-4 px-4">Priority</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4">Date Created</th>
                <th className="py-4 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {filteredIssues.length > 0 ? (
                filteredIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    {/* Photo Thumbnail */}
                    <td className="py-3.5 px-4">
                      <img
                        src={issue.imageUrl || "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=150"}
                        alt={issue.title}
                        onClick={() => handleOpenDetail(issue)}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 cursor-pointer hover:scale-105 transition-transform"
                      />
                    </td>

                    {/* Title & ID */}
                    <td className="py-3.5 px-4">
                      <div className="max-w-[200px]">
                        <p 
                          onClick={() => handleOpenDetail(issue)}
                          className="font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {issue.title}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">#{issue.id}</p>
                      </div>
                    </td>

                    {/* Reporter */}
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{issue.reporterName}</p>
                        <p className="text-[10px] text-slate-400">{issue.reporterEmail || "Citizen"}</p>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                        {issue.category}
                      </span>
                    </td>

                    {/* Priority / Severity */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1">
                        <span className={`w-2 h-2 rounded-full ${
                          issue.severity >= 4 ? "bg-red-500" : issue.severity === 3 ? "bg-amber-500" : "bg-emerald-500"
                        }`} />
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">Lvl {issue.severity}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        issue.status === "reported" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300" :
                        issue.status === "verified" ? "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300" :
                        issue.status === "in-progress" ? "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300" :
                        issue.status === "resolved" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300" :
                        "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300"
                      }`}>
                        {issue.status}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {issue.createdAt?.seconds 
                        ? new Date(issue.createdAt.seconds * 1000).toLocaleDateString()
                        : "Recent"}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        {/* View Details */}
                        <button
                          onClick={() => handleOpenDetail(issue)}
                          title="View Full Details"
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Workflow: Verify */}
                        {issue.status === "reported" && (
                          <button
                            onClick={() => verifyIssue(issue.id)}
                            title="Verify Report"
                            className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Workflow: In Progress */}
                        {issue.status === "verified" && (
                          <button
                            onClick={() => changeStatus(issue.id, "in-progress", "Work dispatched")}
                            title="Mark In Progress"
                            className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors cursor-pointer"
                          >
                            <Wrench className="w-4 h-4" />
                          </button>
                        )}

                        {/* Workflow: Resolve */}
                        {issue.status !== "resolved" && issue.status !== "rejected" && (
                          <button
                            onClick={() => changeStatus(issue.id, "resolved", "Issue resolved cleanly")}
                            title="Mark Resolved"
                            className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors cursor-pointer"
                          >
                            <CheckCheck className="w-4 h-4" />
                          </button>
                        )}

                        {/* Workflow: Reject */}
                        {issue.status !== "rejected" && issue.status !== "resolved" && (
                          <button
                            onClick={() => rejectIssue(issue.id, "Rejected by admin")}
                            title="Reject Report"
                            className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900 transition-colors cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteConfirmId(issue.id)}
                          title="Delete Report"
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    No matching issue reports found. Try adjusting search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ISSUE DETAIL DRAWER / MODAL */}
      <AnimatePresence>
        {selectedIssue && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 max-w-4xl w-full rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8"
            >
              {/* Drawer Top Header */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    selectedIssue.status === "reported" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" :
                    selectedIssue.status === "verified" ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" :
                    selectedIssue.status === "in-progress" ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300" :
                    selectedIssue.status === "resolved" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" :
                    "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                  }`}>
                    {selectedIssue.status}
                  </span>
                  <h3 className="font-display font-black text-lg text-slate-900 dark:text-white truncate max-w-md">
                    {selectedIssue.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left Column: Image & Location */}
                  <div className="md:col-span-6 space-y-4">
                    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 relative group">
                      <img
                        src={selectedIssue.imageUrl || "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=800"}
                        alt={selectedIssue.title}
                        className="w-full h-64 object-cover"
                      />
                      <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-mono px-3 py-1 rounded-xl">
                        Lat {selectedIssue.lat.toFixed(4)}, Lng {selectedIssue.lng.toFixed(4)}
                      </div>
                    </div>

                    {/* Reporter Box */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <User className="w-4 h-4 text-blue-600" />
                        <span>Reporter Metadata</span>
                      </div>
                      <p className="text-xs font-black text-slate-900 dark:text-white">{selectedIssue.reporterName}</p>
                      <p className="text-[11px] text-slate-500">{selectedIssue.reporterEmail || "ID: " + selectedIssue.reporterId}</p>
                    </div>
                  </div>

                  {/* Right Column: AI Analysis & Description */}
                  <div className="md:col-span-6 space-y-4">
                    {/* Gemini AI Card */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                          <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                          <span>Gemini AI Visual Assessment</span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                          Verified AI
                        </span>
                      </div>
                      <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                        <p><strong>AI Category:</strong> {selectedIssue.aiCategory || selectedIssue.category}</p>
                        <p><strong>AI Severity Assessment:</strong> Level {selectedIssue.aiSeverity || selectedIssue.severity} / 5</p>
                        {selectedIssue.aiDescription && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                            "{selectedIssue.aiDescription}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Issue Description</h4>
                      <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                        {selectedIssue.description}
                      </p>
                    </div>

                    {/* Change Status Workflow Controls */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        <span>Update Workflow Status</span>
                      </h4>

                      <div className="grid grid-cols-2 gap-2">
                        {(["reported", "verified", "in-progress", "resolved", "rejected"] as IssueStatus[]).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setNewStatus(st)}
                            className={`py-2 px-3 rounded-xl text-xs font-bold uppercase transition-all border ${
                              newStatus === st 
                                ? "bg-blue-600 text-white border-blue-600 shadow-md" 
                                : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Administrative Remarks</label>
                        <input
                          type="text"
                          placeholder="e.g. Work crew dispatched to Main St..."
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <button
                        onClick={handleUpdateStatusSubmit}
                        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Apply Status Update & Write to Firestore</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Timeline / Status History */}
                {selectedIssue.statusHistory && selectedIssue.statusHistory.length > 0 && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status History Timeline</h4>
                    <div className="space-y-2">
                      {selectedIssue.statusHistory.map((hist, idx) => (
                        <div key={idx} className="flex items-center space-x-3 text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                          <span className="w-2 h-2 rounded-full bg-blue-600" />
                          <span className="font-bold text-slate-900 dark:text-white uppercase">{hist.status}</span>
                          <span className="text-slate-400 text-[10px]">
                            {hist.timestamp?.seconds ? new Date(hist.timestamp.seconds * 1000).toLocaleString() : "Recently"}
                          </span>
                          {hist.note && <span className="text-slate-500 dark:text-slate-400 font-medium">({hist.note})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950 text-rose-600 rounded-2xl mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-display font-black text-lg text-slate-900 dark:text-white">Delete Report?</h3>
            <p className="text-xs text-slate-500">This action will permanently delete this report record from Firestore.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteIssue(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
