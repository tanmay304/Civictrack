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
import { Issue, UserProfile } from "../types";

interface CivicContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  issues: Issue[];
  loadingAuth: boolean;
  loadingIssues: boolean;
  authError: string | null;
  setAuthError: (error: string | null) => void;
  signIn: () => Promise<void>;
  signInDemo: (isAdmin: boolean) => void;
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
  changeStatus: (issueId: string, newStatus: Issue["status"]) => Promise<void>;
  verifyIssue: (issueId: string) => Promise<void>;
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
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState<boolean>(() => {
    return localStorage.getItem("civic_is_demo") === "true";
  });

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
      if (storedUser && storedProfile) {
        setUser(JSON.parse(storedUser));
        setProfile(JSON.parse(storedProfile));
      } else {
        // Default demo setup
        const demoUser = {
          uid: "demo-citizen-111",
          email: "demo.citizen@civicconnect.org",
          displayName: "Demo Citizen",
          photoURL: null,
          emailVerified: true,
          isAnonymous: true,
        };
        const demoProfile = {
          uid: "demo-citizen-111",
          name: "Demo Citizen",
          points: 25,
          badges: ["Newcomer"],
          isAdmin: false,
        };
        setUser(demoUser as any);
        setProfile(demoProfile);
        localStorage.setItem("civic_demo_user", JSON.stringify(demoUser));
        localStorage.setItem("civic_demo_profile", JSON.stringify(demoProfile));
      }
      setLoadingAuth(false);
    }
  }, [isDemo]);

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
            reporterId: "another-user-99",
            reporterName: "Sarah Jenkins",
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
            reporterId: "another-user-98",
            reporterName: "Marcus Vance",
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
        snapshot.forEach((doc) => {
          const data = doc.data();
          issuesList.push({
            id: doc.id,
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
      const isAdminEmail = firebaseUser.email === "rushabhchopda070@gmail.com";
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const currentIsAdmin = userData.isAdmin || isAdminEmail;
        const currentPoints = userData.points || 0;
        
        // Recalculate badges for existing users based on new badge tiers
        const updatedBadges: string[] = ["Newcomer"];
        if (currentPoints >= 50) updatedBadges.push("Active Citizen");
        if (currentPoints >= 150) updatedBadges.push("Civic Hero");
        if (currentPoints >= 300) updatedBadges.push("Community Champion");

        const profileData: UserProfile = {
          uid: firebaseUser.uid,
          name: userData.name || "Civic Member",
          points: currentPoints,
          badges: updatedBadges,
          isAdmin: currentIsAdmin,
        };
        setProfile(profileData);
        // Sync isAdmin and badges back to firestore
        if (userData.isAdmin !== currentIsAdmin || JSON.stringify(userData.badges) !== JSON.stringify(updatedBadges)) {
          await updateDoc(userDocRef, { isAdmin: currentIsAdmin, badges: updatedBadges });
        }
      } else {
        // Create new Profile with basic stats
        const initialProfile: UserProfile = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || "Civic Member",
          points: 0, // 0 starter points
          badges: ["Newcomer"],
          isAdmin: isAdminEmail,
        };
        await setDoc(userDocRef, initialProfile);
        setProfile(initialProfile);
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

  // Sign In Demo Mode
  const signInDemo = (isAdmin: boolean) => {
    setAuthError(null);
    setIsDemo(true);
    localStorage.setItem("civic_is_demo", "true");

    const demoUser = {
      uid: isAdmin ? "demo-admin-999" : "demo-citizen-111",
      email: isAdmin ? "rushabhchopda070@gmail.com" : "demo.citizen@civicconnect.org",
      displayName: isAdmin ? "Demo Administrator" : "Demo Citizen",
      photoURL: null,
      emailVerified: true,
      isAnonymous: true,
    };

    const demoProfile = {
      uid: demoUser.uid,
      name: demoUser.displayName,
      points: isAdmin ? 350 : 25,
      badges: isAdmin ? ["Newcomer", "Active Citizen", "Civic Hero", "Community Champion"] : ["Newcomer"],
      isAdmin: isAdmin,
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
        
        // Define badge tiers: "Newcomer" (0+ points), "Active Citizen" (50+), "Civic Hero" (150+), "Community Champion" (300+)
        const updatedBadges: string[] = ["Newcomer"];
        if (newPoints >= 50) updatedBadges.push("Active Citizen");
        if (newPoints >= 150) updatedBadges.push("Civic Hero");
        if (newPoints >= 300) updatedBadges.push("Community Champion");

        const updateData = {
          points: newPoints,
          badges: updatedBadges
        };
        await updateDoc(userDocRef, updateData);

        // Sync local profile state if this is the currently logged-in user
        if (user && user.uid === uid) {
          setProfile({
            uid,
            name: userData.name || "Civic Member",
            points: newPoints,
            badges: updatedBadges,
            isAdmin: userData.isAdmin || false
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

          // Scale maintaining aspect ratio
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
    // Guest rate-limiting (max 3 per 10 mins)
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
        reporterId: user ? user.uid : null,
        reporterName: profile ? profile.name : "Community member",
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

    // 1. Client-side image compression
    if (onUploadProgress) {
      onUploadProgress(0, "Compressing photo...");
    }
    const compressedImage = await compressImage(imageFile, 800, 800, 0.6);

    // 2. Convert compressed photo to base64 data URL with real-time FileReader progress updates
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

    // 3. Generate new Issue Reference
    if (onUploadProgress) {
      onUploadProgress(100, "Saving report...");
    }
    const issueCollectionRef = collection(db, "issues");
    const newIssueRef = doc(issueCollectionRef); // Auto-generate ID safely
    const issueId = newIssueRef.id;

    // Initially save with category and severity set to "pending"
    const newIssue: Issue = {
      id: issueId,
      title,
      description,
      category: "pending",
      severity: "pending" as any,
      status: "reported",
      lat,
      lng,
      imageUrl: uploadedUrl,
      reporterId: user ? user.uid : null,
      reporterName: profile ? profile.name : "Community member",
      createdAt: serverTimestamp(), // Match request.time rules
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
      
      // Award 10 points for reporting an issue immediately
      if (user) {
        await awardPoints(user.uid, 10);
      } else {
        guestSubmissionTimestamps.push(Date.now());
      }

      // 4. Asynchronously trigger the Gemini classification in the background
      (async () => {
        try {
          if (aiCategory && aiSeverity !== undefined) {
            // Re-use already completed analysis from preview step
            await updateDoc(newIssueRef, {
              category: category,
              severity: severity,
              aiCategory,
              aiSeverity,
              aiDescription: aiDescription || "Auto-categorized by AI"
            });
            return;
          }

          // We already have the base64 URL!
          const base64Image = uploadedUrl;

          const response = await fetch("/api/gemini/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image: base64Image,
              title,
              description
            })
          });

          if (!response.ok) {
            throw new Error("Failed to analyze image via backend");
          }

          const data = await response.json();
          
          // Map Gemini key to human friendly options
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

          // Update the same issue document in real-time
          await updateDoc(newIssueRef, {
            category: mappedCategory,
            severity: validatedSeverity,
            aiCategory: data.category || mappedCategory,
            aiSeverity: validatedSeverity,
            aiDescription: data.aiDescription || "Auto-categorized by AI"
          });
        } catch (err) {
          console.warn("Background Gemini categorization failed, falling back to manual details:", err);
          
          // Fall back gracefully to manual details so document is never stuck in "pending"
          try {
            await updateDoc(newIssueRef, {
              category: category || "Other Civic Issue",
              severity: severity || 3,
              aiDescription: "AI analysis was unavailable. Details fell back to manual input."
            });
          } catch (fallbackErr) {
            console.error("Failed to write manual fallback details:", fallbackErr);
          }
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
    
    // Simple deduplication block to prevent excessive spam within the current browser session
    const storageKey = `upvoted_${user.uid}_${issueId}`;
    if (localStorage.getItem(storageKey)) {
      console.log("Already upvoted during this session");
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
      
      // Store locally to mark as upvoted
      localStorage.setItem(storageKey, "true");
    } catch (error) {
      console.error("Error upvoting issue:", error);
      handleFirestoreError(error, OperationType.UPDATE, `issues/${issueId}`);
    }
  };

  // Change Issue Status
  const changeStatus = async (issueId: string, newStatus: Issue["status"]) => {
    if (!user) return;

    if (isDemo) {
      const targetIssue = issues.find(i => i.id === issueId);
      let reporterId = targetIssue?.reporterId || "";
      let previousStatus = targetIssue?.status || "";

      const updatedIssues = issues.map((iss) => {
        if (iss.id === issueId) {
          return {
            ...iss,
            status: newStatus,
            statusHistory: [
              ...(iss.statusHistory || []),
              {
                status: newStatus,
                timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any
              }
            ]
          };
        }
        return iss;
      });

      setIssues(updatedIssues);
      localStorage.setItem("civic_demo_issues", JSON.stringify(updatedIssues));

      if (newStatus === "resolved" && previousStatus !== "resolved" && reporterId) {
        await awardPoints(reporterId, 5);
      }
      return;
    }

    const issueRef = doc(db, "issues", issueId);
    try {
      const issueSnap = await getDoc(issueRef);
      let reporterId = "";
      let previousStatus = "";
      if (issueSnap.exists()) {
        const data = issueSnap.data();
        reporterId = data.reporterId || "";
        previousStatus = data.status || "";
      }

      await updateDoc(issueRef, {
        status: newStatus,
        statusHistory: arrayUnion({
          status: newStatus,
          timestamp: Timestamp.now()
        })
      });

      // Award +5 bonus points to the reporter if the issue reaches resolved status and was not already resolved
      if (newStatus === "resolved" && previousStatus !== "resolved" && reporterId) {
        await awardPoints(reporterId, 5);
      }
    } catch (error) {
      console.error("Error updating issue status:", error);
      handleFirestoreError(error, OperationType.UPDATE, `issues/${issueId}`);
    }
  };

  // Verify an Issue (Add verification, increment upvote, check status upgrade, award 2 points)
  const verifyIssue = async (issueId: string) => {
    if (!user || !profile) return;

    if (isDemo) {
      const targetIssue = issues.find(i => i.id === issueId);
      if (!targetIssue) return;

      const currentUpvotes = targetIssue.upvoteCount || 0;
      const currentStatus = targetIssue.status || "reported";
      
      const newUpvoteCount = currentUpvotes + 1;
      const shouldVerify = currentStatus === "reported" && newUpvoteCount >= 3;

      const updatedIssues = issues.map((iss) => {
        if (iss.id === issueId) {
          const updated: any = {
            ...iss,
            upvoteCount: newUpvoteCount
          };
          if (shouldVerify) {
            updated.status = "verified";
            updated.statusHistory = [
              ...(iss.statusHistory || []),
              {
                status: "verified",
                timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any
              }
            ];
          }
          return updated;
        }
        return iss;
      });

      setIssues(updatedIssues);
      localStorage.setItem("civic_demo_issues", JSON.stringify(updatedIssues));
      await awardPoints(user.uid, 2);
      return;
    }
    
    const issueRef = doc(db, "issues", issueId);
    const verificationRef = doc(db, "issues", issueId, "verifications", user.uid);

    try {
      // 1. Create verification document
      await setDoc(verificationRef, {
        userId: user.uid,
        userName: profile.name,
        verifiedAt: serverTimestamp()
      });

      // 2. Fetch current issue to check upvotes & status
      const issueSnap = await getDoc(issueRef);
      if (issueSnap.exists()) {
        const data = issueSnap.data();
        const currentUpvotes = data.upvoteCount || 0;
        const currentStatus = data.status || "reported";
        
        const newUpvoteCount = currentUpvotes + 1;
        const shouldVerify = currentStatus === "reported" && newUpvoteCount >= 3;

        const updateData: any = {
          upvoteCount: increment(1)
        };
        if (shouldVerify) {
          updateData.status = "verified";
          updateData.statusHistory = arrayUnion({
            status: "verified",
            timestamp: Timestamp.now()
          });
        }

        await updateDoc(issueRef, updateData);
      }

      // 3. Award 2 points to the user
      await awardPoints(user.uid, 2);
    } catch (error) {
      console.error("Verification failed:", error);
      handleFirestoreError(error, OperationType.WRITE, `issues/${issueId}/verifications/${user.uid}`);
    }
  };

  return (
    <CivicContext.Provider
      value={{
        user,
        profile,
        issues,
        loadingAuth,
        loadingIssues,
        authError,
        setAuthError,
        signIn,
        signInDemo,
        logOut,
        reportNewIssue,
        upvote,
        changeStatus,
        verifyIssue
      }}
    >
      {children}
    </CivicContext.Provider>
  );
};
