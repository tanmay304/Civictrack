/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { User as FirebaseUser, signInWithPopup, signOut } from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  addDoc,
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  increment,
  Timestamp,
  arrayUnion
} from "firebase/firestore";
import { 
  auth, 
  db, 
  googleProvider, 
  handleFirestoreError, 
  OperationType 
} from "../lib/firebase";
import { 
  Issue, 
  UserProfile, 
  UserRole, 
  UserStatus, 
  IssueStatus, 
  ActivityLog, 
  NotificationItem 
} from "../types";

interface CivicContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  issues: Issue[];
  allUsers: UserProfile[];
  activityLogs: ActivityLog[];
  notifications: NotificationItem[];
  loadingAuth: boolean;
  loadingIssues: boolean;
  loadingUsers: boolean;
  authError: string | null;
  isDemo: boolean;
  setAuthError: (error: string | null) => void;
  signIn: () => Promise<void>;
  signInDemo: (role?: UserRole) => void;
  logOut: () => Promise<void>;
  reportNewIssue: (
    title: string,
    description: string,
    category: string,
    severity: number,
    lat: number,
    lng: number,
    imageFile: File,
    videoFile?: File | null,
    aiCategory?: string,
    aiSeverity?: number,
    aiDescription?: string,
    onUploadProgress?: (progress: number, stage: string) => void
  ) => Promise<string>;
  upvote: (issueId: string) => Promise<void>;
  changeStatus: (issueId: string, newStatus: IssueStatus, remarks?: string) => Promise<void>;
  verifyIssue: (issueId: string) => Promise<void>;
  rejectIssue: (issueId: string, remarks?: string) => Promise<void>;
  deleteIssue: (issueId: string) => Promise<void>;
  updateUserRole: (uid: string, newRole: UserRole) => Promise<void>;
  toggleUserStatus: (uid: string, newStatus: UserStatus) => Promise<void>;
  deleteUserAccount: (uid: string) => Promise<void>;
  updateUserProfileData: (uid: string, data: Partial<UserProfile>) => Promise<void>;
  sendNotification: (userId: string, title: string, message: string, type: NotificationItem["type"], issueId?: string) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  logActivity: (action: string, details: string, targetType?: string, targetId?: string) => Promise<void>;
}

// In-memory array to track guest submission timestamps for rate-limiting
const guestSubmissionTimestamps: number[] = [];

const CivicContext = createContext<CivicContextType | undefined>(undefined);

export const useCivic = () => {
  const context = useContext(CivicContext);
  if (!context) {
    throw new Error("useCivic must be used within a CivicProvider");
  }
  return context;
};

export const CivicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState<boolean>(() => {
    return localStorage.getItem("civic_is_demo") === "true";
  });

  // Default Demo Users dataset
  const defaultDemoUsers: UserProfile[] = [
    {
      uid: "demo-admin-999",
      name: "Tanmay Thorat (Admin)",
      email: "tanmay.sa.thorat@gmail.com",
      photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
      role: "admin",
      status: "active",
      points: 450,
      badges: ["Newcomer", "Active Citizen", "Civic Hero", "Community Champion"],
      createdAt: { seconds: Math.floor(Date.now() / 1000) - 2592000 },
      lastLogin: { seconds: Math.floor(Date.now() / 1000) },
      isAdmin: true
    },
    {
      uid: "demo-mod-888",
      name: "Sarah Jenkins (Moderator)",
      email: "mod.sarah@civicconnect.org",
      photoURL: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
      role: "moderator",
      status: "active",
      points: 210,
      badges: ["Newcomer", "Active Citizen", "Civic Hero"],
      createdAt: { seconds: Math.floor(Date.now() / 1000) - 1800000 },
      lastLogin: { seconds: Math.floor(Date.now() / 1000) - 3600 },
      isAdmin: false
    },
    {
      uid: "demo-citizen-111",
      name: "Demo Citizen",
      email: "demo.citizen@civicconnect.org",
      photoURL: null,
      role: "citizen",
      status: "active",
      points: 85,
      badges: ["Newcomer", "Active Citizen"],
      createdAt: { seconds: Math.floor(Date.now() / 1000) - 1200000 },
      lastLogin: { seconds: Math.floor(Date.now() / 1000) - 7200 },
      isAdmin: false
    },
    {
      uid: "user-marcus-222",
      name: "Marcus Vance",
      email: "marcus.vance@example.com",
      photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
      role: "citizen",
      status: "active",
      points: 150,
      badges: ["Newcomer", "Active Citizen", "Civic Hero"],
      createdAt: { seconds: Math.floor(Date.now() / 1000) - 900000 },
      lastLogin: { seconds: Math.floor(Date.now() / 1000) - 14400 },
      isAdmin: false
    },
    {
      uid: "user-disabled-333",
      name: "Inaccessible Account",
      email: "suspended.user@example.com",
      photoURL: null,
      role: "citizen",
      status: "disabled",
      points: 0,
      badges: ["Newcomer"],
      createdAt: { seconds: Math.floor(Date.now() / 1000) - 400000 },
      lastLogin: { seconds: Math.floor(Date.now() / 1000) - 300000 },
      isAdmin: false
    }
  ];

  // Default Demo Activity Logs
  const defaultDemoLogs: ActivityLog[] = [
    {
      id: "log-1",
      action: "Admin Login",
      adminId: "demo-admin-999",
      adminName: "Tanmay Thorat (Admin)",
      adminRole: "admin",
      timestamp: { seconds: Math.floor(Date.now() / 1000) - 300 },
      details: "Admin logged into Enterprise Dashboard"
    },
    {
      id: "log-2",
      action: "Report Verified",
      adminId: "demo-admin-999",
      adminName: "Tanmay Thorat (Admin)",
      adminRole: "admin",
      timestamp: { seconds: Math.floor(Date.now() / 1000) - 3600 },
      details: "Verified issue demo-issue-1 ('Pothole on Main Street')",
      targetType: "issue",
      targetId: "demo-issue-1"
    },
    {
      id: "log-3",
      action: "Role Changed",
      adminId: "demo-admin-999",
      adminName: "Tanmay Thorat (Admin)",
      adminRole: "admin",
      timestamp: { seconds: Math.floor(Date.now() / 1000) - 7200 },
      details: "Promoted Sarah Jenkins to Moderator",
      targetType: "user",
      targetId: "demo-mod-888"
    }
  ];

  // Default Demo Notifications
  const defaultDemoNotifications: NotificationItem[] = [
    {
      id: "notif-1",
      userId: "demo-citizen-111",
      title: "Report Verified",
      message: "Your report 'Pothole on Main Street' has been verified by the municipal admin team.",
      type: "verified",
      read: false,
      createdAt: { seconds: Math.floor(Date.now() / 1000) - 1800 },
      issueId: "demo-issue-1"
    },
    {
      id: "notif-2",
      userId: "demo-citizen-111",
      title: "Work Started",
      message: "Maintenance crew dispatched for 'Broken Streetlight in Park'.",
      type: "in-progress",
      read: true,
      createdAt: { seconds: Math.floor(Date.now() / 1000) - 86400 },
      issueId: "demo-issue-2"
    }
  ];

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setLoadingAuth(true);
      if (isDemo) {
        setLoadingAuth(false);
        return;
      }
      if (firebaseUser) {
        setUser(firebaseUser);
        await syncUserProfile(firebaseUser);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, [isDemo]);

  // Load / Setup Demo state if active
  useEffect(() => {
    if (isDemo) {
      const storedUser = localStorage.getItem("civic_demo_user");
      const storedProfile = localStorage.getItem("civic_demo_profile");
      const storedUsers = localStorage.getItem("civic_demo_all_users");
      const storedLogs = localStorage.getItem("civic_demo_logs");
      const storedNotifs = localStorage.getItem("civic_demo_notifs");

      if (storedUser && storedProfile) {
        setUser(JSON.parse(storedUser));
        setProfile(JSON.parse(storedProfile));
      } else {
        // Default admin demo profile
        const demoUser = {
          uid: "demo-admin-999",
          email: "tanmay.sa.thorat@gmail.com",
          displayName: "Tanmay Thorat (Admin)",
          photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
          emailVerified: true,
          isAnonymous: true,
        };
        const demoProfile: UserProfile = {
          uid: "demo-admin-999",
          name: "Tanmay Thorat (Admin)",
          email: "tanmay.sa.thorat@gmail.com",
          photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
          role: "admin",
          status: "active",
          points: 450,
          badges: ["Newcomer", "Active Citizen", "Civic Hero", "Community Champion"],
          isAdmin: true,
        };
        setUser(demoUser as any);
        setProfile(demoProfile);
        localStorage.setItem("civic_demo_user", JSON.stringify(demoUser));
        localStorage.setItem("civic_demo_profile", JSON.stringify(demoProfile));
      }

      setAllUsers(storedUsers ? JSON.parse(storedUsers) : defaultDemoUsers);
      setActivityLogs(storedLogs ? JSON.parse(storedLogs) : defaultDemoLogs);
      setNotifications(storedNotifs ? JSON.parse(storedNotifs) : defaultDemoNotifications);
      setLoadingAuth(false);
      setLoadingUsers(false);
    }
  }, [isDemo]);

  // Real-time Users collection sync
  useEffect(() => {
    if (isDemo) return;
    if (!user) {
      setAllUsers([]);
      setLoadingUsers(false);
      return;
    }

    setLoadingUsers(true);
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const usersList: UserProfile[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const role: UserRole = d.role || (d.isAdmin ? "admin" : "citizen");
          const status: UserStatus = d.status || "active";
          usersList.push({
            uid: docSnap.id,
            name: d.name || "Civic Member",
            email: d.email || "",
            photoURL: d.photoURL || null,
            role,
            status,
            points: d.points || 0,
            badges: d.badges || ["Newcomer"],
            createdAt: d.createdAt,
            lastLogin: d.lastLogin,
            isAdmin: role === "admin"
          });
        });
        setAllUsers(usersList);
        setLoadingUsers(false);
      },
      (error) => {
        console.warn("Realtime Users sync failed:", error);
        setLoadingUsers(false);
      }
    );
    return () => unsubscribe();
  }, [user, isDemo]);

  // Real-time Activity Logs collection sync
  useEffect(() => {
    if (isDemo) return;
    if (!user) return;

    const q = query(collection(db, "activityLogs"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logsList: ActivityLog[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          logsList.push({
            id: docSnap.id,
            action: d.action || "Activity",
            adminId: d.adminId || "",
            adminName: d.adminName || "Admin",
            adminRole: d.adminRole || "admin",
            timestamp: d.timestamp,
            details: d.details || "",
            targetType: d.targetType,
            targetId: d.targetId
          });
        });
        setActivityLogs(logsList);
      },
      (error) => {
        console.warn("Realtime ActivityLogs sync failed:", error);
      }
    );
    return () => unsubscribe();
  }, [user, isDemo]);

  // Real-time Notifications collection sync
  useEffect(() => {
    if (isDemo) return;
    if (!user) return;

    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifList: NotificationItem[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          notifList.push({
            id: docSnap.id,
            userId: d.userId || "",
            title: d.title || "",
            message: d.message || "",
            type: d.type || "info",
            read: d.read || false,
            createdAt: d.createdAt,
            issueId: d.issueId
          });
        });
        setNotifications(notifList);
      },
      (error) => {
        console.warn("Realtime Notifications sync failed:", error);
      }
    );
    return () => unsubscribe();
  }, [user, isDemo]);

  // Monitor Issues Collection in Real-Time
  useEffect(() => {
    if (isDemo) {
      const storedIssues = localStorage.getItem("civic_demo_issues");
      if (storedIssues) {
        setIssues(JSON.parse(storedIssues));
      } else {
        const defaultIssues: Issue[] = [
          {
            id: "demo-issue-1",
            title: "Pothole on Main Street",
            description: "A deep, dangerous pothole near the intersection of Main St and 5th Ave. It has been causing cars to swerve and needs urgent repair.",
            category: "Roads & Sidewalks",
            severity: 4,
            status: "reported",
            lat: 37.7749,
            lng: -122.4194,
            imageUrl: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600",
            reporterId: "demo-citizen-111",
            reporterName: "Demo Citizen",
            reporterEmail: "demo.citizen@civicconnect.org",
            createdAt: { seconds: Math.floor(Date.now() / 1000) - 86400, nanoseconds: 0 } as any,
            upvoteCount: 12,
            statusHistory: [
              { status: "reported", note: "Issue reported by citizen", timestamp: { seconds: Math.floor(Date.now() / 1000) - 86400, nanoseconds: 0 } as any }
            ]
          },
          {
            id: "demo-issue-2",
            title: "Broken Streetlight in Park",
            description: "The streetlight next to the children's playground is completely out, making the area pitch black after sunset.",
            category: "Street Lighting",
            severity: 3,
            status: "in-progress",
            lat: 37.7833,
            lng: -122.4167,
            imageUrl: "https://images.unsplash.com/photo-1509023464722-18d996393ca8?auto=format&fit=crop&q=80&w=600",
            reporterId: "user-marcus-222",
            reporterName: "Marcus Vance",
            reporterEmail: "marcus.vance@example.com",
            createdAt: { seconds: Math.floor(Date.now() / 1000) - 172800, nanoseconds: 0 } as any,
            upvoteCount: 24,
            statusHistory: [
              { status: "reported", note: "Issue reported", timestamp: { seconds: Math.floor(Date.now() / 1000) - 172800, nanoseconds: 0 } as any },
              { status: "in-progress", note: "Maintenance crew dispatched", timestamp: { seconds: Math.floor(Date.now() / 1000) - 86400, nanoseconds: 0 } as any }
            ]
          },
          {
            id: "demo-issue-3",
            title: "Graffiti on Community Center Wall",
            description: "Large graffiti on the north wall of the community center. Needs painting over to restore the clean appearance.",
            category: "Vandalism & Graffiti",
            severity: 2,
            status: "resolved",
            lat: 37.7699,
            lng: -122.4468,
            imageUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=600",
            reporterId: "user-marcus-222",
            reporterName: "Marcus Vance",
            reporterEmail: "marcus.vance@example.com",
            createdAt: { seconds: Math.floor(Date.now() / 1000) - 259200, nanoseconds: 0 } as any,
            upvoteCount: 8,
            statusHistory: [
              { status: "reported", note: "Issue reported", timestamp: { seconds: Math.floor(Date.now() / 1000) - 259200, nanoseconds: 0 } as any },
              { status: "resolved", note: "Graffiti has been safely cleaned and repainted by the public works department.", timestamp: { seconds: Math.floor(Date.now() / 1000) - 43200, nanoseconds: 0 } as any }
            ]
          }
        ];
        setIssues(defaultIssues);
        localStorage.setItem("civic_demo_issues", JSON.stringify(defaultIssues));
      }
      setLoadingIssues(false);
      return;
    }

    setLoadingIssues(true);
    const q = query(collection(db, "issues"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const issuesList: Issue[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          issuesList.push({
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
            reporterEmail: data.reporterEmail,
            createdAt: data.createdAt,
            upvoteCount: data.upvoteCount || 0,
            aiCategory: data.aiCategory,
            aiSeverity: data.aiSeverity,
            aiDescription: data.aiDescription,
            statusHistory: data.statusHistory || [],
            updatedBy: data.updatedBy,
            updatedAt: data.updatedAt,
            remarks: data.remarks
          });
        });
        setIssues(issuesList);
        setLoadingIssues(false);
      },
      (error) => {
        console.error("Realtime Issues Sync failed:", error);
        handleFirestoreError(error, OperationType.LIST, "issues");
        setLoadingIssues(false);
      }
    );

    return () => unsubscribe();
  }, [user, isDemo]);

  // Synchronize User profile from Auth to Firestore
  const syncUserProfile = async (firebaseUser: FirebaseUser) => {
    const userDocRef = doc(db, "users", firebaseUser.uid);
    try {
      const userDocSnap = await getDoc(userDocRef);
      const isAdminEmail = firebaseUser.email === "tanmay.sa.thorat@gmail.com";
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const role: UserRole = userData.role || (userData.isAdmin || isAdminEmail ? "admin" : "citizen");
        const status: UserStatus = userData.status || "active";
        const currentPoints = userData.points || 0;
        
        const updatedBadges: string[] = ["Newcomer"];
        if (currentPoints >= 50) updatedBadges.push("Active Citizen");
        if (currentPoints >= 150) updatedBadges.push("Civic Hero");
        if (currentPoints >= 300) updatedBadges.push("Community Champion");

        const profileData: UserProfile = {
          uid: firebaseUser.uid,
          name: userData.name || firebaseUser.displayName || "Civic Member",
          email: firebaseUser.email || userData.email || "",
          photoURL: firebaseUser.photoURL || userData.photoURL || null,
          role,
          status,
          points: currentPoints,
          badges: updatedBadges,
          createdAt: userData.createdAt || serverTimestamp(),
          lastLogin: serverTimestamp(),
          isAdmin: role === "admin",
        };
        setProfile(profileData);
        
        await updateDoc(userDocRef, { 
          lastLogin: serverTimestamp(),
          role,
          status,
          email: firebaseUser.email || userData.email || "",
          photoURL: firebaseUser.photoURL || userData.photoURL || null,
          badges: updatedBadges 
        });

        if (role === "admin" || role === "moderator") {
          try {
            await addDoc(collection(db, "activityLogs"), {
              action: "Admin Login",
              adminId: firebaseUser.uid,
              adminName: profileData.name,
              adminRole: role,
              timestamp: serverTimestamp(),
              details: `${profileData.name} (${role}) signed into Admin session`,
              targetType: "user",
              targetId: firebaseUser.uid
            });
          } catch (logErr) {
            console.warn("Failed to write Admin Login to activityLogs:", logErr);
          }
        }
      } else {
        // Create new Profile with Enterprise schema
        const initialRole: UserRole = isAdminEmail ? "admin" : "citizen";
        const initialProfile: UserProfile = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || "Civic Member",
          email: firebaseUser.email || "",
          photoURL: firebaseUser.photoURL || null,
          role: initialRole,
          status: "active",
          points: 0,
          badges: ["Newcomer"],
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          isAdmin: initialRole === "admin",
        };
        await setDoc(userDocRef, initialProfile);
        setProfile(initialProfile);

        if (initialRole === "admin") {
          try {
            await addDoc(collection(db, "activityLogs"), {
              action: "Admin Login",
              adminId: firebaseUser.uid,
              adminName: initialProfile.name,
              adminRole: "admin",
              timestamp: serverTimestamp(),
              details: `${initialProfile.name} (admin) signed in for first time`,
              targetType: "user",
              targetId: firebaseUser.uid
            });
          } catch (logErr) {
            console.warn("Failed to write Admin Login to activityLogs:", logErr);
          }
        }
      }
    } catch (error) {
      console.error("Sync User Profile failed:", error);
      handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
    }
  };

  // Sign In
  const signIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Sign-in failed:", error);
      if (error && (error.code === "auth/popup-blocked" || error.message?.includes("popup-blocked"))) {
        setAuthError("popup-blocked");
      } else {
        setAuthError(error?.message || "Authentication failed. Please check your network or browser settings.");
      }
    }
  };

  // Sign In Demo Mode with customizable Role
  const signInDemo = (role: UserRole = "admin") => {
    setAuthError(null);
    setIsDemo(true);
    localStorage.setItem("civic_is_demo", "true");

    const uid = role === "admin" ? "demo-admin-999" : role === "moderator" ? "demo-mod-888" : "demo-citizen-111";
    const name = role === "admin" ? "Tanmay Thorat (Admin)" : role === "moderator" ? "Sarah Jenkins (Moderator)" : "Demo Citizen";
    const email = role === "admin" ? "tanmay.sa.thorat@gmail.com" : role === "moderator" ? "mod.sarah@civicconnect.org" : "demo.citizen@civicconnect.org";

    const demoUser = {
      uid,
      email,
      displayName: name,
      photoURL: role === "admin" ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200" : null,
      emailVerified: true,
      isAnonymous: true,
    };

    const demoProfile: UserProfile = {
      uid: demoUser.uid,
      name: demoUser.displayName,
      email: demoUser.email,
      photoURL: demoUser.photoURL,
      role,
      status: "active",
      points: role === "admin" ? 450 : role === "moderator" ? 210 : 85,
      badges: role === "admin" ? ["Newcomer", "Active Citizen", "Civic Hero", "Community Champion"] : ["Newcomer", "Active Citizen"],
      isAdmin: role === "admin",
    };

    setUser(demoUser as any);
    setProfile(demoProfile);
    localStorage.setItem("civic_demo_user", JSON.stringify(demoUser));
    localStorage.setItem("civic_demo_profile", JSON.stringify(demoProfile));
  };

  // Sign Out
  const logOut = async () => {
    if (isDemo) {
      setIsDemo(false);
      localStorage.removeItem("civic_is_demo");
      localStorage.removeItem("civic_demo_user");
      localStorage.removeItem("civic_demo_profile");
      setUser(null);
      setProfile(null);
      return;
    }
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign-out failed:", error);
    }
  };

  // Log Activity Audit Trail Helper
  const logActivity = async (action: string, details: string, targetType?: string, targetId?: string) => {
    const adminId = profile?.uid || user?.uid || "system";
    const adminName = profile?.name || "Admin";
    const adminRole = profile?.role || "admin";

    const logItem: ActivityLog = {
      id: `log-${Date.now()}`,
      action,
      adminId,
      adminName,
      adminRole,
      timestamp: isDemo ? { seconds: Math.floor(Date.now() / 1000) } : serverTimestamp(),
      details,
      targetType,
      targetId
    };

    if (isDemo) {
      const updatedLogs = [logItem, ...activityLogs];
      setActivityLogs(updatedLogs);
      localStorage.setItem("civic_demo_logs", JSON.stringify(updatedLogs));
      return;
    }

    try {
      await addDoc(collection(db, "activityLogs"), {
        action,
        adminId,
        adminName,
        adminRole,
        timestamp: serverTimestamp(),
        details,
        targetType: targetType || null,
        targetId: targetId || null
      });
    } catch (err) {
      console.error("Failed to log activity:", err);
    }
  };

  // Dispatch Citizen Notification Helper
  const sendNotification = async (
    userId: string, 
    title: string, 
    message: string, 
    type: NotificationItem["type"], 
    issueId?: string
  ) => {
    const notifItem: NotificationItem = {
      id: `notif-${Date.now()}`,
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: isDemo ? { seconds: Math.floor(Date.now() / 1000) } : serverTimestamp(),
      issueId
    };

    if (isDemo) {
      const updatedNotifs = [notifItem, ...notifications];
      setNotifications(updatedNotifs);
      localStorage.setItem("civic_demo_notifs", JSON.stringify(updatedNotifs));
      return;
    }

    try {
      await addDoc(collection(db, "notifications"), {
        userId,
        title,
        message,
        type,
        read: false,
        createdAt: serverTimestamp(),
        issueId: issueId || null
      });
    } catch (err) {
      console.error("Failed to send notification:", err);
    }
  };

  // Mark notification read
  const markNotificationRead = async (notificationId: string) => {
    if (isDemo) {
      const updatedNotifs = notifications.map(n => n.id === notificationId ? { ...n, read: true } : n);
      setNotifications(updatedNotifs);
      localStorage.setItem("civic_demo_notifs", JSON.stringify(updatedNotifs));
      return;
    }
    try {
      const notifRef = doc(db, "notifications", notificationId);
      await updateDoc(notifRef, { read: true });
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  // Award Points & Badges helper
  const awardPoints = async (uid: string, amount: number) => {
    if (isDemo) {
      if (profile && user && uid === user.uid) {
        const newPoints = (profile.points || 0) + amount;
        const updatedBadges: string[] = ["Newcomer"];
        if (newPoints >= 50) updatedBadges.push("Active Citizen");
        if (newPoints >= 150) updatedBadges.push("Civic Hero");
        if (newPoints >= 300) updatedBadges.push("Community Champion");

        const updatedProfile = {
          ...profile,
          points: newPoints,
          badges: updatedBadges,
        };
        setProfile(updatedProfile);
        localStorage.setItem("civic_demo_profile", JSON.stringify(updatedProfile));
      }
      return;
    }

    try {
      const userDocRef = doc(db, "users", uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const currentPoints = userData.points || 0;
        const newPoints = currentPoints + amount;
        
        const updatedBadges: string[] = ["Newcomer"];
        if (newPoints >= 50) updatedBadges.push("Active Citizen");
        if (newPoints >= 150) updatedBadges.push("Civic Hero");
        if (newPoints >= 300) updatedBadges.push("Community Champion");

        await updateDoc(userDocRef, {
          points: newPoints,
          badges: updatedBadges
        });

        if (user && user.uid === uid) {
          setProfile({
            ...profile!,
            points: newPoints,
            badges: updatedBadges,
          });
        }
      }
    } catch (error) {
      console.error("Failed to update user profile rewards:", error);
    }
  };

  // Helper for client-side image compression
  const compressImage = (file: File, maxWidth = 1280, maxHeight = 1280, quality = 0.75): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith("image/")) {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            quality
          );
        };
        img.onerror = () => resolve(file);
        img.src = event.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  // Report a new Issue
  const reportNewIssue = async (
    title: string,
    description: string,
    category: string,
    severity: number,
    lat: number,
    lng: number,
    imageFile: File,
    videoFile?: File | null,
    aiCategory?: string,
    aiSeverity?: number,
    aiDescription?: string,
    onUploadProgress?: (progress: number, stage: string) => void
  ): Promise<string> => {
    if (!user) {
      const now = Date.now();
      const tenMinutesAgo = now - 10 * 60 * 1000;
      const activeSubmissions = guestSubmissionTimestamps.filter(t => t > tenMinutesAgo);
      if (activeSubmissions.length >= 3) {
        throw new Error("You've submitted a few reports already — sign in to keep reporting without limits");
      }
    }

    if (isDemo) {
      const issueId = `demo-issue-${Date.now()}`;
      let imageUrl = "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600";
      
      try {
        if (imageFile) {
          imageUrl = URL.createObjectURL(imageFile);
        }
      } catch (err) {
        console.error("Failed to create object URL for demo image:", err);
      }

      let videoUrl = "";
      try {
        if (videoFile) {
          videoUrl = URL.createObjectURL(videoFile);
        }
      } catch (err) {
        console.error("Failed to create object URL for demo video:", err);
      }

      const newIssue: Issue = {
        id: issueId,
        title,
        description,
        category,
        severity,
        status: "reported",
        lat,
        lng,
        imageUrl,
        reporterId: user ? user.uid : "demo-guest",
        reporterName: profile ? profile.name : "Community member",
        reporterEmail: user?.email || undefined,
        createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
        upvoteCount: 0,
        statusHistory: [
          {
            status: "reported",
            timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any
          }
        ]
      };

      if (aiCategory) newIssue.aiCategory = aiCategory;
      if (aiSeverity !== undefined) newIssue.aiSeverity = aiSeverity;
      if (aiDescription) newIssue.aiDescription = aiDescription;
      if (videoUrl) newIssue.videoUrl = videoUrl;

      const updatedIssues = [newIssue, ...issues];
      setIssues(updatedIssues);
      localStorage.setItem("civic_demo_issues", JSON.stringify(updatedIssues));

      if (user) {
        await awardPoints(user.uid, 10);
      } else {
        guestSubmissionTimestamps.push(Date.now());
      }
      return issueId;
    }

    if (onUploadProgress) {
      onUploadProgress(0, "Compressing photo...");
    }
    const compressedImage = await compressImage(imageFile, 800, 800, 0.6);

    if (onUploadProgress) {
      onUploadProgress(0, "Processing photo... 0%");
    }
    
    const uploadedUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onprogress = (event) => {
        if (event.lengthComputable && onUploadProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onUploadProgress(progress, `Processing photo... ${progress}%`);
        }
      };

      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          if (onUploadProgress) {
            onUploadProgress(100, "Processing photo... 100%");
          }
          resolve(reader.result);
        } else {
          reject(new Error("Failed to convert image to base64"));
        }
      };

      reader.onerror = () => reject(new Error("Failed to read compressed image"));
      reader.readAsDataURL(compressedImage);
    });

    if (onUploadProgress) {
      onUploadProgress(100, "Saving report...");
    }
    const issueCollectionRef = collection(db, "issues");
    const newIssueRef = doc(issueCollectionRef);
    const issueId = newIssueRef.id;

    const newIssue: Issue = {
      id: issueId,
      title,
      description,
      category: category || "Other Civic Issue",
      severity: severity || 3,
      status: "reported",
      lat,
      lng,
      imageUrl: uploadedUrl,
      reporterId: user ? user.uid : "guest-user",
      reporterName: profile ? profile.name : "Community member",
      reporterEmail: user?.email || undefined,
      createdAt: serverTimestamp(),
      upvoteCount: 0,
      statusHistory: [
        {
          status: "reported",
          timestamp: Timestamp.now()
        }
      ]
    };

    try {
      await setDoc(newIssueRef, newIssue);
      // Dual-write to reports collection for full schema compatibility
      try {
        await setDoc(doc(db, "reports", issueId), newIssue);
      } catch (err) {
        console.warn("Dual write to /reports collection skipped or prohibited by security rules:", err);
      }
      
      if (user) {
        await awardPoints(user.uid, 10);
      } else {
        guestSubmissionTimestamps.push(Date.now());
      }

      // Background Gemini classification
      (async () => {
        try {
          if (aiCategory && aiSeverity !== undefined) {
            await updateDoc(newIssueRef, {
              category: category,
              severity: severity,
              aiCategory,
              aiSeverity,
              aiDescription: aiDescription || "Auto-categorized by AI"
            });
            return;
          }

          const response = await fetch("/api/gemini/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image: uploadedUrl,
              title,
              description
            })
          });

          if (!response.ok) {
            throw new Error("Failed to analyze image via backend");
          }

          const data = await response.json();
          const categoryMapping: { [key: string]: string } = {
            "pothole": "Pothole / Road Damage",
            "road-damage": "Pothole / Road Damage",
            "garbage": "Trash / Litter Accumulation",
            "streetlight": "Streetlight / Power Outage",
            "waterlogging": "Water Leak / Drainage",
            "other": "Other Civic Issue"
          };
          const mappedCategory = categoryMapping[data.category] || data.category || "Other Civic Issue";
          const validatedSeverity = typeof data.severity === "number" ? Math.min(5, Math.max(1, data.severity)) : 3;

          await updateDoc(newIssueRef, {
            category: mappedCategory,
            severity: validatedSeverity,
            aiCategory: data.category || mappedCategory,
            aiSeverity: validatedSeverity,
            aiDescription: data.aiDescription || "Auto-categorized by AI"
          });
        } catch (err) {
          console.warn("Background Gemini categorization failed:", err);
        }
      })();

      return issueId;
    } catch (error) {
      console.error("Error creating issue:", error);
      handleFirestoreError(error, OperationType.CREATE, `issues/${issueId}`);
    }
  };

  // Upvote an Issue
  const upvote = async (issueId: string) => {
    if (!user || !profile) return;
    
    const storageKey = `upvoted_${user.uid}_${issueId}`;
    if (localStorage.getItem(storageKey)) {
      return;
    }

    if (isDemo) {
      const updatedIssues = issues.map((iss) => {
        if (iss.id === issueId) {
          return { ...iss, upvoteCount: (iss.upvoteCount || 0) + 1 };
        }
        return iss;
      });
      setIssues(updatedIssues);
      localStorage.setItem("civic_demo_issues", JSON.stringify(updatedIssues));
      localStorage.setItem(storageKey, "true");
      return;
    }

    const issueRef = doc(db, "issues", issueId);
    try {
      await updateDoc(issueRef, {
        upvoteCount: increment(1)
      });
      localStorage.setItem(storageKey, "true");
    } catch (error) {
      console.error("Error upvoting issue:", error);
      handleFirestoreError(error, OperationType.UPDATE, `issues/${issueId}`);
    }
  };

  // Change Issue Status with remarks & Firestore write
  const changeStatus = async (issueId: string, newStatus: IssueStatus, remarks?: string) => {
    if (!user) return;

    const updaterName = profile?.name || user.displayName || "Admin";

    if (isDemo) {
      const targetIssue = issues.find(i => i.id === issueId);
      const reporterId = targetIssue?.reporterId || "";
      const previousStatus = targetIssue?.status || "";

      const updatedIssues = issues.map((iss) => {
        if (iss.id === issueId) {
          return {
            ...iss,
            status: newStatus,
            updatedBy: updaterName,
            updatedAt: { seconds: Math.floor(Date.now() / 1000) },
            remarks: remarks || iss.remarks,
            statusHistory: [
              ...(iss.statusHistory || []),
              {
                status: newStatus,
                timestamp: { seconds: Math.floor(Date.now() / 1000) },
                note: remarks || `Status updated to ${newStatus}`,
                updatedBy: user.uid,
                updatedByName: updaterName,
                remarks
              }
            ]
          };
        }
        return iss;
      });

      setIssues(updatedIssues);
      localStorage.setItem("civic_demo_issues", JSON.stringify(updatedIssues));

      if (newStatus === "resolved" && previousStatus !== "resolved" && reporterId) {
        await awardPoints(reporterId, 15);
      }

      await logActivity(
        `Report Status Updated to ${newStatus.toUpperCase()}`,
        `Changed status of '${targetIssue?.title || issueId}' to ${newStatus}. ${remarks ? `Remarks: ${remarks}` : ""}`,
        "issue",
        issueId
      );

      if (reporterId) {
        const notifTitles: Record<string, string> = {
          "verified": "Report Verified",
          "in-progress": "Work Started on Report",
          "resolved": "Report Marked Resolved",
          "rejected": "Report Reviewed & Closed"
        };
        const notifTypes: Record<string, NotificationItem["type"]> = {
          "verified": "verified",
          "in-progress": "in-progress",
          "resolved": "resolved",
          "rejected": "rejected"
        };
        await sendNotification(
          reporterId,
          notifTitles[newStatus] || "Report Updated",
          `Your reported issue '${targetIssue?.title}' has been updated to ${newStatus}. ${remarks || ""}`,
          notifTypes[newStatus] || "info",
          issueId
        );
      }
      return;
    }

    const issueRef = doc(db, "issues", issueId);
    try {
      const issueSnap = await getDoc(issueRef);
      let reporterId = "";
      let previousStatus = "";
      let title = "";
      if (issueSnap.exists()) {
        const data = issueSnap.data();
        reporterId = data.reporterId || "";
        previousStatus = data.status || "";
        title = data.title || "";
      }

      await updateDoc(issueRef, {
        status: newStatus,
        updatedBy: updaterName,
        updatedAt: serverTimestamp(),
        remarks: remarks || null,
        statusHistory: arrayUnion({
          status: newStatus,
          timestamp: Timestamp.now(),
          note: remarks || `Status updated to ${newStatus}`,
          updatedBy: user.uid,
          updatedByName: updaterName,
          remarks: remarks || null
        })
      });

      if (newStatus === "resolved" && previousStatus !== "resolved" && reporterId) {
        await awardPoints(reporterId, 15);
      }

      await logActivity(
        `Report Status Updated to ${newStatus.toUpperCase()}`,
        `Changed status of '${title || issueId}' to ${newStatus}. ${remarks ? `Remarks: ${remarks}` : ""}`,
        "issue",
        issueId
      );

      if (reporterId) {
        await sendNotification(
          reporterId,
          `Report Updated to ${newStatus}`,
          `Your reported issue '${title}' has been updated to ${newStatus}. ${remarks || ""}`,
          newStatus === "rejected" ? "rejected" : newStatus === "resolved" ? "resolved" : "info",
          issueId
        );
      }
    } catch (error) {
      console.error("Error updating issue status:", error);
      handleFirestoreError(error, OperationType.UPDATE, `issues/${issueId}`);
    }
  };

  // Reject Issue helper
  const rejectIssue = async (issueId: string, remarks?: string) => {
    await changeStatus(issueId, "rejected", remarks || "Report rejected after administrative review.");
  };

  // Delete Issue helper
  const deleteIssue = async (issueId: string) => {
    if (!user) return;

    if (isDemo) {
      const target = issues.find(i => i.id === issueId);
      const updated = issues.filter(i => i.id !== issueId);
      setIssues(updated);
      localStorage.setItem("civic_demo_issues", JSON.stringify(updated));
      await logActivity(
        "Report Deleted",
        `Deleted issue report '${target?.title || issueId}'`,
        "issue",
        issueId
      );
      return;
    }

    try {
      const issueRef = doc(db, "issues", issueId);
      await deleteDoc(issueRef);
      await logActivity("Report Deleted", `Deleted issue report ${issueId}`, "issue", issueId);
    } catch (error) {
      console.error("Error deleting issue:", error);
      handleFirestoreError(error, OperationType.DELETE, `issues/${issueId}`);
    }
  };

  // Verify Issue helper
  const verifyIssue = async (issueId: string) => {
    await changeStatus(issueId, "verified", "Issue verified by administrator.");
  };

  // User Management Actions
  const updateUserRole = async (uid: string, newRole: UserRole) => {
    if (isDemo) {
      const updatedUsers = allUsers.map(u => u.uid === uid ? { ...u, role: newRole, isAdmin: newRole === "admin" } : u);
      setAllUsers(updatedUsers);
      localStorage.setItem("civic_demo_all_users", JSON.stringify(updatedUsers));
      
      if (profile && profile.uid === uid) {
        const updatedSelf = { ...profile, role: newRole, isAdmin: newRole === "admin" };
        setProfile(updatedSelf);
        localStorage.setItem("civic_demo_profile", JSON.stringify(updatedSelf));
      }
      await logActivity("User Role Updated", `Changed role of user ${uid} to ${newRole.toUpperCase()}`, "user", uid);
      return;
    }

    try {
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, {
        role: newRole,
        isAdmin: newRole === "admin"
      });
      await logActivity("User Role Updated", `Changed role of user ${uid} to ${newRole.toUpperCase()}`, "user", uid);
    } catch (error) {
      console.error("Error updating user role:", error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const toggleUserStatus = async (uid: string, newStatus: UserStatus) => {
    if (isDemo) {
      const updatedUsers = allUsers.map(u => u.uid === uid ? { ...u, status: newStatus } : u);
      setAllUsers(updatedUsers);
      localStorage.setItem("civic_demo_all_users", JSON.stringify(updatedUsers));
      await logActivity("User Status Updated", `Set user ${uid} account status to ${newStatus.toUpperCase()}`, "user", uid);
      return;
    }

    try {
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, { status: newStatus });
      await logActivity("User Status Updated", `Set user ${uid} account status to ${newStatus.toUpperCase()}`, "user", uid);
    } catch (error) {
      console.error("Error updating user status:", error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const deleteUserAccount = async (uid: string) => {
    if (isDemo) {
      const updatedUsers = allUsers.filter(u => u.uid !== uid);
      setAllUsers(updatedUsers);
      localStorage.setItem("civic_demo_all_users", JSON.stringify(updatedUsers));
      await logActivity("User Account Deleted", `Deleted user account ${uid}`, "user", uid);
      return;
    }

    try {
      const userRef = doc(db, "users", uid);
      await deleteDoc(userRef);
      await logActivity("User Account Deleted", `Deleted user account ${uid}`, "user", uid);
    } catch (error) {
      console.error("Error deleting user document:", error);
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
    }
  };

  const updateUserProfileData = async (uid: string, data: Partial<UserProfile>) => {
    if (isDemo) {
      const updatedUsers = allUsers.map(u => u.uid === uid ? { ...u, ...data } : u);
      setAllUsers(updatedUsers);
      localStorage.setItem("civic_demo_all_users", JSON.stringify(updatedUsers));
      if (profile && profile.uid === uid) {
        const updatedSelf = { ...profile, ...data };
        setProfile(updatedSelf);
        localStorage.setItem("civic_demo_profile", JSON.stringify(updatedSelf));
      }
      return;
    }

    try {
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, data as any);
      if (profile && profile.uid === uid) {
        setProfile({ ...profile, ...data });
      }
    } catch (error) {
      console.error("Error updating user profile data:", error);
    }
  };

  return (
    <CivicContext.Provider
      value={{
        user,
        profile,
        issues,
        allUsers,
        activityLogs,
        notifications,
        loadingAuth,
        loadingIssues,
        loadingUsers,
        authError,
        isDemo,
        setAuthError,
        signIn,
        signInDemo,
        logOut,
        reportNewIssue,
        upvote,
        changeStatus,
        verifyIssue,
        rejectIssue,
        deleteIssue,
        updateUserRole,
        toggleUserStatus,
        deleteUserAccount,
        updateUserProfileData,
        sendNotification,
        markNotificationRead,
        logActivity
      }}
    >
      {children}
    </CivicContext.Provider>
  );
};
