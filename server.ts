import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import "dotenv/config";

function getCleanGeminiError(error: any): string {
  if (!error) return "Failed to communicate with AI model";
  const msg = error.message || String(error);
  try {
    const trimmed = msg.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      const parsed = JSON.parse(trimmed);
      if (parsed.error?.message) {
        return parsed.error.message;
      }
    }
  } catch (e) {
    // ignore
  }
  return msg;
}

async function generateContentWithRetry(ai: any, params: any, maxRetries = 3) {
  let lastError: any = null;
  
  // Try the requested model first, then fall back to highly reliable modern flash models (gemini-2.5-flash, gemini-3.1-flash-lite)
  // We filter out duplicates and the "gemini-flash-latest" alias because it maps to gemini-3.5-flash (which shares the 20-req/day free tier quota).
  const requestedModel = params.model || "gemini-2.5-flash";
  const candidates = [requestedModel, "gemini-2.5-flash", "gemini-3.1-flash-lite"];
  const modelsToTry = Array.from(new Set(candidates));
  
  for (const model of modelsToTry) {
    if (!model) continue;
    let delay = 1000; // start with 1s delay
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini SDK] Calling generateContent with model ${model} (attempt ${attempt}/${maxRetries})...`);
        const response = await ai.models.generateContent({
          ...params,
          model: model
        });
        return response;
      } catch (err: any) {
        lastError = err;
        
        let errorMsg = "";
        try {
          if (err && err.message) {
            errorMsg = err.message;
          } else if (err) {
            errorMsg = typeof err === "object" ? JSON.stringify(err) : String(err);
          }
        } catch (e) {
          errorMsg = String(err);
        }
        
        const msg = errorMsg.toLowerCase();
        
        // Quota exhaustion (such as a 20 requests/day daily limit on the free tier) is not transient.
        // If we hit this, we should immediately switch to the next candidate model instead of waiting/retrying the same model.
        const isQuotaExceeded = msg.includes("quota") || 
                                msg.includes("limit: 20") || 
                                msg.includes("resource_exhausted") || 
                                msg.includes("billing details") ||
                                msg.includes("plan and billing");
                                
        const isRetryable = !isQuotaExceeded && (
                            msg.includes("503") || 
                            msg.includes("demand") || 
                            msg.includes("temporary") || 
                            msg.includes("unavailable") || 
                            msg.includes("overloaded") ||
                            msg.includes("rate limit") ||
                            msg.includes("429")
        );
                            
        console.log(`[Gemini SDK] Attempt ${attempt} on ${model} handled. Quota Exceeded: ${isQuotaExceeded}, Retryable: ${isRetryable}`);
        
        if (isQuotaExceeded) {
          console.log(`[Gemini SDK] Model ${model} is out of quota. Switching immediately to the next fallback model...`);
          break; // Break inner loop to try the next model immediately
        }
        
        if (!isRetryable || attempt === maxRetries) {
          break; // Don't retry this model if not retryable, or if we reached max retries
        }
        
        // Wait with exponential backoff before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  }
  
  throw lastError;
}

function getHeuristicInsights(issuesSummary: any) {
  const insights = [];
  
  // 1. Most common category insight
  const categories = issuesSummary.countsByCategory || {};
  let maxCat = "";
  let maxCount = 0;
  const total = issuesSummary.totalIssuesCount || 0;
  
  for (const cat of Object.keys(categories)) {
    if (categories[cat] > maxCount) {
      maxCount = categories[cat];
      maxCat = cat;
    }
  }
  
  if (maxCat && total > 0) {
    const percentage = Math.round((maxCount / total) * 100);
    insights.push({
      title: `${maxCat} Frequency Alert`,
      description: `${maxCat} is the most frequent issue in our neighborhood, accounting for ${maxCount} out of ${total} (${percentage}%) of all citizen reports.`,
      icon: "alert"
    });
  } else {
    insights.push({
      title: "Active Community Feed",
      description: "Our community is actively cataloging and tracking neighborhood maintenance requests. Keep up the great work!",
      icon: "success"
    });
  }
  
  // 2. Average Resolution Time insight
  const avgTimes = issuesSummary.avgResolutionTimesByCategory || {};
  let slowCat = "";
  let maxTime = 0;
  for (const cat of Object.keys(avgTimes)) {
    if (avgTimes[cat] > maxTime) {
      maxTime = avgTimes[cat];
      slowCat = cat;
    }
  }
  
  if (slowCat && maxTime > 0) {
    insights.push({
      title: `${slowCat} Operational Lead Time`,
      description: `${slowCat} requests currently take the longest to resolve, averaging ${maxTime.toFixed(1)} days to complete. Let's work with Public Works to clear these bottlenecks.`,
      icon: "clock"
    });
  } else {
    insights.push({
      title: "Operational Velocity",
      description: "Public works and volunteer teams are actively resolving community tickets. Response times remain steady across all categories.",
      icon: "trend"
    });
  }
  
  // 3. Geographic Density insight
  const clusters = issuesSummary.geographicClusters || [];
  if (clusters.length > 0) {
    const topCluster = clusters[0];
    const unresolved = topCluster.unresolvedCount || 0;
    const totalCluster = topCluster.count || 0;
    insights.push({
      title: "Geographic Report Cluster",
      description: `A significant density of neighborhood issues is concentrated around coordinates near (${topCluster.lat.toFixed(4)}, ${topCluster.lng.toFixed(4)}) with ${unresolved} out of ${totalCluster} reports currently active.`,
      icon: "globe"
    });
  } else {
    insights.push({
      title: "Even Report Distribution",
      description: "Civic reports are evenly distributed across the municipal grid, indicating no isolated problem zones or severe regional bottlenecks.",
      icon: "globe"
    });
  }

  // 4. Seasonal Volume
  insights.push({
    title: "Seasonal Civic Volume",
    description: `With a total of ${total} active reports logged, seasonal trends indicate steady public engagement and active volunteer coordination.`,
    icon: "trend"
  });

  return { insights };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload size limit for image uploads
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ limit: "20mb", extended: true }));

  // Initialize Gemini API
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API endpoint for Gemini Image analysis
  app.post("/api/gemini/analyze", async (req, res) => {
    try {
      const { image, title, description } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Image data is required" });
      }

      let mimeType = "image/jpeg";
      let base64Data = "";

      if (image.startsWith("data:")) {
        const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          base64Data = matches[2];
        } else {
          return res.status(400).json({ error: "Invalid base64 image data URI" });
        }
      } else {
        base64Data = image;
      }

      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: base64Data,
        }
      };

      const promptText = `
        You are a civic issue analyzer. Analyze the provided image of a public/neighborhood issue.
        Use any optional context:
        - Title context: ${title || "None"}
        - Description context: ${description || "None"}

        Identify:
        1. Category: Must be exactly one of: 'pothole', 'garbage', 'streetlight', 'waterlogging', 'road-damage', 'other'.
        2. Severity: Integer between 1 and 5 (1 = minor inconvenience, 5 = critical hazard / extreme public safety issue).
        3. A short one-sentence AI-generated description of what you see in the image.
      `.trim();

      const response = await generateContentWithRetry(ai, {
        model: "gemini-2.5-flash",
        contents: [
          imagePart,
          { text: promptText }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                description: 'The category of the civic issue. Must be exactly one of: "pothole", "garbage", "streetlight", "waterlogging", "road-damage", "other".',
              },
              severity: {
                type: Type.INTEGER,
                description: 'The severity of the issue, from 1 to 5.',
              },
              aiDescription: {
                type: Type.STRING,
                description: 'A short one-sentence AI-generated description of what is seen in the image.',
              }
            },
            required: ["category", "severity", "aiDescription"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response from Gemini API");
      }

      const result = JSON.parse(responseText.trim());
      res.json(result);
    } catch (error: any) {
      console.warn("Gemini analysis failed, falling back to heuristics:", error);
      
      const cleanMsg = getCleanGeminiError(error);
      const isHighDemand = cleanMsg.toLowerCase().includes("high demand") || 
                           cleanMsg.toLowerCase().includes("temporary") || 
                           cleanMsg.toLowerCase().includes("503") || 
                           cleanMsg.toLowerCase().includes("unavailable") || 
                           cleanMsg.toLowerCase().includes("overloaded");
      
      // Determine heuristic category from title & description
      let fallbackCategory = "other";
      let fallbackSeverity = 3;
      
      const { title, description } = req.body;
      const searchStr = `${title || ""} ${description || ""}`.toLowerCase();
      if (searchStr.includes("pothole") || searchStr.includes("cracks") || searchStr.includes("pavement") || searchStr.includes("asphalt") || searchStr.includes("road")) {
        fallbackCategory = "road-damage";
      } else if (searchStr.includes("garbage") || searchStr.includes("trash") || searchStr.includes("litter") || searchStr.includes("dump") || searchStr.includes("waste")) {
        fallbackCategory = "garbage";
      } else if (searchStr.includes("light") || searchStr.includes("streetlight") || searchStr.includes("lamp") || searchStr.includes("dark") || searchStr.includes("power")) {
        fallbackCategory = "streetlight";
      } else if (searchStr.includes("water") || searchStr.includes("leak") || searchStr.includes("drain") || searchStr.includes("flood") || searchStr.includes("drainage") || searchStr.includes("puddle")) {
        fallbackCategory = "waterlogging";
      }

      let friendlyMessage = "AI auto-analysis is currently offline. Please fill in the details manually.";
      if (isHighDemand) {
        friendlyMessage = "Gemini is currently experiencing high demand. You can still select the category and severity below manually.";
      } else {
        friendlyMessage = `AI auto-analysis is temporarily unavailable. You can still select the details below manually.`;
      }

      res.status(200).json({
        category: fallbackCategory,
        severity: fallbackSeverity,
        aiDescription: friendlyMessage,
        isFallback: true
      });
    }
  });

  // API endpoint for Gemini insights
  app.post("/api/gemini/insights", async (req, res) => {
    const { issuesSummary } = req.body;
    if (!issuesSummary) {
      return res.status(400).json({ error: "Issues summary is required" });
    }
    
    try {

      const promptText = `
        You are an expert civic operations analyst. Analyze the following aggregated neighborhood issue data:
        
        Total Issues: ${issuesSummary.totalIssuesCount || 0}
        
        Issues counts by Category:
        ${JSON.stringify(issuesSummary.countsByCategory || {})}
        
        Issues counts by Month:
        ${JSON.stringify(issuesSummary.countsByMonth || {})}
        
        Top Geographic Coordinates Clusters (lat,lng, total issues, unresolved issues):
        ${JSON.stringify(issuesSummary.geographicClusters || [])}
        
        Average Resolution Time in Days by Category:
        ${JSON.stringify(issuesSummary.avgResolutionTimesByCategory || {})}
        
        Tasks:
        Identify key operational patterns, trends, and bottlenecks in this data. 
        Write exactly 3 to 4 short, highly specific, and practical insights in plain, human-friendly language.
        For example:
        - Identify which category is most common and discuss its concentration/severity.
        - Identify if any specific geographic area (refer to coordinate bounds/general vicinity) has a high cluster of unresolved issues.
        - Identify which category takes the longest to resolve and suggest potential city operational delays (e.g. parts backordered or permits needed).
        
        Ensure your insights are strictly based on the provided aggregate data, using real numbers and categories.
        Do NOT predict future numbers or make claims not supported by this data.
      `.trim();

      const response = await generateContentWithRetry(ai, {
        model: "gemini-2.5-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              insights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: {
                      type: Type.STRING,
                      description: "A short specific headline for this insight (3 to 6 words)."
                    },
                    description: {
                      type: Type.STRING,
                      description: "A 1 to 2 sentence detailed analysis using specific data numbers and categories."
                    },
                    icon: {
                      type: Type.STRING,
                      description: "Visual indicator for the card. Must be exactly one of: 'alert', 'trend', 'clock', 'globe', 'success'."
                    }
                  },
                  required: ["title", "description", "icon"]
                }
              }
            },
            required: ["insights"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response from Gemini API");
      }

      const result = JSON.parse(responseText.trim());
      res.json(result);
    } catch (error: any) {
      console.warn("Gemini insights generation failed, falling back to heuristics:", error);
      const cleanMsg = getCleanGeminiError(error);
      try {
        const fallbackData = getHeuristicInsights(issuesSummary);
        res.json(fallbackData);
      } catch (fallbackErr: any) {
        res.status(500).json({ error: cleanMsg || "Failed to generate insights" });
      }
    }
  });

  // Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
