/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ShieldAlert, ArrowLeft, Lock } from "lucide-react";

interface ForbiddenPageProps {
  onBackToDashboard: () => void;
}

export const ForbiddenPage: React.FC<ForbiddenPageProps> = ({ onBackToDashboard }) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center space-y-6 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-950 text-red-600 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
          <Lock className="w-10 h-10 animate-bounce" />
        </div>
        <div className="space-y-2">
          <span className="sticker-badge sticker-badge-red text-xs uppercase tracking-widest font-black">
            Error 403 • Access Denied
          </span>
          <h1 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight">
            Restricted Area
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            You do not have administrative privileges to access the CivicTrack Enterprise Admin Panel. Please return to the public citizen dashboard.
          </p>
        </div>
        <button
          onClick={onBackToDashboard}
          className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm tracking-wide shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center space-x-2 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Citizen Dashboard</span>
        </button>
      </div>
    </div>
  );
};
