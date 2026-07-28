/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type IssueStatus = "reported" | "verified" | "in-progress" | "resolved";

export interface StatusHistoryEntry {
  status: IssueStatus;
  timestamp: any; // Firestore Timestamp
  note?: string;
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
  createdAt: any; // Firestore Timestamp
  upvoteCount: number;
  aiCategory?: string;
  aiSeverity?: number;
  aiDescription?: string;
  statusHistory?: StatusHistoryEntry[];
}

export interface UserProfile {
  uid: string;
  name: string;
  points: number;
  badges: string[];
  isAdmin?: boolean;
}
