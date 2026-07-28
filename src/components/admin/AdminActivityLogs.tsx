/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { useCivic } from "../../context/CivicContext";
import { History, Search, ShieldAlert, FileText, UserCheck, Trash2, Key, Download } from "lucide-react";
import { exportToCSV } from "../../services/exportService";

export const AdminActivityLogs: React.FC = () => {
  const { activityLogs } = useCivic();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLogs = useMemo(() => {
    return activityLogs.filter(log => {
      const q = searchTerm.toLowerCase();
      return (
        log.action.toLowerCase().includes(q) ||
        log.adminName.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q)
      );
    });
  }, [activityLogs, searchTerm]);

  const handleExportCSV = () => {
    const formatted = filteredLogs.map(l => ({
      "Log ID": l.id,
      "Action": l.action,
      "Admin Name": l.adminName,
      "Role": l.adminRole,
      "Details": l.details,
      "Timestamp": l.timestamp?.seconds ? new Date(l.timestamp.seconds * 1000).toLocaleString() : "N/A"
    }));
    exportToCSV(formatted, "civictrack_audit_logs");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-slate-900 dark:text-white tracking-tight">
            Administrative Audit Trail
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Immutable system activity ledger recording admin logins, issue approvals, role mutations, and deletion events.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-sm hover:bg-slate-50 flex items-center space-x-2 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4 text-blue-600" />
          <span>Export Audit Log CSV</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search activity logs by action, admin name, or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-4">Action</th>
                <th className="py-4 px-4">Actor</th>
                <th className="py-4 px-4">Role</th>
                <th className="py-4 px-4">Audit Details</th>
                <th className="py-4 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {log.adminName}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {log.adminRole}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {log.details}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px] font-mono">
                      {log.timestamp?.seconds 
                        ? new Date(log.timestamp.seconds * 1000).toLocaleString()
                        : "Just now"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    No activity logs recorded matching search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
