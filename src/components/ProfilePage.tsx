/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useCivic } from "../context/CivicContext";
import { getBadgeDetails } from "./UserBadge";
import { Star, Award, Shield, Trophy, Flame, CheckCircle, Clock, MapPin, Calendar, Heart, ShieldCheck, Bookmark, LogOut, ArrowUp, PlusCircle, Activity } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Issue } from "../types";

export const ProfilePage: React.FC = () => {
  const { user, profile, issues, logOut } = useCivic();
  const [activeTab, setActiveTab] = useState<"overview" | "reports" | "bookmarks" | "history">("overview");
  const [bookmarkedIssues, setBookmarkedIssues] = useState<Issue[]>([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);

  useEffect(() => {
    if (!user || activeTab !== "bookmarks") return;
    
    const fetchBookmarks = async () => {
      setLoadingBookmarks(true);
      try {
        const bookmarksSnap = await getDocs(collection(db, "users", user.uid, "bookmarks"));
        const bookmarkedIds = new Set();
        bookmarksSnap.forEach(doc => bookmarkedIds.add(doc.id));
        
        const filtered = issues.filter(issue => bookmarkedIds.has(issue.id));
        setBookmarkedIssues(filtered);
      } catch (err) {
        console.error("Error fetching bookmarks:", err);
      } finally {
        setLoadingBookmarks(false);
      }
    };
    
    fetchBookmarks();
  }, [user, activeTab, issues]);

  if (!user || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldCheck className="h-16 w-16 text-blue-300 mb-4 stroke-1 animate-pulse" />
        <h3 className="text-xl font-black text-blue-900 dark:text-blue-100 uppercase tracking-wider">Authentication Required</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-2">
          Please sign in to view your civic profile, earned badges, and reputation progress.
        </p>
      </div>
    );
  }

  const points = profile.points || 0;
  
  // Calculate tier status
  let currentTier = "Newcomer";
  let nextTier = "Active Citizen";
  let nextTierPoints = 50;
  let prevTierPoints = 0;

  if (points >= 300) {
    currentTier = "Community Champion";
    nextTier = "Max Tier Reached! 🎉";
    nextTierPoints = 300;
    prevTierPoints = 300;
  } else if (points >= 150) {
    currentTier = "Civic Hero";
    nextTier = "Community Champion";
    nextTierPoints = 300;
    prevTierPoints = 150;
  } else if (points >= 50) {
    currentTier = "Active Citizen";
    nextTier = "Civic Hero";
    nextTierPoints = 150;
    prevTierPoints = 50;
  }

  const range = nextTierPoints - prevTierPoints;
  const progressPoints = points - prevTierPoints;
  const percentage = range > 0 ? Math.min(100, Math.max(0, (progressPoints / range) * 100)) : 100;
  const pointsToNext = Math.max(0, nextTierPoints - points);

  // Define tiers metadata
  const tiers = [
    {
      name: "Newcomer",
      req: "0+ Points",
      desc: "Welcome to the community! Take your first steps by reporting or verifying issues.",
      icon: Star,
      color: "text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950",
      activeColor: "text-slate-600 dark:text-slate-400 border-slate-300 bg-slate-50 dark:bg-slate-950",
      unlocked: points >= 0,
    },
    {
      name: "Active Citizen",
      req: "50+ Points",
      desc: "An active pillar of the community, consistently identifying and validating neighborhood reports.",
      icon: Award,
      color: "text-emerald-300 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 opacity-40",
      activeColor: "text-emerald-700 border-emerald-200 bg-emerald-50",
      unlocked: points >= 50,
    },
    {
      name: "Civic Hero",
      req: "150+ Points",
      desc: "A prominent civic hero dedicating real efforts to maintaining safety and infrastructure.",
      icon: Shield,
      color: "text-indigo-300 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 opacity-40",
      activeColor: "text-indigo-700 border-indigo-200 bg-indigo-50",
      unlocked: points >= 150,
    },
    {
      name: "Community Champion",
      req: "300+ Points",
      desc: "The ultimate civic milestone. Inspires others and leads community reporting initiatives.",
      icon: Trophy,
      color: "text-amber-300 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 opacity-40",
      activeColor: "text-amber-700 border-amber-200 bg-amber-50 shadow-md shadow-amber-100/50",
      unlocked: points >= 300,
    },
  ];

  // User stats
  const userIssues = issues.filter((i) => i.reporterId === user.uid);
  const reportedCount = userIssues.length;
  const resolvedCount = userIssues.filter((i) => i.status === "resolved").length;
  const inProgressCount = userIssues.filter((i) => i.status === "in-progress").length;

  // Helper to format Date/Timestamp
  const formatActivityDate = (timestamp: any) => {
    if (!timestamp) return "Just now";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
      }) + " at " + date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return "Date unknown";
    }
  };

  const getTimelineActivities = () => {
    const list: {
      id: string;
      type: "created" | "upvoted";
      issue: Issue;
      timestamp: any;
    }[] = [];

    // 1. Created Issues
    userIssues.forEach(issue => {
      list.push({
        id: `created-${issue.id}`,
        type: "created",
        issue,
        timestamp: issue.createdAt
      });
    });

    // 2. Upvoted Issues
    const upvotedIds = new Set<string>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        if (key.startsWith(`upvoted_${user.uid}_`)) {
          const id = key.replace(`upvoted_${user.uid}_`, "");
          upvotedIds.add(id);
        } else if (key.startsWith("civic_upvoted_")) {
          const id = key.replace("civic_upvoted_", "");
          upvotedIds.add(id);
        }
      }
    }

    issues.forEach(issue => {
      // Show as upvoted if in localstorage and NOT reported by the current user
      if (upvotedIds.has(issue.id) && issue.reporterId !== user.uid) {
        list.push({
          id: `upvoted-${issue.id}`,
          type: "upvoted",
          issue,
          timestamp: issue.createdAt
        });
      }
    });

    // Sort chronologically (newest first)
    return list.sort((a, b) => {
      const timeA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.timestamp).getTime();
      const timeB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.timestamp).getTime();
      return (timeB || 0) - (timeA || 0);
    });
  };

  return (
    <div className="space-y-10" id="profile-page-root">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-md">
        <div className="flex items-center space-x-5">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={profile.name}
              className="h-20 w-20 rounded-3xl border-4 border-blue-50 object-cover shadow-inner"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-20 w-20 rounded-3xl bg-blue-600 text-white flex items-center justify-center font-black text-3xl shadow-md">
              {profile.name.charAt(0)}
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-black text-blue-900 dark:text-blue-100">{profile.name}</h2>
              <span className="sticker-badge sticker-badge-yellow">
                {currentTier}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
              Email: {user.email}
            </p>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-wider">
              Account Status: {profile.isAdmin ? "Administrator / Moderator" : "Verified Citizen"}
            </p>
          </div>
        </div>

        {/* Actions & Stats */}
        <div className="flex items-center gap-4">
          {/* Total Points Card */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50/30 border border-green-100 rounded-[24px] p-5 flex flex-col items-center justify-center min-w-[140px] text-center shadow-sm">
            <Award className="h-8 w-8 text-green-600 mb-1" />
            <span className="text-2xl font-black text-green-700">{points}</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-green-600">Total Points</span>
          </div>
          
          {/* Sign Out (Mobile Only, or both) */}
          <button 
            onClick={async () => {
              await logOut();
            }}
            className="lg:hidden flex flex-col items-center justify-center space-y-1 p-5 rounded-[24px] bg-red-50 text-red-600 border border-red-100 min-w-[100px] hover:bg-red-100 transition-colors"
          >
            <LogOut className="h-6 w-6" />
            <span className="text-[10px] font-black uppercase tracking-wider">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-700 pb-px overflow-x-auto">
        {[
          { id: "overview", label: "Overview & Badges", icon: Trophy },
          { id: "reports", label: "My Reports", icon: Flame },
          { id: "history", label: "Activity History", icon: Activity },
          { id: "bookmarks", label: "Bookmarked", icon: Bookmark }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-6 py-3 border-b-2 font-bold text-sm transition-all focus:outline-none whitespace-nowrap ${
              activeTab === tab.id 
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-950 rounded-t-xl"
            }`}
          >
            <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? "text-blue-600" : "text-slate-400 dark:text-slate-500"}`} />
            <span className="uppercase tracking-wider">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-10">
          {/* Progress towards Next Badge Tier */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-md space-y-6" id="profile-progress-tier-card">
        <div>
          <h3 className="text-lg font-black text-blue-900 dark:text-blue-100 uppercase tracking-wider">Next Badge Progress</h3>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Keep reporting and verifying issues to reach your next milestone.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Current Tier</span>
              <span className="font-extrabold text-blue-950 dark:text-blue-50 text-sm">{currentTier}</span>
            </div>
            {points < 300 ? (
              <div className="text-right space-y-1">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Next Milestone</span>
                <span className="font-extrabold text-indigo-600 text-sm">
                  {nextTier} ({pointsToNext} pts left)
                </span>
              </div>
            ) : (
              <span className="sticker-badge sticker-badge-green">
                Ultimate Tier Unlocked!
              </span>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-4 overflow-hidden border border-slate-200 dark:border-slate-700/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full"
            />
          </div>

          <div className="flex justify-between text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            <span>{prevTierPoints} PTS</span>
            <span>{points} PTS (Current)</span>
            <span>{points < 300 ? `${nextTierPoints} PTS` : "Max"}</span>
          </div>
        </div>
      </div>

      {/* Badge Tiers Roadmap */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-md space-y-6" id="profile-badges-roadmap">
        <div>
          <h3 className="text-lg font-black text-blue-900 dark:text-blue-100 uppercase tracking-wider">Reputation Milestones</h3>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Unlock higher rank badges as you perform civic activities.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiers.map((tier) => {
            const TierIcon = tier.icon;
            const style = tier.unlocked ? tier.activeColor : tier.color;

            return (
              <div
                key={tier.name}
                className={`p-5 rounded-2xl border flex flex-col h-full transition-all duration-300 relative ${
                  tier.unlocked ? "shadow-sm border-slate-200 dark:border-slate-700" : "border-dashed border-slate-200 dark:border-slate-700"
                } ${style}`}
                id={`roadmap-tier-${tier.name.toLowerCase().replace(" ", "-")}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2.5 rounded-xl border ${tier.unlocked ? "bg-white dark:bg-slate-900" : "bg-slate-100 dark:bg-slate-800"}`}>
                    <TierIcon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-800">
                    {tier.req}
                  </span>
                </div>

                <div className="flex-1 space-y-1.5">
                  <h4 className="text-sm font-black text-blue-950 dark:text-blue-50 flex items-center space-x-1.5">
                    <span>{tier.name}</span>
                    {tier.unlocked && (
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                    )}
                  </h4>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                    {tier.desc}
                  </p>
                </div>

                {tier.unlocked ? (
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100/50 px-2 py-1 rounded-md border border-emerald-200 w-fit mt-4">
                    ✓ Earned Badge
                  </span>
                ) : (
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/50 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700/50 w-fit mt-4">
                    🔒 Locked
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-md flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-2xl font-black text-blue-950 dark:text-blue-50">{reportedCount}</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Issues Reported</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-md flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-2xl font-black text-blue-950 dark:text-blue-50">{inProgressCount}</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">In Progress</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-md flex items-center space-x-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-2xl font-black text-blue-950 dark:text-blue-50">{resolvedCount}</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Resolved Issues</span>
          </div>
        </div>
      </div>
      </div>
      )}

      {activeTab === "reports" && (
        <>
          {/* User's Reported Issues */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-md space-y-6" id="profile-user-issues">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-blue-900 dark:text-blue-100 uppercase tracking-wider">Your Reported Issues</h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  A list of issues you reported to municipal services.
                </p>
              </div>
              <span className="text-xs font-black uppercase tracking-wider bg-blue-50 text-blue-800 px-3 py-1.5 rounded-full border border-blue-100">
                Total: {reportedCount}
              </span>
            </div>

            {userIssues.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userIssues.map((issue) => (
                  <div 
                    key={issue.id}
                    className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start space-x-4 hover:shadow-sm transition-all"
                    id={`user-issue-row-${issue.id}`}
                  >
                    {issue.imageUrl && (
                      <img
                        src={issue.imageUrl}
                        alt={issue.title}
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className={`sticker-badge mb-1.5 ${
                        issue.status === "resolved" 
                          ? "sticker-badge-green" 
                          : issue.status === "in-progress" 
                          ? "sticker-badge-yellow"
                          : issue.status === "verified"
                          ? "sticker-badge-orange"
                          : "sticker-badge-blue"
                      }`}>
                        <span>{issue.status}</span>
                      </span>
                      <h4 className="text-sm font-black text-blue-950 dark:text-blue-50 truncate">{issue.title}</h4>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-bold uppercase tracking-wider">
                        <MapPin className="h-3 w-3 text-slate-300" />
                        <span>{issue.category}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">You haven't reported any issues yet.</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "history" && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-md space-y-8" id="profile-activity-history">
          <div>
            <h3 className="text-lg font-black text-blue-900 dark:text-blue-100 uppercase tracking-wider">Activity History</h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              A chronological timeline of your civic contributions: reports created and community issues upvoted.
            </p>
          </div>

          {getTimelineActivities().length > 0 ? (
            <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-4 pl-8 space-y-10 py-2">
              {getTimelineActivities().map((activity) => {
                const issue = activity.issue;
                const isCreated = activity.type === "created";
                
                return (
                  <div key={activity.id} className="relative" id={`activity-timeline-item-${activity.id}`}>
                    {/* Timeline Node (Dot / Icon) */}
                    <div className={`absolute -left-[49px] top-0 flex h-10 w-10 items-center justify-center rounded-2xl border-2 shadow-sm transition-transform duration-200 hover:scale-105 ${
                      isCreated 
                        ? "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950 dark:border-blue-800" 
                        : "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950 dark:border-emerald-800"
                    }`}>
                      {isCreated ? (
                        <PlusCircle className="h-5 w-5" />
                      ) : (
                        <ArrowUp className="h-5 w-5" />
                      )}
                    </div>

                    {/* Timeline Content Card */}
                    <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100/80 dark:border-slate-800/80 hover:shadow-md transition-all duration-300">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                            isCreated
                              ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300"
                              : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300"
                          }`}>
                            {isCreated ? "Report Created" : "Report Upvoted"}
                          </span>
                          
                          {/* Progress Status Badge */}
                          <span className={`sticker-badge ${
                            issue.status === "resolved" 
                              ? "sticker-badge-green" 
                              : issue.status === "in-progress" 
                              ? "sticker-badge-yellow"
                              : issue.status === "verified"
                              ? "sticker-badge-orange"
                              : "sticker-badge-blue"
                          }`}>
                            <span>{issue.status}</span>
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-1.5 text-xs text-slate-400 dark:text-slate-500 font-semibold">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatActivityDate(activity.timestamp)}</span>
                        </div>
                      </div>

                      <div className="flex items-start space-x-4">
                        {issue.imageUrl && (
                          <img
                            src={issue.imageUrl}
                            alt={issue.title}
                            className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-slate-100 dark:border-slate-800"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-black text-blue-950 dark:text-blue-50 hover:text-blue-600 transition-colors">
                            {issue.title}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {issue.description}
                          </p>
                          <div className="flex items-center space-x-3 mt-2.5">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span>{issue.category}</span>
                            </span>
                            <span className="text-slate-200 dark:text-slate-800">•</span>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                              {issue.upvoteCount} Upvotes
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-700 rounded-[24px]">
              <Activity className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">No activity recorded yet.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Start by reporting neighborhood issues or upvoting existing ones!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "bookmarks" && (
        <>
          {/* Bookmarked Issues */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-md space-y-6" id="profile-bookmarked-issues">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-blue-900 dark:text-blue-100 uppercase tracking-wider">Bookmarked Issues</h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Issues you have saved to keep track of.
                </p>
              </div>
              <span className="text-xs font-black uppercase tracking-wider bg-blue-50 text-blue-800 px-3 py-1.5 rounded-full border border-blue-100">
                Total: {bookmarkedIssues.length}
              </span>
            </div>

            {loadingBookmarks ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : bookmarkedIssues.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bookmarkedIssues.map((issue) => (
                  <div 
                    key={issue.id}
                    className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start space-x-4 hover:shadow-sm transition-all"
                  >
                    {issue.imageUrl && (
                      <img
                        src={issue.imageUrl}
                        alt={issue.title}
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className={`sticker-badge mb-1.5 ${
                        issue.status === "resolved" 
                          ? "sticker-badge-green" 
                          : issue.status === "in-progress" 
                          ? "sticker-badge-yellow"
                          : issue.status === "verified"
                          ? "sticker-badge-orange"
                          : "sticker-badge-blue"
                      }`}>
                        <span>{issue.status}</span>
                      </span>
                      <h4 className="text-sm font-black text-blue-950 dark:text-blue-50 truncate">{issue.title}</h4>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-bold uppercase tracking-wider">
                        <MapPin className="h-3 w-3 text-slate-300" />
                        <span>{issue.category}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">No bookmarked issues found.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
