/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Star, Award, Shield, Trophy } from "lucide-react";

export const getBadgeDetails = (points: number) => {
  if (points >= 300) {
    return {
      Icon: Trophy,
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-200",
      tier: "Community Champion"
    };
  }
  if (points >= 150) {
    return {
      Icon: Shield,
      color: "text-indigo-600",
      bg: "bg-indigo-50 border-indigo-200",
      tier: "Civic Hero"
    };
  }
  if (points >= 50) {
    return {
      Icon: Award,
      color: "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-200",
      tier: "Active Citizen"
    };
  }
  return {
    Icon: Star,
    color: "text-slate-400 dark:text-slate-500",
    bg: "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700",
    tier: "Newcomer"
  };
};

interface UserBadgeProps {
  points: number;
  showText?: boolean;
}

export const UserBadge: React.FC<UserBadgeProps> = ({ points, showText = false }) => {
  const { Icon, color, bg, tier } = getBadgeDetails(points);

  return (
    <span 
      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${bg} ${color} align-middle ml-1`}
      title={`${tier} (${points} pts)`}
    >
      <Icon className="h-3 w-3 flex-shrink-0" />
      <span>{showText ? tier : points}</span>
    </span>
  );
};
