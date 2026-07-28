import React from "react";
import { useCivic } from "../context/CivicContext";
import { LayoutDashboard, Rss, Map as MapIcon, User, PlusCircle } from "lucide-react";

interface BottomNavProps {
  onNavigate: (tab: "landing" | "dashboard" | "feed" | "report" | "map" | "profile" | "emergency") => void;
  activeTab: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onNavigate, activeTab }) => {
  const { user } = useCivic();

  if (!user) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 pb-2 lg:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
      <div className="flex items-center justify-around h-16 px-2">
        <button
          onClick={() => onNavigate("dashboard")}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
            activeTab === "dashboard" ? "text-blue-600" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400"
          }`}
        >
          <LayoutDashboard className={`h-5 w-5 ${activeTab === "dashboard" ? "fill-blue-100" : ""}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
        </button>

        <button
          onClick={() => onNavigate("feed")}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
            activeTab === "feed" ? "text-blue-600" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400"
          }`}
        >
          <Rss className={`h-5 w-5 ${activeTab === "feed" ? "fill-blue-100" : ""}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Feed</span>
        </button>

        <button
          onClick={() => onNavigate("report")}
          className="flex flex-col items-center justify-center w-full h-full relative -top-3"
        >
          <div className={`flex items-center justify-center h-12 w-12 rounded-full shadow-lg ${
            activeTab === "report" ? "bg-green-600 shadow-green-200" : "bg-blue-600 shadow-blue-200"
          } text-white`}>
            <PlusCircle className="h-6 w-6" />
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${
            activeTab === "report" ? "text-green-600" : "text-blue-600"
          }`}>Report</span>
        </button>

        <button
          onClick={() => onNavigate("map")}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
            activeTab === "map" ? "text-blue-600" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400"
          }`}
        >
          <MapIcon className={`h-5 w-5 ${activeTab === "map" ? "fill-blue-100" : ""}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Map</span>
        </button>

        <button
          onClick={() => onNavigate("profile")}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
            activeTab === "profile" ? "text-blue-600" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400"
          }`}
        >
          <User className={`h-5 w-5 ${activeTab === "profile" ? "fill-blue-100" : ""}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
        </button>
      </div>
    </div>
  );
};
