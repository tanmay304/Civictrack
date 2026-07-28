/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useCivic } from "../../context/CivicContext";
import { ShieldCheck, LogIn, Sparkles, Key, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "motion/react";

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBackToCitizen: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBackToCitizen }) => {
  const { signIn, signInDemo, user, profile, authError, setAuthError } = useCivic();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await signIn();
      // If user logs in with admin rights, redirect to portal
      onLoginSuccess();
    } catch (err: any) {
      console.error("Admin sign-in error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAdminLogin = () => {
    setLoading(true);
    signInDemo("admin");
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess();
    }, 400);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden"
      >
        {/* Background glow decorator */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/30">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <div>
            <span className="sticker-badge sticker-badge-blue text-[10px] uppercase font-black tracking-widest">
              Enterprise Control Center
            </span>
            <h1 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight mt-2">
              Admin Portal Sign-In
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Protected authentication gateway for authorized municipal administrators & moderators.
            </p>
          </div>
        </div>

        {authError && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl flex items-start space-x-3 text-red-600 dark:text-red-400 text-xs font-medium">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Authentication Error</p>
              <p className="mt-0.5">{authError}</p>
            </div>
          </div>
        )}

        <div className="space-y-4 pt-2">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border-2 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold text-sm shadow-sm flex items-center justify-center space-x-3 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Sign in with Google Admin</span>
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-bold tracking-widest">
                Or Quick Access
              </span>
            </div>
          </div>

          <button
            onClick={handleDemoAdminLogin}
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>Launch Instant Demo Admin Portal</span>
          </button>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <button
            onClick={onBackToCitizen}
            className="inline-flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Public Citizen Site</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
