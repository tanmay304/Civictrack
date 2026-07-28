/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { useCivic } from "../context/CivicContext";
import { Award, Star, Compass, Shield, ShieldCheck, Flame } from "lucide-react";
import { motion } from "motion/react";

export const ProfilePanel: React.FC = () => {
  const { user, profile } = useCivic();

  if (!user || !profile) return null;

  // Level logic aligned with the new badge tiers
  const points = profile.points || 0;
  let level = 1;
  let levelName = "Newcomer";
  let nextLevelPoints = 50;
  let prevLevelPoints = 0;
  let Icon = Star;

  if (points >= 300) {
    level = 4;
    levelName = "Community Champion";
    nextLevelPoints = 300;
    prevLevelPoints = 300;
    Icon = ShieldCheck;
  } else if (points >= 150) {
    level = 3;
    levelName = "Civic Hero";
    nextLevelPoints = 300;
    prevLevelPoints = 150;
    Icon = Shield;
  } else if (points >= 50) {
    level = 2;
    levelName = "Active Citizen";
    nextLevelPoints = 150;
    prevLevelPoints = 50;
    Icon = Award;
  }

  const range = nextLevelPoints - prevLevelPoints;
  const currentProgress = points - prevLevelPoints;
  const percentage = range > 0 ? Math.min(100, Math.max(0, (currentProgress / range) * 100)) : 100;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-md p-6" id="profile-panel">
      <div className="flex items-center space-x-4 mb-5">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-sans font-black text-blue-900 dark:text-blue-100 text-lg leading-tight">
            {profile.name}
          </h3>
          <p className="text-[10px] font-black text-green-600 uppercase tracking-wider mt-0.5">
            Level {level} • {levelName}
          </p>
        </div>
      </div>

      {/* Progress towards next level */}
      <div className="space-y-2.5 mb-6" id="profile-progress-container">
        <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <span>{points} Total Points</span>
          {points < 300 ? (
            <span>Next Level: {nextLevelPoints} pts</span>
          ) : (
            <span>Max Level Reached! 🎉</span>
          )}
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="bg-blue-600 h-full rounded-full"
            id="profile-progress-bar"
          />
        </div>
      </div>

      {/* Badges Earned */}
      <div>
        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
          <Award className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          <span>Earned Badges ({profile.badges?.length || 0})</span>
        </h4>
        <div className="flex flex-wrap gap-2" id="profile-badges-list">
          {profile.badges && profile.badges.length > 0 ? (
            profile.badges.map((badge, idx) => {
              // Custom themes for badges matching the brand palette
              let bg = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider rounded-full";
              let badgeIcon = Star;

              if (badge === "Newcomer") {
                bg = "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider rounded-full";
                badgeIcon = Star;
              } else if (badge === "Active Citizen") {
                bg = "bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-black uppercase tracking-wider rounded-full";
                badgeIcon = Award;
              } else if (badge === "Civic Hero") {
                bg = "bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px] font-black uppercase tracking-wider rounded-full";
                badgeIcon = Shield;
              } else if (badge === "Community Champion") {
                bg = "bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-black uppercase tracking-wider rounded-full shadow-sm";
                badgeIcon = ShieldCheck;
              }

              const BadgeIcon = badgeIcon;

              return (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.05 }}
                  className={`flex items-center space-x-1 px-3 py-1.5 border ${bg}`}
                  id={`badge-item-${idx}`}
                >
                  <BadgeIcon className="h-3.5 w-3.5" />
                  <span>{badge}</span>
                </motion.div>
              );
            })
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">No badges earned yet. Report or verify issues to start earning!</p>
          )}
        </div>
      </div>
    </div>
  );
};
