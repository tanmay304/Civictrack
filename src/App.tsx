/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { CivicProvider, useCivic } from "./context/CivicContext";
import { Navbar } from "./components/Navbar";
import { BottomNav } from "./components/BottomNav";
import { ProfilePanel } from "./components/ProfilePanel";
import { ProfilePage } from "./components/ProfilePage";
import { IssueCard } from "./components/IssueCard";
import { ReportForm } from "./components/ReportForm";
import { InteractiveMap } from "./components/InteractiveMap";
import { Dashboard } from "./components/Dashboard";
import { EmergencyContacts } from "./components/EmergencyContacts";
import { 
  ShieldAlert, 
  MapPin, 
  Award, 
  ChevronRight, 
  Search, 
  Filter, 
  Sparkles,
  Info,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Loader2,
  Phone,
  FileText,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

function AppContent() {
  const { user, profile, issues, loadingIssues, signIn, authError, setAuthError, signInDemo } = useCivic();
  const [activeTab, setActiveTab] = useState<"landing" | "dashboard" | "feed" | "report" | "map" | "profile" | "emergency">("landing");
  
  // Filtering & Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const [infoModal, setInfoModal] = useState<"terms" | "privacy" | "support" | null>(null);

  // Automatically direct logged-in users to the dashboard tab
  React.useEffect(() => {
    if (user && activeTab === "landing") {
      setActiveTab("dashboard");
    }
  }, [user]);

  // Automatically direct logged-out users away from protected tabs to the landing tab
  React.useEffect(() => {
    const protectedTabs = ["dashboard", "feed", "map", "profile", "report"];
    if (!user && protectedTabs.includes(activeTab)) {
      setActiveTab("landing");
    }
  }, [user, activeTab]);

  // Filter issues
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const matchesSearch = 
        issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === "all" || issue.category.includes(categoryFilter);
      const matchesStatus = statusFilter === "all" || issue.status === statusFilter;
      const matchesSeverity = severityFilter === "all" || issue.severity.toString() === severityFilter;

      return matchesSearch && matchesCategory && matchesStatus && matchesSeverity;
    });
  }, [issues, searchTerm, categoryFilter, statusFilter, severityFilter]);

  // Handle reporting success
  const handleReportSuccess = () => {
    if (user) {
      setShowNotification("Issue reported successfully! 10 Points awarded! 🎉");
      setActiveTab("feed");
    } else {
      setShowNotification("Issue reported successfully as a Community member! Thank you! 🎉");
      setActiveTab("landing");
    }
    setTimeout(() => setShowNotification(null), 6000);
  };

  const handleActionClick = () => {
    if (user) {
      setActiveTab("report");
    } else {
      signIn().then(() => {
        setActiveTab("report");
      });
    }
  };

  // Get categories from issues list dynamically for the filter dropdown
  const categoriesList = useMemo(() => {
    const list = new Set<string>();
    issues.forEach(i => list.add(i.category));
    return Array.from(list);
  }, [issues]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-50 antialiased font-sans">
      <Navbar onNavigate={setActiveTab} activeTab={activeTab} />
      <BottomNav onNavigate={setActiveTab} activeTab={activeTab} />

      {/* Success Notification Banner */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-2xl shadow-lg shadow-green-100 font-black uppercase tracking-wider text-xs flex items-center space-x-2 border border-green-400"
            id="global-success-notification"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{showNotification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24 lg:pb-10">
        <AnimatePresence mode="wait">
          
          {/* LANDING TAB */}
          {activeTab === "landing" && !user && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="space-y-16 py-12 md:py-16"
              id="landing-view"
            >
              {/* Hero Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                <div className="lg:col-span-7 text-left space-y-6">
                  <motion.div 
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className="sticker-badge sticker-badge-blue text-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                    <span>Your Neighborhood Action Center</span>
                  </motion.div>

                  <h1 className="text-5xl sm:text-7xl font-black text-ink leading-[1.1] tracking-tight font-display">
                    Welcome to <span className="text-civic-blue">CivicTrack</span>
                  </h1>

                  <p className="text-xl text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed font-medium">
                    Spot something broken in your area? Report it in seconds and watch your community fix it together.
                  </p>

                  <div className="pt-4 flex flex-col sm:flex-row flex-wrap items-center gap-4">
                    <button
                      onClick={handleActionClick}
                      className="w-full sm:w-auto px-8 py-4 bg-civic-blue hover:bg-blue-700 text-white rounded-2xl font-black text-lg shadow-lg shadow-blue-200 hover:-translate-y-0.5 transition-all flex items-center justify-center space-x-2 group cursor-pointer"
                      id="hero-btn-report"
                    >
                      <span>Report an Issue</span>
                      <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </button>
                    <button
                      onClick={() => setActiveTab("report")}
                      className="w-full sm:w-auto px-8 py-4 bg-amber-50 hover:bg-amber-100 text-amber-950 border-2 border-amber-200 rounded-2xl font-black text-lg hover:-translate-y-0.5 transition-all cursor-pointer shadow-sm flex items-center justify-center space-x-1"
                      id="hero-btn-guest-report"
                    >
                      <span>Report without signing in</span>
                    </button>
                    <button
                      onClick={() => {
                        if (user) {
                          setActiveTab("map");
                        } else {
                          signIn().then(() => {
                            setTimeout(() => setActiveTab("map"), 100);
                          });
                        }
                      }}
                      className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-900 text-civic-blue border-2 border-blue-100 rounded-2xl font-black text-lg hover:bg-blue-50 hover:-translate-y-0.5 transition-all cursor-pointer shadow-sm"
                      id="hero-btn-join"
                    >
                      View the Map
                    </button>
                  </div>

                  {/* Demo Mode Quick Access Banner */}
                  <div className="pt-4 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-spark-yellow" />
                      <span>Instant Sandbox Demo Mode:</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => signInDemo(false)}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl font-extrabold text-xs transition-colors cursor-pointer"
                      >
                        Citizen Access
                      </button>
                      <button
                        onClick={() => signInDemo(true)}
                        className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-extrabold text-xs transition-colors cursor-pointer"
                      >
                        Moderator Access
                      </button>
                    </div>
                  </div>
                </div>

                {/* Animated Graphic Box: 3-4 Sticker Badges showing status states */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden flex flex-col justify-between space-y-6 transition-all duration-200 ease-out">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <span className="font-display font-bold text-lg text-ink">Active Life Cycle</span>
                      <span className="text-[10px] font-mono bg-cloud px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 font-bold">LIVE STICKER FEED</span>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3.5 bg-cloud/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 hover:border-civic-blue/50 transition-colors">
                        <span className="text-xs font-bold text-ink">Pothole on Main St.</span>
                        <div className="sticker-badge sticker-badge-blue">
                          <span className="w-1.5 h-1.5 rounded-full bg-civic-blue animate-pulse" />
                          <span>Reported</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3.5 bg-cloud/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 hover:border-signal-orange/50 transition-colors">
                        <span className="text-xs font-bold text-ink">Graffiti in Central Park</span>
                        <div className="sticker-badge sticker-badge-orange">
                          <span className="w-1.5 h-1.5 rounded-full bg-signal-orange animate-pulse" />
                          <span>Verified</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3.5 bg-cloud/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 hover:border-spark-yellow/50 transition-colors">
                        <span className="text-xs font-bold text-ink">Broken Park Bench</span>
                        <div className="sticker-badge sticker-badge-yellow">
                          <span className="w-1.5 h-1.5 rounded-full bg-spark-yellow animate-pulse" />
                          <span>In Progress</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3.5 bg-cloud/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 hover:border-resolved-green/50 transition-colors">
                        <span className="text-xs font-bold text-ink">Flickering Streetlight</span>
                        <div className="sticker-badge sticker-badge-green">
                          <span className="w-1.5 h-1.5 rounded-full bg-resolved-green animate-pulse" />
                          <span>Resolved</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Why CivicTrack Comparison Section */}
              <div className="space-y-8 pt-12 pb-4">
                <div className="text-center space-y-3">
                  <h2 className="text-3xl font-bold text-ink font-display">Reporting a civic issue in Pimpri-Chinchwad shouldn't take weeks</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-medium max-w-3xl mx-auto text-sm leading-relaxed">
                    PCMC's official complaint channels work, but they require phone calls, written complaints, or in-person visits — and there's no way to see if anyone else nearby has the same problem. CivicTrack adds what's missing: a photo, a location, and a community that can verify it together.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Column 1 */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col space-y-4">
                    <div className="w-10 h-10 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-800">
                      <Phone className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-ink text-lg">Official PCMC Helplines</h3>
                    <div className="text-sm text-slate-500 dark:text-slate-400 font-medium space-y-2">
                      <p><strong className="text-slate-700 dark:text-slate-300">SARATHI Helpline/WhatsApp:</strong> 8888006666 <span className="text-xs text-slate-400">(Primary)</span></p>
                      <p><strong className="text-slate-700 dark:text-slate-300">General Contact:</strong> 020-6733 3333</p>
                      <p><strong className="text-slate-700 dark:text-slate-300">SMS/WhatsApp Complaint Line:</strong> 9922501450</p>
                    </div>
                  </div>
                  
                  {/* Column 2 */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col space-y-4">
                    <div className="w-10 h-10 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-800">
                      <FileText className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-ink text-lg">Official PCMC Complaint Portal</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                      File online, no photo or location required
                    </p>
                  </div>
                  
                  {/* Column 3 */}
                  <div className="bg-blue-50 p-6 rounded-3xl border border-blue-200 shadow-sm flex flex-col space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
                      <Zap className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-blue-900 dark:text-blue-100 text-lg">Via CivicTrack</h3>
                    <p className="text-sm text-blue-800 font-medium">
                      Photo + GPS location + AI categorization in under a minute, with community verification
                    </p>
                  </div>
                </div>
                
                <div className="text-center pt-2 space-y-1">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">
                    PCMC contact details sourced from pcmcindia.gov.in. CivicTrack is an independent civic-tech project and is not affiliated with or endorsed by PCMC.
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500/80 font-medium">
                    Currently focused on Pimpri-Chinchwad (PCMC) — built to expand to other Indian municipalities.
                  </p>
                </div>
              </div>

              {/* Core loop section: Report something → Community verifies it → Track it to resolved */}
              <div className="space-y-8 pt-12">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold text-ink font-display">How CivicTrack Works</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xl mx-auto text-sm">
                    A simple three-step cycle that connects responsive citizens with local action.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Step 1 */}
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out flex flex-col space-y-4 relative">
                    <div className="absolute -top-3.5 -left-2 sticker-badge sticker-badge-blue text-xs font-black">
                      STEP 1
                    </div>
                    <div className="w-12 h-12 bg-blue-50 text-civic-blue rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm">
                      <MapPin className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-ink font-display">Report something</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      Spot a neighborhood problem? Snap a photo and submit it in seconds.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out flex flex-col space-y-4 relative">
                    <div className="absolute -top-3.5 -left-2 sticker-badge sticker-badge-orange text-xs font-black">
                      STEP 2
                    </div>
                    <div className="w-12 h-12 bg-orange-50 text-signal-orange rounded-2xl flex items-center justify-center border border-orange-100 shadow-sm">
                      <ShieldAlert className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-ink font-display">Community verifies it</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      Neighbors upvote to confirm, turning reports into verified civic actions.
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-out flex flex-col space-y-4 relative">
                    <div className="absolute -top-3.5 -left-2 sticker-badge sticker-badge-green text-xs font-black">
                      STEP 3
                    </div>
                    <div className="w-12 h-12 bg-green-50 text-resolved-green rounded-2xl flex items-center justify-center border border-green-100 shadow-sm">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-ink font-display">Track it to resolved</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      Watch city works start repairs and track the status live until it's fixed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Informative Civic Stats/Callout */}
              <div className="p-8 bg-slate-900 dark:bg-slate-50 rounded-3xl border border-slate-800 text-left flex flex-col sm:flex-row items-center justify-between gap-6 max-w-4xl mx-auto shadow-md">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 text-blue-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                    <Info className="h-4 w-4" />
                    <span>How it works</span>
                  </div>
                  <p className="text-sm text-slate-300 max-w-xl font-medium leading-relaxed">
                    Log in with Google, report potholes, graffiti or broken streetlights, track resolutions, and vote on reports that matter most to you!
                  </p>
                </div>
                <button
                  onClick={signIn}
                  className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs rounded-xl transition-all duration-200 ease-out whitespace-nowrap shadow-sm hover:shadow-md"
                >
                  Get Started Now
                </button>
              </div>
            </motion.div>
          )}

          {/* DASHBOARD TAB */}
          {activeTab === "dashboard" && user && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="py-6"
              id="dashboard-view"
            >
              <Dashboard />
            </motion.div>
          )}

          {/* COMMUNITY ISSUE FEED TAB */}
          {activeTab === "feed" && user && (
            <motion.div
              key="feed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
              id="feed-view"
            >
              {/* Dashboard top layout */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-blue-900 dark:text-blue-100">
                    Community Issue Feed
                  </h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                    Upvote reported issues or add a new report to trigger actions from city teams.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("report")}
                  className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-100 transition-all text-xs uppercase tracking-widest flex items-center justify-center space-x-1.5 self-start md:self-auto"
                  id="dashboard-btn-report"
                >
                  <ShieldAlert className="h-4.5 w-4.5" />
                  <span>Report New Issue</span>
                </button>
              </div>

              {/* Search & Filter bar */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-md grid grid-cols-1 md:grid-cols-4 gap-4" id="filter-bar">
                {/* Search input */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search issues..."
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-4 focus:ring-blue-100/40 focus:border-blue-500 text-sm font-medium transition-all bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                {/* Category filter */}
                <div className="relative">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-4 focus:ring-blue-100/40 focus:border-blue-500 text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    <option value="Pothole">Roads / Potholes</option>
                    <option value="Light">Electricity / Lighting</option>
                    <option value="Water">Water / Drainage</option>
                    <option value="Trash">Trash / Waste</option>
                    <option value="Graffiti">Graffiti / Vandalism</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Status filter */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-4 focus:ring-blue-100/40 focus:border-blue-500 text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="reported">Reported</option>
                    <option value="verified">Verified</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>

                {/* Severity filter */}
                <div className="relative">
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-4 focus:ring-blue-100/40 focus:border-blue-500 text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 cursor-pointer"
                  >
                    <option value="all">All Severities</option>
                    <option value="1">1/5 (Low)</option>
                    <option value="2">2/5 (Minor)</option>
                    <option value="3">3/5 (Moderate)</option>
                    <option value="4">4/5 (Major)</option>
                    <option value="5">5/5 (Critical)</option>
                  </select>
                </div>
              </div>

              {/* Main Feed Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                
                {/* Profile Panel & Stats Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                  <ProfilePanel />
                  
                  {/* Local City Contact Info / Stats info widget */}
                  <div className="bg-blue-900 rounded-3xl p-6 text-white shadow-lg flex flex-col justify-between space-y-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-1">Community Impact</p>
                      <h2 className="text-4xl font-black">{issues.filter(i => i.status === "resolved").length}</h2>
                      <p className="text-xs font-semibold text-blue-200">Issues resolved this month</p>
                    </div>
                    <div className="pt-4 border-t border-blue-800 flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-blue-400">
                      <span>My Civic Score:</span>
                      <span className="bg-blue-800 text-white px-2.5 py-1 rounded-full">{profile?.points || 0} PTS</span>
                    </div>
                  </div>
                </div>

                {/* Issue Cards Feed */}
                <div className="lg:col-span-3">
                  {loadingIssues ? (
                    <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3" id="feed-loading">
                      <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Retrieving satellite reports feed...</p>
                    </div>
                  ) : filteredIssues.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="issues-grid">
                      {filteredIssues.map((issue) => (
                        <IssueCard key={issue.id} issue={issue} />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-16 text-center space-y-4" id="empty-feed">
                      <div className="p-4 bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 rounded-full w-fit mx-auto border border-slate-100 dark:border-slate-800">
                        <ShieldAlert className="h-10 w-10 stroke-1" />
                      </div>
                      <h3 className="font-sans font-bold text-slate-800 dark:text-slate-200 text-lg">No Civic Issues Found</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                        {issues.length === 0 
                          ? "Congratulations! There are no issues reported in this area yet. Be the first to add one!" 
                          : "No reported issues match your active search or filters. Try adjusting them!"}
                      </p>
                      <button
                        onClick={() => setActiveTab("report")}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                      >
                        Create Report
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}

          {/* REPORT ISSUE TAB */}
          {activeTab === "report" && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="py-6"
              id="report-view"
            >
              <ReportForm 
                onSuccess={handleReportSuccess} 
                onCancel={() => setActiveTab(user ? "feed" : "landing")}  
              />
            </motion.div>
          )}

          {/* MAP TAB */}
          {activeTab === "map" && user && (
            <motion.div
              key="map"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="py-6"
            >
              <InteractiveMap />
            </motion.div>
          )}

          {/* PROFILE PAGE TAB */}
          {activeTab === "profile" && user && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="py-6"
              id="profile-view"
            >
              <ProfilePage />
            </motion.div>
          )}

          {/* EMERGENCY CONTACTS TAB */}
          {activeTab === "emergency" && (
            <motion.div
              key="emergency"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="py-6"
              id="emergency-view"
            >
              <EmergencyContacts />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <footer className="w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 py-6 px-4 lg:px-10 mt-auto flex flex-col lg:flex-row items-center justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider gap-6 pb-24 lg:pb-6 text-center lg:text-left">
        <div>&copy; 2026 CivicTrack Platform</div>
        <div className="flex gap-4 lg:gap-6 items-center justify-center flex-wrap">
          <button 
            onClick={() => setActiveTab("emergency")}
            className="cursor-pointer text-[#FF8A4C] hover:text-[#FF8A4C]/80 font-black flex items-center space-x-1.5 bg-[#FFF1EB] border border-[#FF8A4C]/30 px-3 py-1.5 rounded-xl transition-all shadow-sm"
            id="footer-btn-emergency"
          >
            <Phone className="h-3 w-3 animate-pulse text-[#FF8A4C]" />
            <span>Emergency Contacts</span>
          </button>
          <span className="cursor-pointer hover:text-slate-600 dark:text-slate-400" onClick={() => setInfoModal("terms")}>Terms of Service</span>
          <span className="cursor-pointer hover:text-slate-600 dark:text-slate-400" onClick={() => setInfoModal("privacy")}>Privacy Policy</span>
          <span className="cursor-pointer hover:text-slate-600 dark:text-slate-400" onClick={() => setInfoModal("support")}>Contact Support</span>
        </div>
      </footer>

      {/* AUTH ERROR / POPUP BLOCKER MODAL */}
      <AnimatePresence>
        {authError && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" id="auth-error-modal">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-8 space-y-6">
                {/* Header */}
                <div className="flex items-start space-x-4">
                  <div className="p-3.5 bg-amber-50 rounded-2xl text-amber-600 border border-amber-100 flex-shrink-0">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-50 leading-tight">
                      {authError === "popup-blocked" ? "Sign-In Popup Blocked" : "Sign-In Issue"}
                    </h3>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1">
                      Preview Environment Guard
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="text-sm text-slate-500 dark:text-slate-400 space-y-3 leading-relaxed font-medium">
                  {authError === "popup-blocked" ? (
                    <>
                      <p>
                        Your browser blocked the Google Sign-In popup because this application is running inside a secure preview iframe.
                      </p>
                      <p className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 font-mono">
                        Tip: Open the app in a top-level tab to sign in securely, or use Demo Mode to test instantly!
                      </p>
                    </>
                  ) : (
                    <>
                      <p>An authentication error occurred while connecting with Firebase:</p>
                      <p className="bg-red-50 text-red-700 p-3 rounded-2xl text-xs font-mono border border-red-100 max-h-24 overflow-y-auto">
                        {authError}
                      </p>
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2.5 pt-2">
                  {authError === "popup-blocked" && (
                    <button
                      onClick={() => {
                        window.open(window.location.origin, "_blank");
                        setAuthError(null);
                      }}
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-200 transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <span>Open App in New Tab</span>
                    </button>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => {
                        signInDemo(false);
                      }}
                      className="py-3 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <span>Demo Citizen</span>
                    </button>
                    <button
                      onClick={() => {
                        signInDemo(true);
                      }}
                      className="py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 rounded-2xl font-black text-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <span>Demo Moderator</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setAuthError(null)}
                    className="w-full py-3 hover:bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 rounded-2xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel / Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INFO MODALS */}
      <AnimatePresence>
        {infoModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setInfoModal(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-[32px] max-w-lg w-full shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
                      {infoModal === "support" ? <Phone className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-50 leading-tight">
                      {infoModal === "terms" && "Terms of Service"}
                      {infoModal === "privacy" && "Privacy Policy"}
                      {infoModal === "support" && "Contact Support"}
                    </h3>
                  </div>
                </div>

                <div className="text-sm text-slate-600 dark:text-slate-400 space-y-4 leading-relaxed h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {infoModal === "terms" && (
                    <>
                      <p>Welcome to CivicTrack. By using our platform, you agree to these terms.</p>
                      <p><strong>1. Acceptable Use:</strong> You agree to only report genuine civic issues and not misuse the platform for spam or harassment.</p>
                      <p><strong>2. User Content:</strong> You retain rights to your photos, but grant CivicTrack a license to display and share them with relevant municipal authorities.</p>
                      <p><strong>3. Disclaimer:</strong> CivicTrack is an independent civic-tech project and is not affiliated with or endorsed by PCMC or any other municipal corporation. We do not guarantee resolution of reported issues.</p>
                    </>
                  )}
                  {infoModal === "privacy" && (
                    <>
                      <p>Your privacy is important to us. Here is how we handle your data:</p>
                      <p><strong>Location Data:</strong> We collect GPS location only when you explicitly report an issue, to accurately map the problem.</p>
                      <p><strong>Personal Info:</strong> Your profile information is used solely for authentication and assigning your reports to you. We do not sell your personal data.</p>
                      <p><strong>Public Visibility:</strong> Issues reported are visible to the public to encourage community verification.</p>
                    </>
                  )}
                  {infoModal === "support" && (
                    <>
                      <p>Need help with the CivicTrack platform?</p>
                      <p><strong>Email us:</strong> support@civictrack.app</p>
                      <p><strong>Feedback:</strong> We are constantly improving. If you have feature requests or found a bug, please reach out.</p>
                      <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Municipal Helplines</p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300"><strong>SARATHI Helpline/WhatsApp:</strong> 8888006666 <span className="text-xs text-slate-400 dark:text-slate-500">(Primary)</span></p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300"><strong>General Contact:</strong> 020-6733 3333</p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300"><strong>SMS/WhatsApp Complaint Line:</strong> 9922501450</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setInfoModal(null)}
                    className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-sm transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <CivicProvider>
      <AppContent />
    </CivicProvider>
  );
}
