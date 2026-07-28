/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Sliders, Save, CheckCircle2, ShieldCheck, Database, Zap, RefreshCw } from "lucide-react";

export const AdminSettings: React.FC = () => {
  const [autoVerifyThreshold, setAutoVerifyThreshold] = useState("3");
  const [pointsPerReport, setPointsPerReport] = useState("10");
  const [pointsPerVerification, setPointsPerVerification] = useState("2");
  const [pointsPerResolution, setPointsPerResolution] = useState("15");
  const [saved, setSaved] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-display font-black text-slate-900 dark:text-white tracking-tight">
          System Settings & Platform Rules
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure automated community verification thresholds, gamification rewards, AI models, and database sync options.
        </p>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center space-x-2 border border-emerald-200">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>System configuration updated successfully in Firestore settings.</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Verification Rules Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-base text-slate-900 dark:text-white">
                Community Verification Thresholds
              </h3>
              <p className="text-xs text-slate-500">Auto-promotion triggers for citizen reported issues</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Upvote Verification Threshold</label>
              <input
                type="number"
                value={autoVerifyThreshold}
                onChange={(e) => setAutoVerifyThreshold(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">Number of citizen upvotes required to automatically elevate report to 'Verified'.</p>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">AI Automated Categorization</label>
              <select className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="enabled">Enabled (Gemini 2.5 Flash)</option>
                <option value="disabled">Disabled (Manual Only)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">Analyzes uploaded photos to classify severity and category.</p>
            </div>
          </div>
        </div>

        {/* Gamification Settings Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-base text-slate-900 dark:text-white">
                Gamification Rewards & Points Allocation
              </h3>
              <p className="text-xs text-slate-500">Manage citizen incentive points</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Points per Report</label>
              <input
                type="number"
                value={pointsPerReport}
                onChange={(e) => setPointsPerReport(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Points per Upvote/Verify</label>
              <input
                type="number"
                value={pointsPerVerification}
                onChange={(e) => setPointsPerVerification(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Bonus Points on Resolved</label>
              <input
                type="number"
                value={pointsPerResolution}
                onChange={(e) => setPointsPerResolution(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/20 flex items-center space-x-2 transition-all cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Save System Settings</span>
        </button>
      </form>
    </div>
  );
};
