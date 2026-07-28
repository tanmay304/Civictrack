/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Issue } from "../types";
import { useCivic } from "../context/CivicContext";
import { UserBadge } from "./UserBadge";
import { 
  ThumbsUp, 
  MapPin, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  PlayCircle,
  Tag,
  Hammer,
  Lightbulb,
  Droplets,
  Trash2,
  Paintbrush,
  HelpCircle,
  Video,
  X,
  Sparkles,
  ShieldCheck,
  Loader2,
  ChevronRight,
  Share2,
  MessageSquare,
  Bookmark,
  Send
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, onSnapshot, doc, addDoc, serverTimestamp, query, orderBy, deleteDoc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

interface IssueCardProps {
  issue: Issue;
}

export const IssueCard: React.FC<IssueCardProps> = ({ issue }) => {
  const { user, profile, upvote, changeStatus, verifyIssue } = useCivic();
  const [upvoting, setUpvoting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Local state for single-document real-time sync when modal is open
  const [liveIssue, setLiveIssue] = useState<Issue>(issue);

  // Reporter Profile State
  const [reporterProfile, setReporterProfile] = useState<any>(null);

  useEffect(() => {
    if (!issue.reporterId) return;
    const unsubscribe = onSnapshot(doc(db, "users", issue.reporterId), (snapshot) => {
      if (snapshot.exists()) {
        setReporterProfile(snapshot.data());
      }
    });
    return () => unsubscribe();
  }, [issue.reporterId]);

  useEffect(() => {
    setLiveIssue(issue);
  }, [issue]);

  // Document level onSnapshot real-time listener for the opened issue
  useEffect(() => {
    if (!isDetailOpen) return;

    const unsubscribe = onSnapshot(
      doc(db, "issues", issue.id),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setLiveIssue({
            id: docSnap.id,
            title: data.title || "",
            description: data.description || "",
            category: data.category || "",
            severity: data.severity || 1,
            status: data.status || "reported",
            lat: data.lat || 0,
            lng: data.lng || 0,
            imageUrl: data.imageUrl || "",
            videoUrl: data.videoUrl,
            reporterId: data.reporterId || "",
            reporterName: data.reporterName || "",
            createdAt: data.createdAt,
            upvoteCount: data.upvoteCount || 0,
            aiCategory: data.aiCategory,
            aiSeverity: data.aiSeverity,
            aiDescription: data.aiDescription,
            statusHistory: data.statusHistory || [],
          });
        }
      },
      (error) => {
        console.error("Error listening to single issue document:", error);
      }
    );

    return () => unsubscribe();
  }, [isDetailOpen, issue.id]);

  const isAdmin = profile?.isAdmin || profile?.role === "admin" || user?.email === "tanmay.sa.thorat@gmail.com";
  
  // Verification states
  const [verifications, setVerifications] = useState<any[]>([]);
  const [verifying, setVerifying] = useState(false);

  // Comments & Bookmark States
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  // Listen to total comment count (for card view)
  useEffect(() => {
    const q = query(collection(db, "issues", issue.id, "comments"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCommentCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [issue.id]);

  // Check Bookmark state
  useEffect(() => {
    if (!user) {
      setIsBookmarked(false);
      return;
    }
    const checkBookmark = async () => {
      try {
        const docRef = doc(db, "users", user.uid, "bookmarks", issue.id);
        const docSnap = await getDoc(docRef);
        setIsBookmarked(docSnap.exists());
      } catch (e) {
        // ignore
      }
    };
    checkBookmark();
  }, [user, issue.id]);

  const toggleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const docRef = doc(db, "users", user.uid, "bookmarks", issue.id);
      if (isBookmarked) {
        await deleteDoc(docRef);
        setIsBookmarked(false);
      } else {
        await setDoc(docRef, { savedAt: serverTimestamp() });
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error("Error bookmarking issue:", error);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}?issue=${issue.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `CivicTrack: ${issue.title}`,
          text: `Check out this issue in CivicTrack: ${issue.title}`,
          url: shareUrl,
        });
      } catch (err) {
        // user cancelled
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("Link copied to clipboard!");
    }
  };

  // Subscribe to comments
  useEffect(() => {
    if (!isDetailOpen) return;
    const q = query(collection(db, "issues", issue.id, "comments"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setComments(list);
    });
    return () => unsubscribe();
  }, [isDetailOpen, issue.id]);

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !commentText.trim()) return;
    
    setIsSubmittingComment(true);
    try {
      await addDoc(collection(db, "issues", issue.id, "comments"), {
        text: commentText.trim(),
        userId: user.uid,
        userName: profile.name,
        createdAt: serverTimestamp()
      });
      setCommentText("");
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Subscribe to verifications subcollection in real-time
  useEffect(() => {
    if (!isDetailOpen || !user) return;

    const unsubscribe = onSnapshot(
      collection(db, "issues", issue.id, "verifications"),
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data());
        });
        setVerifications(list);
      },
      (error) => {
        console.error("Error listening to verifications:", error);
      }
    );

    return () => unsubscribe();
  }, [isDetailOpen, issue.id, user]);

  const handleVerify = async () => {
    if (!user) return;
    setVerifying(true);
    await verifyIssue(issue.id);
    setVerifying(false);
  };

  const hasVerified = verifications.some((v) => v.userId === user?.uid);

  // Get matching category icon
  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("pothole") || cat.includes("road") || cat.includes("street")) {
      return <Hammer className="h-4 w-4" />;
    }
    if (cat.includes("light") || cat.includes("electricity") || cat.includes("power")) {
      return <Lightbulb className="h-4 w-4" />;
    }
    if (cat.includes("water") || cat.includes("leak") || cat.includes("drain")) {
      return <Droplets className="h-4 w-4" />;
    }
    if (cat.includes("trash") || cat.includes("litter") || cat.includes("waste")) {
      return <Trash2 className="h-4 w-4" />;
    }
    if (cat.includes("graffiti") || cat.includes("vandalism") || cat.includes("paint")) {
      return <Paintbrush className="h-4 w-4" />;
    }
    return <HelpCircle className="h-4 w-4" />;
  };

  // Status badging details
  const getStatusBadge = (status: Issue["status"]) => {
    switch (status) {
      case "reported":
        return {
          bg: "sticker-badge sticker-badge-blue",
          icon: <AlertTriangle className="h-3.5 w-3.5" />,
          label: "Reported"
        };
      case "verified":
        return {
          bg: "sticker-badge sticker-badge-orange",
          icon: <CheckCircle className="h-3.5 w-3.5" />,
          label: "Verified"
        };
      case "in-progress":
        return {
          bg: "sticker-badge sticker-badge-yellow",
          icon: <Clock className="h-3.5 w-3.5" />,
          label: "In Progress"
        };
      case "resolved":
        return {
          bg: "sticker-badge sticker-badge-green",
          icon: <CheckCircle className="h-3.5 w-3.5" />,
          label: "Resolved"
        };
    }
  };

  const badge = getStatusBadge(issue.status);

  // Dynamic left border accent based on status
  const getLeftBorderAccent = (status: Issue["status"]) => {
    switch (status) {
      case "resolved":
        return "border-l-4 border-l-green-500";
      case "in-progress":
        return "border-l-4 border-l-blue-500";
      case "verified":
        return "border-l-4 border-l-amber-500";
      default:
        return "border-l-4 border-l-slate-200";
    }
  };

  // Format date helper
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Just now";
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    }
    return new Date(timestamp).toLocaleDateString();
  };

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return "";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "";
    }
  };

  const getStatusTimestamp = (statusName: string, history: any[], fallbackTimestamp?: any) => {
    const entry = history?.find((h) => h.status === statusName);
    if (entry) return entry.timestamp;
    if (statusName === "reported") return fallbackTimestamp;
    return null;
  };

  const stages: { key: Issue["status"]; label: string; color: string; activeColor: string }[] = [
    { key: "reported", label: "Reported", color: "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800", activeColor: "border-blue-500 bg-blue-50 text-blue-700" },
    { key: "verified", label: "Verified", color: "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800", activeColor: "border-amber-500 bg-amber-50 text-amber-700" },
    { key: "in-progress", label: "In Progress", color: "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800", activeColor: "border-blue-500 bg-blue-50 text-blue-700" },
    { key: "resolved", label: "Resolved", color: "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800", activeColor: "border-green-500 bg-green-50 text-green-700" },
  ];

  const handleUpvote = async () => {
    if (!user) return;
    setUpvoting(true);
    await upvote(issue.id);
    setUpvoting(false);
  };

  const handleStatusUpdate = async (newStatus: Issue["status"]) => {
    setIsUpdatingStatus(true);
    await changeStatus(issue.id, newStatus);
    setIsUpdatingStatus(false);
  };

  const hasUpvotedSession = user ? localStorage.getItem(`upvoted_${user.uid}_${issue.id}`) : false;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col h-full ${getLeftBorderAccent(issue.status)}`}
      id={`issue-card-${issue.id}`}
    >
      {/* Image container */}
      <div 
        onClick={() => setIsDetailOpen(true)}
        className="relative aspect-video w-full bg-slate-50 dark:bg-slate-950 overflow-hidden cursor-pointer group"
      >
        {issue.imageUrl && (issue.imageUrl.includes("localhost") || issue.imageUrl.includes("127.0.0.1")) && (
          <div className="absolute top-3 left-3 bg-red-600 text-white px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-md z-30 border border-red-500 animate-pulse">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Local Image (Re-upload needed)</span>
          </div>
        )}

        {issue.videoUrl && (issue.videoUrl.includes("localhost") || issue.videoUrl.includes("127.0.0.1")) && (
          <div className="absolute top-12 left-3 bg-red-600 text-white px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-md z-30 border border-red-500 animate-pulse">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Local Video (Re-upload needed)</span>
          </div>
        )}

        {issue.imageUrl ? (
          <img
            src={issue.imageUrl}
            alt={issue.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 p-4">
            <AlertTriangle className="h-10 w-10 mb-2 stroke-1" />
            <span className="text-xs font-medium">No Image Provided</span>
          </div>
        )}

        {/* Video watermark overlay indicator if videoUrl exists */}
        {issue.videoUrl && (
          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full text-[9px] font-black text-white flex items-center space-x-1 uppercase tracking-wider shadow-sm z-10">
            <Video className="h-3.5 w-3.5 text-blue-400" />
            <span>Video Attached</span>
          </div>
        )}

        {/* Hover backdrop overlay */}
        <div className="absolute inset-0 bg-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="bg-white/95 dark:bg-slate-900/95 text-blue-900 dark:text-blue-100 text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-full shadow-md backdrop-blur-sm transition-transform duration-300 scale-95 group-hover:scale-100">
            View Details
          </span>
        </div>

        {/* Severity Ribbon */}
        <div className="absolute top-3 left-3 flex space-x-1 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-black text-white items-center uppercase tracking-wider">
          <span className="text-slate-200">Severity</span>
          <span className={`px-1.5 py-0.5 rounded-full font-black ${
            issue.severity >= 4 ? "bg-red-500" : issue.severity >= 3 ? "bg-amber-500" : "bg-emerald-500"
          }`}>
            {issue.severity}/5
          </span>
        </div>

        {/* Status Badge */}
        <div className={`absolute top-3 right-3 ${badge.bg}`}>
          {badge.icon}
          <span>{badge.label}</span>
        </div>
      </div>

      {/* Content wrapper */}
      <div className="p-6 flex-1 flex flex-col">
        {/* Category & Timestamp */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-3">
          {issue.category === "pending" ? (
            <div className="sticker-badge sticker-badge-orange animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Analyzing...</span>
            </div>
          ) : (
            <div className="sticker-badge sticker-badge-blue">
              {getCategoryIcon(issue.category)}
              <span>{issue.category}</span>
            </div>
          )}
          <div className="flex items-center space-x-1 font-bold text-[11px] text-slate-400 dark:text-slate-500">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(issue.createdAt)}</span>
          </div>
        </div>

        {/* Title */}
        <h3 
          onClick={() => setIsDetailOpen(true)}
          className="font-sans font-black text-blue-900 dark:text-blue-100 text-lg mb-1 leading-snug hover:text-blue-600 transition-colors cursor-pointer"
        >
          {issue.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed line-clamp-3 mb-4 flex-1">
          {issue.description}
        </p>

        {/* Reporter info & Geolocation */}
        <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px]">Reporter:</span>
            <span className="text-slate-900 dark:text-slate-50 font-extrabold flex items-center space-x-1">
              <span>{issue.reporterName}</span>
              {reporterProfile && <UserBadge points={reporterProfile.points} />}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
            <div className="flex items-center space-x-1 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[9px]">
              <MapPin className="h-3.5 w-3.5 text-blue-500" />
              <span>Location Telemetry:</span>
            </div>
            <span className="font-mono text-slate-600 dark:text-slate-400 font-bold bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-800 text-[11px]">
              {issue.lat.toFixed(5)}, {issue.lng.toFixed(5)}
            </span>
          </div>
        </div>

        {/* Actions section */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            {/* Upvote trigger */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              disabled={upvoting || !!hasUpvotedSession}
              onClick={handleUpvote}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                hasUpvotedSession
                  ? "bg-green-100 text-green-700 border-green-200"
                  : "bg-white dark:bg-slate-900 hover:bg-blue-50 text-blue-600 border-blue-100 shadow-sm"
              }`}
              id={`upvote-btn-${issue.id}`}
            >
              <ThumbsUp className={`h-3.5 w-3.5 ${hasUpvotedSession ? "fill-green-600 text-green-700" : ""}`} />
              <span>{issue.upvoteCount}</span>
            </motion.button>
            
            {/* Comment Count */}
            <button 
              onClick={() => setIsDetailOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:bg-slate-800 transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{commentCount}</span>
            </button>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Share */}
            <button 
              onClick={handleShare}
              className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Share Issue"
            >
              <Share2 className="h-4 w-4" />
            </button>

            {/* Bookmark */}
            <button 
              onClick={toggleBookmark}
              className={`p-2 rounded-xl transition-colors ${
                isBookmarked 
                  ? "text-blue-600 bg-blue-50" 
                  : "text-slate-400 dark:text-slate-500 hover:text-blue-600 hover:bg-blue-50"
              }`}
              title={isBookmarked ? "Remove Bookmark" : "Bookmark Issue"}
            >
              <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-blue-600" : ""}`} />
            </button>
          </div>
        </div>

          {/* Interactive State Control (For anyone signed-in or the reporter to advance status and experience full flow!) */}
          {user && (
            <div className="relative">
              <select
                disabled={isUpdatingStatus}
                value={issue.status}
                onChange={(e) => handleStatusUpdate(e.target.value as Issue["status"])}
                className="text-[11px] font-black uppercase tracking-wider bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer transition-all"
                id={`status-select-${issue.id}`}
              >
                <option value="reported">Reported</option>
                <option value="verified">Verified</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          )}
      </div>

      {/* Immersive Issue Detail Modal */}
      <AnimatePresence>
        {isDetailOpen && (() => {
          const liveBadge = getStatusBadge(liveIssue.status);
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
              onClick={() => setIsDetailOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl max-w-2xl w-full border border-slate-100 dark:border-slate-800 flex flex-col"
                id={`issue-detail-modal-${liveIssue.id}`}
              >
                {/* Header with Close */}
                <div className="bg-blue-900 text-white px-6 py-4 flex items-center justify-between border-b border-blue-800">
                  <div className="flex items-center space-x-2">
                    {liveIssue.category === "pending" ? (
                      <span className="sticker-badge sticker-badge-orange animate-pulse">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Analyzing...</span>
                      </span>
                    ) : (
                      <span className="sticker-badge sticker-badge-blue">
                        <span>{liveIssue.category}</span>
                      </span>
                    )}
                    <span className={`${liveBadge.bg}`}>
                      {liveBadge.icon}
                      <span>{liveBadge.label}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => setIsDetailOpen(false)}
                    className="p-1.5 bg-blue-800/50 hover:bg-blue-800 text-blue-100 hover:text-white rounded-full transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Modal Body / Scrollable */}
                <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                  <div>
                    <h2 className="text-2xl font-black text-blue-900 dark:text-blue-100 leading-snug">{liveIssue.title}</h2>
                    <div className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1 flex items-center space-x-2">
                      <span className="flex items-center space-x-1">
                        <span>Reported by {liveIssue.reporterName}</span>
                        {reporterProfile && <UserBadge points={reporterProfile.points} />}
                      </span>
                      <span>•</span>
                      <span>{formatDate(liveIssue.createdAt)}</span>
                    </div>
                  </div>

                  {/* Media Section: Photo & Optional Video */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Photo Component */}
                    <div className="space-y-2">
                      <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Primary Photo</span>
                      <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm aspect-video bg-slate-100 dark:bg-slate-800 relative">
                        {liveIssue.imageUrl && (liveIssue.imageUrl.includes("localhost") || liveIssue.imageUrl.includes("127.0.0.1")) && (
                          <div className="absolute top-2 left-2 bg-red-600 text-white px-2.5 py-1 rounded-xl text-[9px] font-bold flex items-center gap-1 z-20 shadow-md animate-pulse">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Local fallback URL (Re-upload needed)</span>
                          </div>
                        )}
                        <img
                          src={liveIssue.imageUrl}
                          alt={liveIssue.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>

                    {/* Optional Video Component */}
                    {liveIssue.videoUrl ? (
                      <div className="space-y-2" id="video-detail-container">
                        <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Supporting Video</span>
                        <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm aspect-video bg-black flex items-center justify-center relative">
                          {liveIssue.videoUrl && (liveIssue.videoUrl.includes("localhost") || liveIssue.videoUrl.includes("127.0.0.1")) && (
                            <div className="absolute top-2 left-2 bg-red-600 text-white px-2.5 py-1 rounded-xl text-[9px] font-bold flex items-center gap-1 z-20 shadow-md animate-pulse">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>Local fallback URL (Re-upload needed)</span>
                            </div>
                          )}
                          <video
                            src={liveIssue.videoUrl}
                            className="w-full h-full object-contain"
                            controls
                            playsInline
                            id="detail-video-player"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Supporting Video</span>
                        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center aspect-video">
                          <Video className="h-6 w-6 text-slate-300 mb-1" />
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">No Video Verification Attached</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-2 bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Description / Details</span>
                    <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-relaxed whitespace-pre-line">
                      {liveIssue.description}
                    </p>
                  </div>

                  {/* Gemini AI Verification details */}
                  {liveIssue.aiDescription && (
                    <div 
                      className="p-6 rounded-[24px] border-3 border-spark-yellow bg-gradient-to-br from-[#FFFCEB] via-white to-[#FFFCEB]/30 shadow-md flex flex-col space-y-3 relative overflow-hidden" 
                      id={`issue-ai-verification-${liveIssue.id}`}
                    >
                      {/* Decorative background light effect */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-spark-yellow/10 rounded-full blur-xl pointer-events-none" />

                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 bg-spark-yellow text-ink border-2 border-ink rounded-xl shadow-sm flex-shrink-0">
                          <Sparkles className="h-4 w-4 animate-pulse" />
                        </div>
                        <div>
                          <span className="block text-xs font-black uppercase tracking-wider text-ink">Gemini AI Smart Analysis</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Automatic categorisation & priority scoring</span>
                        </div>
                      </div>

                      <div className="bg-white/85 dark:bg-slate-900/85 border-2 border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm mt-1">
                        <p className="text-ink text-sm font-semibold italic leading-relaxed">
                          "{liveIssue.aiDescription}"
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1 text-xs font-black uppercase tracking-wider">
                        {liveIssue.aiCategory && (
                          <span className="sticker-badge sticker-badge-blue text-[9px] px-2.5 py-1">
                            Category: {liveIssue.aiCategory}
                          </span>
                        )}
                        {liveIssue.aiSeverity && (
                          <span className="sticker-badge sticker-badge-orange text-[9px] px-2.5 py-1">
                            Severity: Level {liveIssue.aiSeverity}/5
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* GPS and Metadata */}
                  <div className="grid grid-cols-2 gap-4 text-xs font-bold bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700">
                    <div className="space-y-1">
                      <span className="block text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-black">GPS Coordinates</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 text-sm block">
                        {liveIssue.lat.toFixed(6)}, {liveIssue.lng.toFixed(6)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-black">Severity Level</span>
                      <span className="text-slate-700 dark:text-slate-300 text-sm block flex items-center space-x-1.5">
                        <span className={`px-2 py-0.5 rounded font-black text-white text-xs ${
                          liveIssue.severity >= 4 ? "bg-red-500" : liveIssue.severity >= 3 ? "bg-amber-500" : "bg-emerald-500"
                        }`}>
                          {liveIssue.severity}/5
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Status Timeline Component */}
                  <div className="bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-700 rounded-3xl p-5 space-y-4" id={`timeline-${liveIssue.id}`}>
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-ink uppercase tracking-wider">Status Lifecycle Timeline</h4>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                        Real-time Tracked
                      </span>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 pb-1">
                      {stages.map((stage, idx) => {
                        const timestamp = getStatusTimestamp(stage.key, liveIssue.statusHistory || [], liveIssue.createdAt);
                        const isCompleted = !!timestamp;
                        
                        return (
                          <React.Fragment key={stage.key}>
                            {idx > 0 && (
                              <div className="hidden md:flex items-center text-slate-300">
                                <ChevronRight className="h-4 w-4" />
                              </div>
                            )}
                            <div className="flex-1 w-full md:w-auto" id={`timeline-step-${liveIssue.id}-${stage.key}`}>
                              <div className={`sticker-badge text-center flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                                isCompleted 
                                  ? "sticker-badge-green font-black" 
                                  : "border-slate-300 border-dashed text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 shadow-none hover:translate-y-0"
                              }`}>
                                <span className="text-xs uppercase tracking-wider block font-black">
                                  {stage.label}
                                </span>
                                {isCompleted && timestamp ? (
                                  <span className="text-[10px] font-mono font-bold mt-1 text-resolved-green opacity-90">
                                    {formatDateTime(timestamp)}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium mt-1 text-slate-400 dark:text-slate-500 italic">
                                    Upcoming
                                  </span>
                                )}
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* Community Verification Section */}
                  <div className="p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 space-y-3" id={`verification-section-${liveIssue.id}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-black text-ink uppercase tracking-wider">Community Verification</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Confirmed sightings of this issue by local residents.</p>
                      </div>
                      <span className="bg-blue-100 text-civic-blue text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full font-mono font-bold border border-blue-200 self-start sm:self-center" id={`verification-count-${liveIssue.id}`}>
                        {verifications.length} verified
                      </span>
                    </div>

                    {user && user.uid !== liveIssue.reporterId ? (
                      <div className="flex items-center space-x-3 pt-1">
                        <button
                          onClick={handleVerify}
                          disabled={verifying || hasVerified}
                          className={`w-full sm:w-auto px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition-all flex items-center justify-center space-x-2 shadow-sm ${
                            hasVerified
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-300 cursor-not-allowed"
                              : "bg-civic-blue hover:bg-blue-700 text-white border-ink hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                          }`}
                          id={`confirm-see-too-btn-${liveIssue.id}`}
                        >
                          <ShieldCheck className="h-4.5 w-4.5" />
                          <span>{hasVerified ? "You Verified This" : "Confirm — I see this too"}</span>
                        </button>
                      </div>
                    ) : user && user.uid === liveIssue.reporterId ? (
                      <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl inline-block" id={`reporter-warning-${liveIssue.id}`}>
                        You are the original reporter of this issue.
                      </p>
                    ) : !user ? (
                      <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl inline-block" id={`auth-warning-${liveIssue.id}`}>
                        Sign in to verify this issue.
                      </p>
                    ) : null}
                  </div>

                  {/* Discussion Thread / Comments */}
                  <div className="p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-4" id={`comments-section-${liveIssue.id}`}>
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      <h4 className="text-sm font-black text-ink uppercase tracking-wider">Community Discussion ({comments.length})</h4>
                    </div>
                    
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                      {comments.length === 0 ? (
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium italic text-center py-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">No comments yet. Start the conversation!</p>
                      ) : (
                        comments.map((comment) => (
                          <div key={comment.id} className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-bold text-xs text-slate-700 dark:text-slate-300">{comment.userName}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{formatDateTime(comment.createdAt)}</span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 break-words">{comment.text}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {user ? (
                      <form onSubmit={submitComment} className="flex items-center space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Add a comment..."
                          className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-civic-blue/50 focus:border-civic-blue transition-all"
                          disabled={isSubmittingComment}
                        />
                        <button
                          type="submit"
                          disabled={isSubmittingComment || !commentText.trim()}
                          className="p-2.5 bg-civic-blue hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </form>
                    ) : (
                      <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl text-center">
                        Sign in to join the discussion.
                      </p>
                    )}
                  </div>

                  {/* Admin-Only Moderator Control View */}
                  {isAdmin && (
                    <div className="p-5 rounded-2xl border border-red-100 bg-red-50/30 space-y-3" id={`admin-panel-${liveIssue.id}`}>
                      <div className="flex items-center space-x-2 text-red-800">
                        <ShieldCheck className="h-4 w-4" />
                        <h4 className="text-sm font-black uppercase tracking-wider">Admin Moderator Panel</h4>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-normal">
                        As an administrator, you have permission to override and manually transition this report's operational state:
                      </p>
                      
                      <div className="flex flex-wrap gap-2 pt-1">
                        {stages.map((stage) => {
                          const isActive = liveIssue.status === stage.key;
                          return (
                            <button
                              key={stage.key}
                              onClick={() => handleStatusUpdate(stage.key)}
                              disabled={isUpdatingStatus || isActive}
                              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 ${
                                isActive
                                  ? "bg-red-200 text-red-800 border-transparent cursor-default font-bold"
                                  : "bg-white dark:bg-slate-900 hover:bg-red-50 text-red-600 border border-red-200 cursor-pointer hover:shadow-sm"
                              }`}
                              id={`admin-btn-${liveIssue.id}-${stage.key}`}
                            >
                              <span>{stage.label}</span>
                              {isActive && <span className="text-[10px] font-normal lowercase">(active)</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    disabled={upvoting || !!hasUpvotedSession}
                    onClick={handleUpvote}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all ${
                      hasUpvotedSession
                        ? "bg-green-100 text-green-700 border-green-200"
                        : "bg-white dark:bg-slate-900 hover:bg-blue-50 text-blue-600 border-blue-100 shadow-sm"
                    }`}
                  >
                    <ThumbsUp className={`h-3.5 w-3.5 ${hasUpvotedSession ? "fill-green-600 text-green-700" : ""}`} />
                    <span>{liveIssue.upvoteCount} Upvotes</span>
                  </button>

                  <button
                    onClick={() => setIsDetailOpen(false)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-blue-100"
                  >
                    Close Details
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </motion.div>
  );
};
