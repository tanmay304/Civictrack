/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type IssueStatus = "reported" | "verified" | "in-progress" | "resolved" | "rejected";
export type UserRole = "admin" | "moderator" | "citizen";
export type UserStatus = "active" | "disabled" | "suspended";

export interface StatusHistoryEntry {
  status: IssueStatus;
  timestamp: any; // Firestore Timestamp or number
  note?: string;
  updatedBy?: string;
  updatedByName?: string;
  remarks?: string;
}

export interface Comment {
  id: string;
  text: string;
  userId: string;
  userName: string;
  createdAt: any;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: number; // 1-5
  status: IssueStatus;
  lat: number;
  lng: number;
  imageUrl: string;
  videoUrl?: string;
  reporterId: string;
  reporterName: string;
  reporterEmail?: string;
  createdAt: any; // Firestore Timestamp
  upvoteCount: number;
  aiCategory?: string;
  aiSeverity?: number;
  aiDescription?: string;
  statusHistory?: StatusHistoryEntry[];
  updatedBy?: string;
  updatedAt?: any;
  remarks?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email?: string;
  photoURL?: string;
  role: UserRole;
  status: UserStatus;
  createdAt?: any;
  lastLogin?: any;
  points: number;
  badges: string[];
  isAdmin?: boolean;
}

export interface ActivityLog {
  id: string;
  action: string;
  adminId: string;
  adminName: string;
  adminRole: UserRole;
  timestamp: any;
  details: string;
  targetType?: string;
  targetId?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "verified" | "rejected" | "in-progress" | "resolved" | "info";
  read: boolean;
  createdAt: any;
  issueId?: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: any;
  updatedAt: any;
  updatedBy: string;
}

export interface AdminStatCards {
  totalUsers: number;
  totalReports: number;
  pendingReports: number;
  verifiedReports: number;
  inProgressReports: number;
  resolvedReports: number;
  rejectedReports: number;
  reportsThisMonth: number;
}
