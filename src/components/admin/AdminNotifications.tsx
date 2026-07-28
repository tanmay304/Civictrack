/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useCivic } from "../../context/CivicContext";
import { Bell, Send, CheckCircle2, AlertCircle, Info, Sparkles, Check } from "lucide-react";
import { motion } from "motion/react";
import { NotificationItem } from "../../types";

export const AdminNotifications: React.FC = () => {
  const { notifications, allUsers, sendNotification, markNotificationRead } = useCivic();

  // Send Broadcast Form state
  const [selectedUserUid, setSelectedUserUid] = useState<string>("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<NotificationItem["type"]>("info");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;

    if (selectedUserUid === "all") {
      // Send notification to all registered users
      for (const u of allUsers) {
        await sendNotification(u.uid, title, message, type);
      }
      setStatusMsg(`Broadcast sent to all ${allUsers.length} users! 🎉`);
    } else {
      await sendNotification(selectedUserUid, title, message, type);
      setStatusMsg("Notification delivered successfully!");
    }

    setTitle("");
    setMessage("");
    setTimeout(() => setStatusMsg(null), 4000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-black text-slate-900 dark:text-white tracking-tight">
          Notifications & Alerts System
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Monitor system event triggers, status change push alerts, and broadcast announcements to citizens.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Broadcast Form */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-base text-slate-900 dark:text-white">
                Send Notification
              </h3>
              <p className="text-xs text-slate-500">Dispatch message to Firestore</p>
            </div>
          </div>

          {statusMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          <form onSubmit={handleSendBroadcast} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Recipient</label>
              <select
                value={selectedUserUid}
                onChange={(e) => setSelectedUserUid(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">📢 Broadcast to All Citizens ({allUsers.length})</option>
                {allUsers.map(u => (
                  <option key={u.uid} value={u.uid}>👤 {u.name} ({u.email || u.uid})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Notification Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as NotificationItem["type"])}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="info">Info / Announcement</option>
                <option value="verified">Verified Alert</option>
                <option value="in-progress">In Progress Update</option>
                <option value="resolved">Resolution Alert</option>
                <option value="rejected">Rejection Notice</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Title</label>
              <input
                type="text"
                placeholder="e.g. Municipal Service Maintenance Update"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Message Content</label>
              <textarea
                rows={3}
                placeholder="Write message content..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Dispatch Notification</span>
            </button>
          </form>
        </div>

        {/* Right Column: Notification Log List */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-black text-base text-slate-900 dark:text-white">
              Recent Sent Notifications
            </h3>
            <span className="text-xs text-slate-500">Total {notifications.length} entries</span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        notif.type === "verified" ? "bg-blue-100 text-blue-800" :
                        notif.type === "resolved" ? "bg-emerald-100 text-emerald-800" :
                        notif.type === "rejected" ? "bg-rose-100 text-rose-800" : "bg-slate-200 text-slate-800"
                      }`}>
                        {notif.type}
                      </span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">{notif.title}</h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{notif.message}</p>
                    <p className="text-[10px] text-slate-400">
                      Target User ID: {notif.userId} • {notif.createdAt?.seconds ? new Date(notif.createdAt.seconds * 1000).toLocaleString() : "Just now"}
                    </p>
                  </div>

                  {!notif.read && (
                    <button
                      onClick={() => markNotificationRead(notif.id)}
                      title="Mark as Read"
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs font-medium">
                No notifications logged yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
