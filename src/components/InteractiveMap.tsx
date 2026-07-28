/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin, 
  InfoWindow, 
  useAdvancedMarkerRef 
} from "@vis.gl/react-google-maps";
import { useCivic } from "../context/CivicContext";
import { Issue } from "../types";
import { UserBadge } from "./UserBadge";
import { 
  MapPin, 
  Compass, 
  Sparkles, 
  ThumbsUp, 
  Video, 
  X, 
  Clock, 
  ShieldAlert,
  Loader2,
  Calendar,
  User,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "../lib/firebase";

// Get API Key safely
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";
const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY";

// Individual Map Marker Component using useAdvancedMarkerRef pattern
const MapMarker: React.FC<{
  issue: Issue;
  onViewDetails: (issue: Issue) => void;
}> = ({ issue, onViewDetails }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [isOpen, setIsOpen] = useState(false);

  // Get color configurations by status
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "reported":
        return { bg: "#FF8A4C", border: "#e06626", glyphColor: "#ffffff", label: "Reported", badgeBg: "sticker-badge sticker-badge-orange" };
      case "verified":
        return { bg: "#2D5BFF", border: "#1c3eba", glyphColor: "#ffffff", label: "Verified", badgeBg: "sticker-badge sticker-badge-blue" };
      case "in-progress":
        return { bg: "#FF8A4C", border: "#e06626", glyphColor: "#ffffff", label: "In Progress", badgeBg: "sticker-badge sticker-badge-orange" };
      case "resolved":
        return { bg: "#34C77B", border: "#209958", glyphColor: "#ffffff", label: "Resolved", badgeBg: "sticker-badge sticker-badge-green" };
      default:
        return { bg: "#FF8A4C", border: "#e06626", glyphColor: "#ffffff", label: "Unknown", badgeBg: "sticker-badge sticker-badge-orange" };
    }
  };

  const config = getStatusConfig(issue.status);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: issue.lat, lng: issue.lng }}
        onClick={() => setIsOpen(true)}
        title={issue.title}
      >
        <Pin 
          background={config.bg} 
          borderColor={config.border} 
          glyphColor={config.glyphColor} 
        />
      </AdvancedMarker>

      {isOpen && (
        <InfoWindow
          anchor={marker}
          onCloseClick={() => setIsOpen(false)}
          headerDisabled={true}
        >
          <div className="p-3 min-w-[240px] max-w-[280px] text-ink font-sans bg-white dark:bg-slate-900 rounded-2xl border-2 border-ink shadow-lg">
            {/* Thumbnail */}
            {issue.imageUrl ? (
              <div className="w-full h-28 rounded-xl overflow-hidden mb-3 border-2 border-ink bg-slate-50 dark:bg-slate-950 relative">
                {issue.imageUrl && (issue.imageUrl.includes("localhost") || issue.imageUrl.includes("127.0.0.1")) && (
                  <div className="absolute top-1 left-1 bg-red-600 text-white px-1.5 py-0.5 rounded text-[7px] font-bold flex items-center gap-0.5 shadow-md z-20 animate-pulse border border-white">
                    <AlertTriangle className="h-2 w-2" />
                    <span>Local Image</span>
                  </div>
                )}
                <img 
                  src={issue.imageUrl} 
                  alt={issue.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                {issue.videoUrl && (
                  <div className="absolute bottom-1 right-1 bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-bold text-white flex items-center space-x-0.5 uppercase tracking-wider">
                    <Video className="h-2 w-2 text-blue-400" />
                    <span>Video</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-20 rounded-xl bg-cloud flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 mb-3 border-2 border-ink">
                <MapPin className="h-6 w-6 stroke-1 mb-1" />
                <span className="text-[8px] font-bold uppercase tracking-wider">No Photo</span>
              </div>
            )}
            
            {/* Title */}
            <h4 className="font-bold text-sm text-ink line-clamp-1 mb-1 leading-snug">
              {issue.title}
            </h4>

            {/* Category & Status */}
            <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider mb-3 gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-bold truncate max-w-[100px]">
                {issue.category === "pending" ? "Analyzing..." : issue.category}
              </span>
              <span className={`${config.badgeBg} text-[9px] px-2 py-0.5 shrink-0 scale-90 origin-right`}>
                {config.label}
              </span>
            </div>

            {/* View Details Button */}
            <button
              onClick={() => {
                onViewDetails(issue);
                setIsOpen(false);
              }}
              className="w-full py-2 bg-civic-blue hover:bg-blue-700 text-white border-2 border-ink rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center space-x-1 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>View Details</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export const InteractiveMap: React.FC = () => {
  const { issues, user, profile, upvote, changeStatus, verifyIssue } = useCivic();
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 37.77492, lng: -122.41941 });
  const [mapZoom, setMapZoom] = useState(13);
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Detail Modal state
  const [selectedDetailIssue, setSelectedDetailIssue] = useState<Issue | null>(null);
  const [liveDetailIssue, setLiveDetailIssue] = useState<Issue | null>(null);
  const [upvoting, setUpvoting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Reporter Profile state
  const [activeReporterProfile, setActiveReporterProfile] = useState<any>(null);

  useEffect(() => {
    if (!selectedDetailIssue?.reporterId) {
      setActiveReporterProfile(null);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "users", selectedDetailIssue.reporterId),
      (docSnap) => {
        if (docSnap.exists()) {
          setActiveReporterProfile(docSnap.data());
        }
      },
      (error) => {
        console.error("Error listening to user profile from map:", error);
      }
    );

    return () => unsubscribe();
  }, [selectedDetailIssue]);

  // Sync liveDetailIssue with onSnapshot in real-time when detail modal is active
  useEffect(() => {
    if (!selectedDetailIssue) {
      setLiveDetailIssue(null);
      return;
    }

    // Initialize with selected issue immediately
    setLiveDetailIssue(selectedDetailIssue);

    const unsubscribe = onSnapshot(
      doc(db, "issues", selectedDetailIssue.id),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setLiveDetailIssue({
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
        console.error("Error listening to single issue document from map:", error);
      }
    );

    return () => unsubscribe();
  }, [selectedDetailIssue]);

  const isAdmin = profile?.isAdmin || user?.email === "rushabhchopda070@gmail.com";

  // Verification states
  const [verifications, setVerifications] = useState<any[]>([]);
  const [verifying, setVerifying] = useState(false);

  // Subscribe to verifications subcollection in real-time
  useEffect(() => {
    if (!selectedDetailIssue || !user) {
      setVerifications([]);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, "issues", selectedDetailIssue.id, "verifications"),
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
  }, [selectedDetailIssue, user]);

  const handleVerify = async () => {
    if (!selectedDetailIssue || !user) return;
    setVerifying(true);
    try {
      await verifyIssue(selectedDetailIssue.id);
      // Update selected detail issue upvote count locally to keep in sync
      setSelectedDetailIssue(prev => prev ? {
        ...prev,
        upvoteCount: prev.upvoteCount + 1,
        // If upvote reaches 3 and status was reported, update status to verified
        status: (prev.status === "reported" && prev.upvoteCount + 1 >= 3) ? "verified" : prev.status
      } : null);
    } catch (err) {
      console.error("Verification failed:", err);
    } finally {
      setVerifying(false);
    }
  };

  const hasVerified = verifications.some((v) => v.userId === user?.uid);

  // Center on user's location on load
  useEffect(() => {
    handleCenterOnUser();
  }, []);

  const handleCenterOnUser = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setMapCenter(loc);
        setUserLocation(loc);
        setMapZoom(14);
        setIsLocating(false);
      },
      (error) => {
        console.warn("Geolocation denied/failed, staying at default SF center:", error);
        setUserLocation(null);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Safe upvote wrapper inside the modal
  const handleUpvote = async () => {
    if (!selectedDetailIssue || !user) return;
    setUpvoting(true);
    try {
      await upvote(selectedDetailIssue.id);
      // Locally update selected issue upvote counts
      setSelectedDetailIssue(prev => prev ? {
        ...prev,
        upvoteCount: prev.upvoteCount + 1
      } : null);
    } catch (err) {
      console.error("Upvote failed:", err);
    } finally {
      setUpvoting(false);
    }
  };

  // Safe status updater wrapper inside the modal
  const handleStatusChange = async (newStatus: Issue["status"]) => {
    if (!selectedDetailIssue) return;
    setIsUpdatingStatus(true);
    try {
      await changeStatus(selectedDetailIssue.id, newStatus);
      setSelectedDetailIssue(prev => prev ? {
        ...prev,
        status: newStatus
      } : null);
    } catch (err) {
      console.error("Status change failed:", err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Just now";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
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

  // Render splash if API key is missing
  if (!hasValidKey) {
    return (
      <div className="flex items-center justify-center py-20 px-4 min-h-[70vh] bg-slate-50 dark:bg-slate-950 font-sans" id="maps-setup-splash">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl p-8 max-w-lg text-center space-y-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <Compass className="h-8 w-8 animate-spin-slow" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-blue-900 dark:text-blue-100 leading-snug">Google Maps Access Required</h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
              To browse localized reports, track resolution pins, and view neighborhoods live, configure the Google Maps API Key.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-left space-y-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <p><strong>Step 1:</strong> <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Get an API Key</a></p>
            <p><strong>Step 2:</strong> Add your key as a secret in AI Studio:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400 font-medium pl-2">
              <li>Open <strong>Settings</strong> (⚙️ gear icon, top-right corner)</li>
              <li>Select <strong>Secrets</strong></li>
              <li>Type <code>GOOGLE_MAPS_PLATFORM_KEY</code> as the secret name</li>
              <li>Paste your API key as the value, press Enter</li>
            </ul>
          </div>

          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase italic">
            * The application will compile and load instantly once configured.
          </p>
        </div>
      </div>
    );
  }

  // Check if session user has upvoted this issue
  const sessionUpvotedKey = `civic_upvoted_${selectedDetailIssue?.id}`;
  const hasUpvotedSession = typeof window !== "undefined" && localStorage.getItem(sessionUpvotedKey);

  return (
    <div className="space-y-8" id="interactive-map-view">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-blue-900 dark:text-blue-100">
            Neighborhood Resolution Map
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Browse real-time reports color-coded by lifecycle status across your city.
          </p>
        </div>
        
        <button
          onClick={handleCenterOnUser}
          disabled={isLocating}
          className="flex items-center space-x-2 px-5 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:bg-slate-950 text-blue-900 dark:text-blue-100 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-sm self-start md:self-auto cursor-pointer"
        >
          {isLocating ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          ) : (
            <Compass className="h-4 w-4 text-blue-600" />
          )}
          <span>{isLocating ? "Locating..." : "My Location"}</span>
        </button>
      </div>

      {/* Map + Legend Layout */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md bg-slate-100 dark:bg-slate-800 aspect-[16/10] md:aspect-[16/9] min-h-[450px]" id="map-container-box">
        {/* Legend Overlay */}
        <div className="absolute top-4 right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 z-10 flex flex-col space-y-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          <span className="text-slate-400 dark:text-slate-500 font-bold text-[9px] mb-1">Status Legend</span>
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF8A4C]" />
            <span>Reported</span>
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2D5BFF]" />
            <span>Verified</span>
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFC93C]" />
            <span>In Progress</span>
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#34C77B]" />
            <span>Resolved</span>
          </div>
        </div>

        {/* Map API Component */}
        <APIProvider apiKey={API_KEY} version="weekly">
          <Map
            mapId="DEMO_MAP_ID"
            center={mapCenter}
            zoom={mapZoom}
            internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
            style={{ width: "100%", height: "100%" }}
            gestureHandling={"cooperative"}
            disableDefaultUI={true}
            options={{
              styles: [
                {
                  featureType: "poi",
                  elementType: "labels",
                  stylers: [{ visibility: "off" }]
                },
                {
                  featureType: "transit",
                  elementType: "all",
                  stylers: [{ visibility: "off" }]
                },
                {
                  featureType: "road",
                  elementType: "labels.icon",
                  stylers: [{ visibility: "off" }]
                }
              ]
            }}
          >
            {userLocation && (
              <AdvancedMarker 
                position={userLocation}
                title="Your Location"
                zIndex={50}
              >
                <div className="relative flex items-center justify-center pointer-events-none">
                  <div className="absolute w-8 h-8 bg-blue-500 rounded-full opacity-40 animate-ping" />
                  <div className="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md" />
                </div>
              </AdvancedMarker>
            )}
            
            {issues.map((issue) => (
              <MapMarker 
                key={issue.id}
                issue={issue}
                onViewDetails={(issueObj) => setSelectedDetailIssue(issueObj)}
              />
            ))}
          </Map>
        </APIProvider>
      </div>

      {/* Immersive Selected Issue Detail Modal */}
      <AnimatePresence>
        {selectedDetailIssue && (() => {
          const activeIssue = liveDetailIssue ?? selectedDetailIssue;
          const hasUpvotedSession = user ? localStorage.getItem(`upvoted_${user.uid}_${activeIssue.id}`) : false;
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
              onClick={() => setSelectedDetailIssue(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-xl max-w-2xl w-full border border-slate-200 dark:border-slate-700 flex flex-col"
                id={`map-issue-detail-modal-${activeIssue.id}`}
              >
                {/* Header with Close */}
                <div className="bg-slate-900 dark:bg-slate-50 text-white px-6 py-4.5 flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    {activeIssue.category === "pending" ? (
                      <span className="sticker-badge sticker-badge-orange animate-pulse">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Analyzing...</span>
                      </span>
                    ) : (
                      <span className="sticker-badge sticker-badge-blue">
                        <span>{activeIssue.category}</span>
                      </span>
                    )}
                    <span className={`sticker-badge ${
                      activeIssue.status === "reported" ? "sticker-badge-orange" :
                      activeIssue.status === "verified" ? "sticker-badge-blue" :
                      activeIssue.status === "in-progress" ? "sticker-badge-orange" :
                      "sticker-badge-green"
                    }`}>
                      <span>{activeIssue.status}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedDetailIssue(null)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-100 hover:text-white rounded-full transition-all duration-200 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Modal Body / Scrollable */}
                <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                  <div>
                    <h2 className="text-2xl font-black text-blue-900 dark:text-blue-100 leading-snug">{activeIssue.title}</h2>
                    <div className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1 flex items-center space-x-2 flex-wrap">
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>Reported by {activeIssue.reporterName}</span>
                        {activeReporterProfile && <UserBadge points={activeReporterProfile.points} />}
                      </div>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(activeIssue.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Media Section: Photo & Optional Video */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Photo Component */}
                    <div className="space-y-2">
                      <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Primary Photo</span>
                      <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm aspect-video bg-slate-100 dark:bg-slate-800 relative">
                        {activeIssue.imageUrl && (activeIssue.imageUrl.includes("localhost") || activeIssue.imageUrl.includes("127.0.0.1")) && (
                          <div className="absolute top-2 left-2 bg-red-600 text-white px-2.5 py-1 rounded-xl text-[9px] font-bold flex items-center gap-1 z-20 shadow-md animate-pulse">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Local fallback URL (Re-upload needed)</span>
                          </div>
                        )}
                        <img
                          src={activeIssue.imageUrl}
                          alt={activeIssue.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>

                    {/* Optional Video Component */}
                    {activeIssue.videoUrl ? (
                      <div className="space-y-2" id="modal-video-container">
                        <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Supporting Video</span>
                        <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm aspect-video bg-black flex items-center justify-center relative">
                          {activeIssue.videoUrl && (activeIssue.videoUrl.includes("localhost") || activeIssue.videoUrl.includes("127.0.0.1")) && (
                            <div className="absolute top-2 left-2 bg-red-600 text-white px-2.5 py-1 rounded-xl text-[9px] font-bold flex items-center gap-1 z-20 shadow-md animate-pulse">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>Local fallback URL (Re-upload needed)</span>
                            </div>
                          )}
                          <video
                            src={activeIssue.videoUrl}
                            className="w-full h-full object-contain"
                            controls
                            playsInline
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
                      {activeIssue.description}
                    </p>
                  </div>

                  {/* Gemini AI Verification details */}
                  {activeIssue.aiDescription && (
                    <div 
                      className="p-6 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/10 shadow-sm flex flex-col space-y-3 relative overflow-hidden" 
                      id="modal-ai-verification"
                    >
                      {/* Decorative background light effect */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />

                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 bg-amber-100 text-amber-700 rounded-xl flex-shrink-0">
                          <Sparkles className="h-4 w-4 animate-pulse" />
                        </div>
                        <div>
                          <span className="block text-xs font-bold uppercase tracking-wider text-amber-800">Gemini AI Smart Analysis</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Automatic categorisation & priority scoring</span>
                        </div>
                      </div>

                      <div className="bg-white/85 dark:bg-slate-900/85 border-2 border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm mt-1">
                        <p className="text-ink text-sm font-semibold italic leading-relaxed">
                          "{activeIssue.aiDescription}"
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1 text-xs font-black uppercase tracking-wider">
                        {activeIssue.aiCategory && (
                          <span className="sticker-badge sticker-badge-blue text-[9px] px-2.5 py-1">
                            Category: {activeIssue.aiCategory}
                          </span>
                        )}
                        {activeIssue.aiSeverity && (
                          <span className="sticker-badge sticker-badge-orange text-[9px] px-2.5 py-1">
                            Severity: Level {activeIssue.aiSeverity}/5
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
                        {activeIssue.lat.toFixed(6)}, {activeIssue.lng.toFixed(6)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-black">Severity Level</span>
                      <span className="text-slate-700 dark:text-slate-300 text-sm block flex items-center space-x-1.5">
                        <span className={`px-2 py-0.5 rounded font-black text-white text-xs ${
                          activeIssue.severity >= 4 ? "bg-red-500" : activeIssue.severity >= 3 ? "bg-amber-500" : "bg-emerald-500"
                        }`}>
                          {activeIssue.severity}/5
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Status Timeline Component */}
                  <div className="bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-700 rounded-3xl p-5 space-y-4" id={`map-timeline-${activeIssue.id}`}>
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-ink uppercase tracking-wider">Status Lifecycle Timeline</h4>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                        Real-time Tracked
                      </span>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 pb-1">
                      {stages.map((stage, idx) => {
                        const timestamp = getStatusTimestamp(stage.key, activeIssue.statusHistory || [], activeIssue.createdAt);
                        const isCompleted = !!timestamp;
                        
                        return (
                          <React.Fragment key={stage.key}>
                            {idx > 0 && (
                              <div className="hidden md:flex items-center text-slate-300">
                                <ChevronRight className="h-4 w-4" />
                              </div>
                            )}
                            <div className="flex-1 w-full md:w-auto" id={`map-timeline-step-${activeIssue.id}-${stage.key}`}>
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
                  <div className="p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 space-y-3" id={`map-verification-section-${activeIssue.id}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-black text-ink uppercase tracking-wider">Community Verification</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Confirmed sightings of this issue by local residents.</p>
                      </div>
                      <span className="bg-blue-100 text-civic-blue text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full font-mono font-bold border border-blue-200 self-start sm:self-center" id={`map-verification-count-${activeIssue.id}`}>
                        {verifications.length} verified
                      </span>
                    </div>

                    {user && user.uid !== activeIssue.reporterId ? (
                      <div className="flex items-center space-x-3 pt-1">
                        <button
                          onClick={handleVerify}
                          disabled={verifying || hasVerified}
                          className={`w-full sm:w-auto px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition-all flex items-center justify-center space-x-2 shadow-sm ${
                            hasVerified
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-300 cursor-not-allowed"
                              : "bg-civic-blue hover:bg-blue-700 text-white border-ink hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                          }`}
                          id={`map-confirm-see-too-btn-${activeIssue.id}`}
                        >
                          <ShieldCheck className="h-4.5 w-4.5" />
                          <span>{hasVerified ? "You Verified This" : "Confirm — I see this too"}</span>
                        </button>
                      </div>
                    ) : user && user.uid === activeIssue.reporterId ? (
                      <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl inline-block" id={`map-reporter-warning-${activeIssue.id}`}>
                        You are the original reporter of this issue.
                      </p>
                    ) : !user ? (
                      <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl inline-block" id={`map-auth-warning-${activeIssue.id}`}>
                        Sign in to verify this issue.
                      </p>
                    ) : null}
                  </div>

                  {/* Admin-Only Moderator Control View */}
                  {isAdmin && (
                    <div className="p-5 rounded-2xl border border-red-100 bg-red-50/30 space-y-3" id={`map-admin-panel-${activeIssue.id}`}>
                      <div className="flex items-center space-x-2 text-red-800">
                        <ShieldCheck className="h-4 w-4" />
                        <h4 className="text-sm font-black uppercase tracking-wider">Admin Moderator Panel</h4>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-normal">
                        As an administrator, you have permission to override and manually transition this report's operational state:
                      </p>
                      
                      <div className="flex flex-wrap gap-2 pt-1">
                        {stages.map((stage) => {
                          const isActive = activeIssue.status === stage.key;
                          return (
                            <button
                              key={stage.key}
                              onClick={() => handleStatusChange(stage.key)}
                              disabled={isUpdatingStatus || isActive}
                              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 ${
                                isActive
                                  ? "bg-red-200 text-red-800 border-transparent cursor-default font-bold"
                                  : "bg-white dark:bg-slate-900 hover:bg-red-50 text-red-600 border border-red-200 cursor-pointer hover:shadow-sm"
                              }`}
                              id={`map-admin-btn-${activeIssue.id}-${stage.key}`}
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
                    disabled={upvoting || !!hasUpvotedSession || !user}
                    onClick={handleUpvote}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all ${
                      hasUpvotedSession
                        ? "bg-green-100 text-green-700 border-green-200"
                        : !user 
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed"
                        : "bg-white dark:bg-slate-900 hover:bg-blue-50 text-blue-600 border-blue-100 shadow-sm cursor-pointer"
                    }`}
                    title={user ? "Upvote this report" : "Sign in to upvote"}
                  >
                    <ThumbsUp className={`h-3.5 w-3.5 ${hasUpvotedSession ? "fill-green-600 text-green-700" : ""}`} />
                    <span>{activeIssue.upvoteCount} Upvotes</span>
                  </button>

                  <button
                    onClick={() => setSelectedDetailIssue(null)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-blue-100 cursor-pointer"
                  >
                    Close Details
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};
