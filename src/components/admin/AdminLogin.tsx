/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useCivic } from "../../context/CivicContext";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";

import {
  ShieldCheck,
  Sparkles,
  AlertCircle,
  ArrowLeft,
  Loader2,
} from "lucide-react";

import { motion } from "motion/react";

interface AdminLoginProps {
  onLoginSuccess: () =>void;
  onBackToCitizen: () =>void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onBackToCitizen,
}) => {

  const {
    signInDemo,
    authError,
    setAuthError,
  } = useCivic();

  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleAdminLogin = async () => {

    setLoading(true);
    setAuthError(null);

    try {

      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = credential.user;

      if (user.email !== "tanmay.sa.thorat@gmail.com") {

        await auth.signOut();

        setAuthError(
          "Access denied. Only the authorised administrator can access this portal."
        );

        return;
      }

      onLoginSuccess();

    } catch (error) {

      console.error(error);

      setAuthError("Invalid email or password.");

    } finally {

      setLoading(false);

    }

  };

  const handleDemoAdminLogin = async () => {

    setLoading(true);
    setAuthError(null);

    try {

      await signInDemo("admin");

      setTimeout(() => {
        setLoading(false);
        onLoginSuccess();
      }, 500);

    } catch {

      setLoading(false);
      setAuthError("Demo login failed.");

    }

  };

  return (

    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-8"
      >

        <div className="text-center">

          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white">

            <ShieldCheck size={34} />

          </div>

          <h1 className="text-3xl font-black mt-4">

            Admin Portal Sign-In

          </h1>

          <p className="text-sm text-slate-500 mt-2">

            Protected authentication gateway for administrators.

          </p>

        </div>

        {authError && (

          <div className="bg-red-100 border border-red-300 rounded-xl p-3 flex gap-2">

            <AlertCircle className="text-red-600 mt-1" />

            <div>

              <b>Authentication Error</b>

              <p>{authError}</p>

            </div>

          </div>

        )}

        {/* Email */}

        <input
          type="email"
          placeholder="Admin Email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          className="w-full rounded-xl border px-4 py-3 dark:bg-slate-800"
        />

        {/* Password */}

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          className="w-full rounded-xl border px-4 py-3 dark:bg-slate-800"
        />

        {/* Login */}

        <button
          onClick={handleAdminLogin}
          disabled={loading}
          className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-white py-4 font-bold"
        >

          {loading ? (

            <Loader2 className="animate-spin mx-auto" />

          ) : (

            "Admin Login"

          )}

        </button>

        <div className="relative">

          <div className="border-t"></div>

          <div className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white dark:bg-slate-900 px-3 text-xs">

            OR

          </div>

        </div>

        {/* Demo */}

        <button
          onClick={handleDemoAdminLogin}
          className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-4 text-white font-bold flex justify-center items-center gap-2"
        >

          <Sparkles size={18} />

          Launch Demo Admin Portal

        </button>

        <div className="text-center pt-4 border-t">

          <button
            onClick={onBackToCitizen}
            className="flex items-center justify-center gap-2 mx-auto text-sm"
          >

            <ArrowLeft size={16} />

            Back to Public Citizen Site

          </button>

        </div>

      </motion.div>

    </div>

  );

};