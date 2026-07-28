/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { SearchX, ArrowLeft } from "lucide-react";

interface NotFoundPageProps {
  onBack: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center space-y-6 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-3xl mx-auto flex items-center justify-center">
          <SearchX className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <span className="sticker-badge sticker-badge-amber text-xs uppercase tracking-widest font-black">
            Error 404 • Not Found
          </span>
          <h1 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight">
            Page Not Found
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            The requested admin section or resource could not be found. It may have been moved or removed.
          </p>
        </div>
        <button
          onClick={onBack}
          className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm tracking-wide shadow-lg flex items-center justify-center space-x-2 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
      </div>
    </div>
  );
};
