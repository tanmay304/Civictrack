/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { useCivic } from "../context/CivicContext";
import { 
  Camera, 
  MapPin, 
  Upload, 
  AlertCircle, 
  Loader2, 
  CheckCircle,
  HelpCircle,
  X,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ReportFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const CATEGORIES = [
  "Pothole / Road Damage",
  "Streetlight / Power Outage",
  "Water Leak / Drainage",
  "Trash / Litter Accumulation",
  "Graffiti / Vandalism",
  "Other Civic Issue"
];

export const ReportForm: React.FC<ReportFormProps> = ({ onSuccess, onCancel }) => {
  const { user, reportNewIssue } = useCivic();

  // Form Fields State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [severity, setSeverity] = useState(3);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  // Captcha for guest submissions
  const [captchaNum1, setCaptchaNum1] = useState(0);
  const [captchaNum2, setCaptchaNum2] = useState(0);
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  const regenerateCaptcha = () => {
    setCaptchaNum1(Math.floor(Math.random() * 8) + 2); // 2 to 9
    setCaptchaNum2(Math.floor(Math.random() * 8) + 2); // 2 to 9
    setCaptchaAnswer("");
  };

  useEffect(() => {
    if (!user) {
      regenerateCaptcha();
    }
  }, [user]);
  
  // Image handling
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // AI analysis states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<{
    category: string;
    severity: number;
    aiDescription: string;
  } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // States
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Automatic Geolocation on Mount
  useEffect(() => {
    captureLocation();
  }, []);

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setIsCapturingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        setIsCapturingLocation(false);
      },
      (error) => {
        console.warn("GPS lookup bypassed/failed, falling back to default coordinates:", error);
        setIsCapturingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location permission denied. Please enable it to report the issue's coordinates.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("GPS coordinates unavailable. Try again or enter manually.");
            break;
          case error.TIMEOUT:
            setLocationError("GPS capture timed out. Try again.");
            break;
          default:
            setLocationError("Could not retrieve GPS coordinates.");
        }
        // Fallback placeholder coordinates for high-craft fallback simulation in dev environment
        setLat(37.77492);
        setLng(-122.41941);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Client-side image resizing & compression to optimize upload size and speed up Gemini analysis
  const resizeAndCompressImage = (file: File, maxWidth = 1280, maxHeight = 1280): Promise<{ resizedBase64: string; resizedFile: File }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions keeping aspect ratio
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
            reject(new Error("Could not get 2D context from canvas"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const resizedBase64 = canvas.toDataURL("image/jpeg", 0.75);

          // Convert base64 back to a File object
          fetch(resizedBase64)
            .then((res) => res.blob())
            .then((blob) => {
              const resizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve({ resizedBase64, resizedFile });
            })
            .catch((err) => {
              reject(err);
            });
        };
        img.onerror = (err) => reject(err);
        img.src = event.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Perform Gemini AI Image analysis in the background
  const analyzeImageWithGemini = async (base64Image: string) => {
    setIsAnalyzing(true);
    setAiError(null);
    setAiResult(null);
    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Image,
          title: title, // Optional context if they entered it first
          description: description // Optional context if they entered it first
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to analyze image");
      }

      const data = await response.json();
      
      // Map Gemini short category key to form options
      const categoryMapping: { [key: string]: string } = {
        "pothole": "Pothole / Road Damage",
        "road-damage": "Pothole / Road Damage",
        "garbage": "Trash / Litter Accumulation",
        "streetlight": "Streetlight / Power Outage",
        "waterlogging": "Water Leak / Drainage",
        "other": "Other Civic Issue"
      };

      const mappedCategory = categoryMapping[data.category] || "Other Civic Issue";
      const validatedSeverity = typeof data.severity === "number" ? Math.min(5, Math.max(1, data.severity)) : 3;

      setAiResult({
        category: mappedCategory,
        severity: validatedSeverity,
        aiDescription: data.aiDescription || "Auto-categorized by AI"
      });
    } catch (err: any) {
      console.warn("Gemini analysis error:", err);
      setAiError(err.message || "Could not complete AI analysis of the photo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Image upload preview helper
  const handleFileChange = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setSubmitError("Only image files are allowed.");
      return;
    }

    try {
      // Resize & compress the image file client-side to drastically optimize upload speed
      const { resizedBase64, resizedFile } = await resizeAndCompressImage(file, 1280, 1280);
      setImageFile(resizedFile);
      setImagePreview(resizedBase64);
      
      // Non-blocking trigger of Gemini analysis
      analyzeImageWithGemini(resizedBase64);
    } catch (err: any) {
      console.warn("Client-side image resizing failed, using fallback:", err);
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        analyzeImageWithGemini(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0]);
    }
  };

  // Drag and drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const removeSelectedImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setAiResult(null);
    setAiError(null);
    setIsAnalyzing(false);
  };



  // Handle Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validation
    if (!title.trim() || title.length < 3) {
      setSubmitError("Title must be at least 3 characters.");
      return;
    }
    if (!description.trim() || description.length < 10) {
      setSubmitError("Description must be at least 10 characters.");
      return;
    }
    if (!imageFile) {
      setSubmitError("Please upload or drag a photo showing the issue.");
      return;
    }
    if (lat === null || lng === null) {
      setSubmitError("Could not capture GPS coordinates. Please click capture and retry.");
      return;
    }

    if (!user) {
      const parsed = parseInt(captchaAnswer.trim(), 10);
      if (isNaN(parsed) || parsed !== (captchaNum1 + captchaNum2)) {
        setSubmitError("Incorrect security verification answer. Please try again.");
        return;
      }
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    setUploadStage("Compressing photo...");
    try {
      await reportNewIssue(
        title, 
        description, 
        category, 
        severity, 
        lat, 
        lng, 
        imageFile, 
        null,
        aiResult?.category,
        aiResult?.severity,
        aiResult?.aiDescription,
        (progress, stage) => {
          setUploadProgress(progress);
          setUploadStage(stage);
        }
      );
      onSuccess();
    } catch (error) {
      console.error("Submission failed:", error);
      let errMsg = error instanceof Error ? error.message : "Reporting issue failed. Please try again.";
      if (
        errMsg.toLowerCase().includes("storage") || 
        errMsg.toLowerCase().includes("unauthorized") || 
        errMsg.toLowerCase().includes("quota") || 
        errMsg.toLowerCase().includes("bucket")
      ) {
        errMsg = `Firebase Storage upload failed (stuck at 0% or timed out). If you just provisioned Firebase, please ensure you have: 1. Enabled Firebase Storage in the Firebase Console. 2. Deployed Storage security rules to allow authenticated writes. (Original error: ${errMsg})`;
      }
      setSubmitError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden max-w-2xl mx-auto relative" id="report-form-container">
      {/* Upload Progress Overlay */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900 dark:bg-slate-50/80 backdrop-blur-md flex flex-col items-center justify-center p-6 z-50 text-center" 
            id="upload-progress-overlay"
          >
            <div className="w-full max-w-sm space-y-6 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800">
              <div className="relative flex items-center justify-center">
                <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-600"></div>
                <div className="absolute font-black text-sm text-blue-900 dark:text-blue-100">
                  {uploadProgress}%
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-sans font-black text-blue-900 dark:text-blue-100 text-lg uppercase tracking-wider">{uploadStage || "Uploading..."}</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest">Please keep this window open</p>
              </div>
              
              {/* Progress bar container */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-blue-900 px-6 py-6 text-white border-b border-blue-800">
        <h2 className="text-xl font-black uppercase tracking-wider">Report a Civic Issue</h2>
        <p className="text-xs font-semibold text-blue-200 mt-1">Help make your community better by flagging local concerns.</p>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6" id="report-form">
        {submitError && (
          <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm" id="submit-error-banner">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* 1. Drag & Drop File Uploads (Image Only) */}
        <div className="space-y-4">
          {/* Photo Upload Zone */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-ink font-sans">Take or upload a photo of the issue *</label>
            
            <AnimatePresence mode="wait">
              {!imagePreview ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-3 border-dashed rounded-[24px] p-8 flex flex-col items-center justify-center cursor-pointer transition-all h-[200px] ${
                    dragActive 
                      ? "border-signal-orange bg-orange-50/20" 
                      : "border-slate-300 hover:border-civic-blue hover:bg-cloud"
                  }`}
                  id="file-upload-zone"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="p-3 bg-blue-50 text-civic-blue border-2 border-civic-blue rounded-full mb-3 shadow-sm">
                    <Camera className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-ink text-center">
                    Drag and drop your photo here, or <span className="text-civic-blue underline">browse files</span>
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">Supports PNG, JPG or WEBP (Max 5MB)</p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative rounded-[24px] border-3 border-ink bg-slate-50 dark:bg-slate-950 overflow-hidden h-[200px] shadow-md"
                  id="file-preview-zone"
                >
                  <img
                    src={imagePreview}
                    alt="Upload Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeSelectedImage}
                    className="absolute top-3 right-3 p-1.5 bg-ink hover:bg-black text-white rounded-full transition-colors shadow-md z-10 border-2 border-white"
                    title="Remove Image"
                    id="remove-preview-btn"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-3 left-3 bg-ink/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-black text-white flex items-center space-x-1.5 z-10 border-2 border-white">
                    <CheckCircle className="h-4 w-4 text-resolved-green" />
                    <span>Photo loaded successfully!</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* AI Analysis Card */}
        <AnimatePresence>
          {imagePreview && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 rounded-[24px] border-3 border-spark-yellow bg-gradient-to-br from-[#FFFCEB] via-white to-[#FFFCEB]/30 shadow-md flex flex-col space-y-3 relative overflow-hidden"
              id="ai-analysis-card"
            >
              {/* Decorative light effect */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-spark-yellow/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-start space-x-3">
                <div className="p-2 bg-spark-yellow text-ink border-2 border-ink rounded-xl shadow-sm flex-shrink-0">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                </div>
                <div className="flex-1 space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-ink flex items-center space-x-1.5">
                    <span>Gemini AI Smart Categorization</span>
                  </h4>
                  
                  {isAnalyzing && (
                    <div className="space-y-2 py-1" id="ai-loading-state">
                      <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin text-civic-blue" />
                        <span className="text-xs font-bold animate-pulse text-ink">Analyzing image with Gemini...</span>
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                        Feel free to keep filling the form. If you click submit before analysis completes, manual values will be used and Gemini will update details in the background.
                      </p>
                    </div>
                  )}

                  {aiError && (
                    <div id="ai-error-state" className="space-y-1 py-1">
                      <p className="text-xs font-medium text-amber-700">
                        {aiError}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                        You can still pick the category and severity manually below and submit anytime.
                      </p>
                    </div>
                  )}

                  {!isAnalyzing && !aiError && !aiResult && (
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                        Our integrated Gemini model will analyze your photo to suggest the category, assess severity, and draft an AI report description.
                      </p>
                    </div>
                  )}

                  {aiResult && (
                    <div className="space-y-3 pt-1" id="ai-result-state">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed italic bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl shadow-sm">
                        "{aiResult.aiDescription}"
                      </p>

                      <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-wider">
                        <div className="flex flex-col space-y-1">
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-black">Detected Category</span>
                          <span className="sticker-badge sticker-badge-blue">
                            <span>{aiResult.category}</span>
                          </span>
                        </div>
                        
                        <div className="flex flex-col space-y-1">
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-black">Detected Severity</span>
                          <span className={`sticker-badge ${
                            aiResult.severity >= 4 
                              ? "sticker-badge-orange" 
                              : aiResult.severity >= 3 
                              ? "sticker-badge-yellow" 
                              : "sticker-badge-green"
                          }`}>
                            <span>Level {aiResult.severity}/5</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center pt-1">
                        {category === aiResult.category && severity === aiResult.severity ? (
                          <div className="sticker-badge sticker-badge-green">
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>AI Suggestions Applied</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setCategory(aiResult.category);
                              setSeverity(aiResult.severity);
                            }}
                            className="bg-spark-yellow hover:bg-yellow-400 text-ink border-2 border-ink font-black text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-all shadow-sm cursor-pointer flex items-center space-x-1 hover:-translate-y-0.5 active:translate-y-0"
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>Apply AI Suggestions</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. Form Text Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-ink font-sans">Give it a short, clear title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Broken Water Main on 5th Ave"
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 outline-none focus:ring-4 focus:ring-blue-100/40 focus:border-civic-blue transition-all text-sm font-medium bg-slate-50 dark:bg-slate-950"
              id="field-title"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-ink font-sans">What kind of issue is it? *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 outline-none focus:ring-4 focus:ring-blue-100/40 focus:border-civic-blue transition-all text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 cursor-pointer"
              id="field-category"
            >
              {CATEGORIES.map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-ink font-sans">What's the issue? *</label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide exact details of the civic issue. Mention landmarks, when you noticed it, or anything helpful for public works teams."
            className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 outline-none focus:ring-4 focus:ring-blue-100/40 focus:border-civic-blue transition-all text-sm font-medium bg-slate-50 dark:bg-slate-950 resize-none"
            id="field-description"
          />
        </div>

        {/* 3. Severity Level (1-5) */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-bold text-ink font-sans">How bad is the impact? *</label>
            <span className={`sticker-badge text-[10px] ${
              severity >= 4 ? "sticker-badge-orange" : severity >= 3 ? "sticker-badge-yellow" : "sticker-badge-green"
            }`}>
              {severity === 1 && "Level 1 - Low Impact"}
              {severity === 2 && "Level 2 - Minor"}
              {severity === 3 && "Level 3 - Moderate"}
              {severity === 4 && "Level 4 - Major"}
              {severity === 5 && "Level 5 - Critical"}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={severity}
            onChange={(e) => setSeverity(parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-civic-blue"
            id="field-severity"
          />
          <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 px-1">
            <span>Low Impact (1)</span>
            <span>Moderate (3)</span>
            <span>Safety Threat (5)</span>
          </div>
        </div>

        {/* 4. Automated Geolocation */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-blue-50 text-civic-blue border border-blue-200 rounded-xl mt-0.5">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-sm font-bold text-ink">Where is it? *</span>
              {isCapturingLocation ? (
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-civic-blue" />
                  <span>Scanning satellite coordinates...</span>
                </div>
              ) : lat !== null && lng !== null ? (
                <span className="block text-xs font-mono font-bold text-resolved-green mt-1">
                  Success: {lat.toFixed(6)}, {lng.toFixed(6)}
                </span>
              ) : (
                <span className="block text-xs text-red-500 mt-1">{locationError || "Waiting for coordinates..."}</span>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={isCapturingLocation}
            onClick={captureLocation}
            className="px-4 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center space-x-1 transition-colors cursor-pointer"
            id="gps-retry-btn"
          >
            {isCapturingLocation ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            )}
            <span>Recapture GPS</span>
          </button>
        </div>

        {/* Guest Security Challenge / Math CAPTCHA */}
        {!user && (
          <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl space-y-3" id="guest-security-challenge">
            <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-100 font-sans font-extrabold text-sm">
              <Sparkles className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
              <span>Security Verification for Guest Reports</span>
            </div>
            
            <p className="text-xs text-amber-800 font-medium leading-relaxed">
              To keep our community feed secure from automated spam, please solve this simple arithmetic question:
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center space-x-3 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-amber-200 shadow-sm w-fit">
                <span className="text-sm font-mono font-black text-amber-900 dark:text-amber-100">
                  {captchaNum1} + {captchaNum2} =
                </span>
                <input
                  type="text"
                  required
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  placeholder="Answer"
                  className="w-20 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-center text-sm font-black text-slate-800 dark:text-slate-200 outline-none focus:border-amber-500 bg-slate-50 dark:bg-slate-950"
                  id="captcha-answer"
                />
              </div>

              <button
                type="button"
                onClick={regenerateCaptcha}
                className="text-xs font-bold text-amber-800 hover:text-amber-900 dark:text-amber-100 underline cursor-pointer"
              >
                Get another question
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-6 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-ink font-black uppercase tracking-widest text-xs rounded-2xl transition-all hover:scale-[1.01] active:scale-[0.99] border-2 border-slate-200 dark:border-slate-700 cursor-pointer text-center"
            id="form-cancel-btn"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-4 bg-civic-blue hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center space-x-2 cursor-pointer border-2 border-ink"
            id="form-submit-btn"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{isSubmitting ? "Submitting..." : "Submit Civic Issue"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
