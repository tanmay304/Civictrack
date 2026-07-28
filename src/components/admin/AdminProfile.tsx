/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useCivic } from "../../context/CivicContext";
import { User, Mail, ShieldAlert, KeyRound, Sun, Moon, Save, CheckCircle2, Camera } from "lucide-react";

export const AdminProfile: React.FC = () => {
  const { profile, user, updateUserProfileData } = useCivic();

  const [name, setName] = useState(profile?.name || "Administrator");
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || "");
  const [saved, setSaved] = useState(false);

  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    await updateUserProfileData(profile.uid, {
      name,
      photoURL: photoURL || undefined
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-black text-slate-900 dark:text-white tracking-tight">
          Admin Profile & Preferences
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage your administrative credentials, photo, notification preferences, and interface dark/light mode.
        </p>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center space-x-2 border border-emerald-200">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>Profile updated successfully!</span>
        </div>
      )}

      {/* Main Profile Box */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            {photoURL ? (
              <img
                src={photoURL}
                alt={name}
                className="w-20 h-20 rounded-3xl object-cover border-2 border-blue-600 shadow-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-3xl bg-blue-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-black text-[10px] uppercase rounded-full tracking-wider border border-purple-200 dark:border-purple-800">
                {profile?.role || "Admin"} Privileges
              </span>
            </div>
            <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white mt-1">
              {profile?.name}
            </h2>
            <p className="text-xs text-slate-500">{profile?.email || user?.email || "Super Admin Account"}</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs pt-4 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Profile Image URL</label>
            <input
              type="url"
              placeholder="https://..."
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Theme Preference</p>
              <p className="text-[11px] text-slate-500">Toggle between Dark Mode and Light Mode</p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600 flex items-center space-x-2 cursor-pointer font-bold"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
              <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
            </button>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/20 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Admin Profile</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
