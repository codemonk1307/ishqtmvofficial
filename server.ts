import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, doc, setDoc, query, orderBy, limit, serverTimestamp } from "firebase/firestore";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { CURATED_LITERATURE } from "./src/data/literature";

// Load environment variables
dotenv.config();

const app = express();
app.set("trust proxy", 1);
const PORT = 3000;

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for local dev / vite compatibility
  crossOriginEmbedderPolicy: false,
}));
app.use(express.json({ limit: "2mb" })); // Limit payload size to prevent DDoS

// --- RATE LIMITERS ---
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window`
  message: { success: false, error: "Too many requests from this IP, please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Limit brute force points
  message: { success: false, error: "Too many attempts, please take a deep breath and try later." },
});

// Apply rate limits
app.use("/api/literature-ai", generalApiLimiter);
app.use("/api/chat", generalApiLimiter);
app.use("/api/verify-creator-password", strictApiLimiter);
app.use("/api/suggestions", strictApiLimiter);
app.use("/api/bulk", strictApiLimiter);

// Initialize Firebase on Backend
let db: any = null;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const fbApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId || "(default)");
    console.log("Firebase initialized successfully on Express backend.");
  } else {
    console.warn("firebase-applet-config.json not found on backend.");
  }
} catch (error) {
  console.error("Failed to initialize Firebase on backend:", error);
}

// Lazy-initialized GoogleGenAI client to prevent crash on startup if API key is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY environment variable is not configured or holds a placeholder.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// API Endpoint for the AI Literary Companion ("Nukta")
app.post("/api/literature-ai", async (req, res) => {
  const { action, text, context, userPrompt } = req.body;

  try {
    const ai = getGeminiClient();

    let systemInstruction = 
      "You are 'Nukta' (نقطہ / बिंदु), the elegant and deeply knowledgeable AI Literary Companion of " +
      "the 'Ain Sheen Qaf : The Muted Void' literature channel (founded by ishqtmvofficial). " +
      "You are an authority on Urdu poetry (adab, ghazals, shers, nazms, rubaiyat), Hindi literature (sahitya, upanyas, poems, dohas), " +
      "and English classics. You speak with high poetic elegance, courtesy, and literary depth. " +
      "In your responses, please use readable formatting. Always maintain the emotional weight and gravity of the poetry.";

    let prompt = "";

    if (action === "tashreeh") {
      prompt = `Provide a beautiful, detailed literary explanation (Tashreeh / Vyakhya) of this couplet/verse:\n\n` +
               `"${text}"\n\n` +
               `Poet/Author: ${context?.author || "Unknown"}\n` +
               `Category: ${context?.category || "Poetry"}\n\n` +
               `Please break down:\n` +
               `1. The literal meanings of any complex metaphors.\n` +
               `2. The deeper philosophical, emotional, or existential theme (The "Muted Void" theme).\n` +
               `3. A brief explanation of why this verse echoes in human hearts.\n` +
               `Structure your response elegantly in simple, flowing language. You can use Hindi, Urdu (in romanized or original script) and English as appropriate.`;
    } else if (action === "translate") {
      prompt = `Translate the following literary work with high artistic and emotive fidelity into the other two languages (if Urdu/Hindi, translate to English. If English, translate to poetic Hindi/Urdu):\n\n` +
               `"${text}"\n\n` +
               `Poet/Author: ${context?.author || "Unknown"}\n\n` +
               `Ensure that you don't just do a word-for-word translation, but capture the 'Ruh' (soul) of the poetry. Provide the translated version in elegant lines, followed by a brief 2-sentence note on the translated tone.`;
    } else if (action === "complete") {
      prompt = `The user has written the following starting line(s) of a poem or sher:\n\n` +
               `"${text}"\n\n` +
               `Please behave as a fellow poet and help them complete this. Provide 2-3 alternative options for the next line (Misra-e-Sani) or couplet. \n` +
               `Make sure your suggestions strictly adhere to the rhythmic flow, mood, and rhyming patterns (Behr, Raddif, and Kaafiya) of the original line.\n` +
               `Explain the poetic structure of your suggestions briefly so the user can learn.`;
    } else if (action === "search-adab") {
      prompt = `Search the literary archives for the poet or shayar named: "${text}".\n\n` +
               `If found, please provide:\n` +
               `1. A brief, beautiful, and deeply evocative 2-sentence description of their poetic style, main themes, and their significance in literature.\n` +
               `2. A curated collection of 2-3 of their most famous couplets, verses, or poems. \n` +
               `For each piece, please present:\n` +
               `   - The original script (Urdu script / Devanagari script)\n` +
               `   - The Romanized transliteration (for ease of reading)\n` +
               `   - An elegant, soulful English translation/meaning.\n` +
               `   - A short, 1-sentence aesthetic reflection (Tashreeh) on the verse.\n\n` +
               `Format your response beautifully with clean Markdown. Do NOT include any meta-introductions, congratulations, or conversational fluff. Start directly with the poet's name as a heading.`;
    } else if (action === "transliterate_hindi") {
      prompt = `Please transliterate the following text into the Hindi (Devanagari) script:\n\n` +
               `"${text}"\n\n` +
               `Provide only the transliterated Devanagari text, with no introductory text, no quotation marks, and no explanations. Keep the poetic line breaks exactly as they are.`;
    } else {
      // General chat/ask Nukta
      prompt = `A passionate lover of literature asks you:\n` +
               `"${userPrompt}"\n\n` +
               `If they are referencing this specific piece of literature: "${text || "(none)"}" by ${context?.author || "unknown"}.\n` +
               `Answer their query in an elegant, beautifully articulated literary manner. Include relevant shers, verses, or quotes if they enhance the beauty of your explanation.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    const answer = response.text;
    res.json({ success: true, answer });
  } catch (error: any) {
    console.error("Gemini API Error in backend:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "An error occurred with Nukta, our AI literary companion." 
    });
  }
});

app.post("/api/generate-nukta-metadata", async (req, res) => {
  const { originalText, author, creatorPassword } = req.body;
  if (!originalText) {
    return res.status(400).json({ success: false, error: "originalText is required" });
  }

  // Very basic check - we just check if it matches the creator password since that's what the UI uses
  const configuredPassword = process.env.CREATOR_PASSWORD;
  if (configuredPassword && creatorPassword !== configuredPassword) {
     return res.status(401).json({ success: false, error: "Unauthorized. Passcode required." });
  }

  try {
    const ai = getGeminiClient();
    const prompt = `Please act as a poetry expert. I have the following verse by ${author || 'unknown'}:
"${originalText}"

I need you to generate:
1. romanizedText: A clean, standard romanized version (English letters) of the poetry.
2. englishTranslation: A poetic and faithful English translation.
3. vocabulary: A JSON array of the 2-4 most difficult words (lafz) in the text. Each object should have "word" (the word in Romanized form) and "meaning" (its English meaning).

Return strictly in valid JSON format with keys "romanizedText", "englishTranslation", and "vocabulary" (which is an array of objects). Do not include markdown formatting or extra text.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    if (response.text) {
      const raw = response.text.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(raw);
      return res.json({ success: true, metadata: parsed });
    } else {
      throw new Error("No response from AI");
    }
  } catch (error: any) {
    console.error("Gemini Metadata Error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to generate metadata." });
  }
});

// GET: Retrieve all literature from Firestore (with auto-seeding if empty)
app.get("/api/literature", async (req, res) => {
  try {
    if (!db) {
      return res.json({ success: true, items: CURATED_LITERATURE, seeded: false, msg: "Using static fallback" });
    }

    const litCol = collection(db, "literature");
    const snapshot = await getDocs(litCol);
    let items: any[] = [];
    snapshot.forEach((d) => {
      items.push({ id: d.id, ...d.data() });
    });

    if (items.length === 0) {
      console.log("Literature database empty. Auto-seeding classic items...");
      for (const item of CURATED_LITERATURE) {
        await setDoc(doc(db, "literature", item.id), item);
        items.push(item);
      }
      return res.json({ success: true, items, seeded: true });
    }

    // Sort by datePublished or id if needed
    items.sort((a, b) => (b.datePublished || "").localeCompare(a.datePublished || ""));

    res.json({ success: true, items, seeded: false });
  } catch (error: any) {
    console.error("Error retrieving literature:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to fetch literature from database." });
  }
});

// POST: Add new literature item to Firestore
app.post("/api/literature", async (req, res) => {
  const item = req.body;
  if (!item || !item.title || !item.author || !item.category || !item.originalText) {
    return res.status(400).json({ success: false, error: "Missing required fields: title, author, category, originalText" });
  }

  try {
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not initialized" });
    }

    const itemId = item.id || `lit-${Date.now()}`;
    const newItem = {
      ...item,
      id: itemId,
      viewsCount: item.viewsCount || 0,
      likesCount: item.likesCount || 0,
      datePublished: item.datePublished || new Date().toISOString().split("T")[0],
      vocabulary: item.vocabulary || [],
      popularity: item.popularity || "curated"
    };

    await setDoc(doc(db, "literature", itemId), newItem);
    res.json({ success: true, id: itemId, item: newItem });
  } catch (error: any) {
    console.error("Error inserting literature item:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to add literature item." });
  }
});

// GET: Retrieve all broadcasts/media from Firestore (with auto-seeding if empty)
app.get("/api/broadcasts", async (req, res) => {
  try {
    if (!db) {
      return res.json({
        success: true,
        items: [
          {
            id: 'yt-1',
            title: 'Jaun Elia: The Melancholy of the Rebel',
            type: 'youtube',
            embedId: 'eUOnB3l2Gxs',
            description: 'A deep, slow recitation and philosophical commentary on Jaun’s timeless verses.',
            timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
          },
          {
            id: 'yt-2',
            title: 'Mirza Ghalib: Deciphering the Infinite Sorrow',
            type: 'youtube',
            embedId: '8hI_gH2TidA',
            description: 'An analytical exploration of Ghalib’s heavy metaphors on the architecture of human pain.',
            timestamp: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString()
          },
          {
            id: 'yt-3',
            title: 'Faiz Ahmed Faiz: Mujhse Pehli Si Mohabbat',
            type: 'youtube',
            embedId: 'eE9Qf0H1L5A',
            description: 'An elegant reading of Faiz’s masterpiece, translating his revolutionary pain.',
            timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
          }
        ],
        msg: "Using static fallback"
      });
    }

    const broadcastCol = collection(db, "broadcasts");
    const snapshot = await getDocs(broadcastCol);
    let items: any[] = [];
    snapshot.forEach((d) => {
      items.push({ id: d.id, ...d.data() });
    });

    if (items.length === 0) {
      console.log("Broadcasts empty. Auto-seeding default media...");
      const defaultMedia = [
        {
          id: 'yt-1',
          title: 'Jaun Elia: The Melancholy of the Rebel',
          type: 'youtube',
          embedId: 'eUOnB3l2Gxs',
          description: 'A deep, slow recitation and philosophical commentary on Jaun’s timeless verses.',
          timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
        },
        {
          id: 'yt-2',
          title: 'Mirza Ghalib: Deciphering the Infinite Sorrow',
          type: 'youtube',
          embedId: '8hI_gH2TidA',
          description: 'An analytical exploration of Ghalib’s heavy metaphors on the architecture of human pain.',
          timestamp: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString()
        },
        {
          id: 'yt-3',
          title: 'Faiz Ahmed Faiz: Mujhse Pehli Si Mohabbat',
          type: 'youtube',
          embedId: 'eE9Qf0H1L5A',
          description: 'An elegant reading of Faiz’s masterpiece, translating his revolutionary pain.',
          timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
        },
        {
          id: 'ig-1',
          title: '🌿 Aarz Kiya Hai... Kabir’s Mystic Void',
          type: 'instagram',
          embedId: 'C-pS3pbyh9g',
          description: 'An eye-safe aesthetic card presenting handwritten dohas on detachment and the universe.',
          timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
        },
        {
          id: 'ig-2',
          title: 'Tu Kisi Rail Si Guzarti Hai...',
          type: 'instagram',
          embedId: 'C_p19gUv3hP',
          description: 'Visualizing Dushyant Kumar’s most celebrated rhythmic couplets in aesthetic style.',
          timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
        },
        {
          id: 'ig-3',
          title: 'Ghalib: Dil-e-Nadaan Tujhe Hua Kya Hai',
          type: 'instagram',
          embedId: 'C9K3A-hI_q2',
          description: 'Handwritten calligraphy paired with nostalgic background ambience for slow-living lovers.',
          timestamp: new Date().toISOString()
        }
      ];

      for (const item of defaultMedia) {
        await setDoc(doc(db, "broadcasts", item.id), item);
        items.push(item);
      }
      return res.json({ success: true, items, seeded: true });
    }

    // Sort by timestamp descending
    items.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));

    res.json({ success: true, items, seeded: false });
  } catch (error: any) {
    console.error("Error retrieving broadcasts:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to fetch broadcasts from database." });
  }
});

// POST: Add new broadcast item to Firestore
app.post("/api/broadcasts", async (req, res) => {
  const item = req.body;
  if (!item || !item.title || !item.type || !item.embedId) {
    return res.status(400).json({ success: false, error: "Missing required fields: title, type, embedId" });
  }

  try {
    if (!db) {
      return res.status(500).json({ success: false, error: "Database not initialized" });
    }

    const broadcastId = item.id || `media-${Date.now()}`;
    const newBroadcast = {
      ...item,
      id: broadcastId,
      timestamp: item.timestamp || new Date().toISOString()
    };

    await setDoc(doc(db, "broadcasts", broadcastId), newBroadcast);
    res.json({ success: true, id: broadcastId, item: newBroadcast });
  } catch (error: any) {
    console.error("Error inserting broadcast:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to add broadcast." });
  }
});

// POST: Parse YouTube or Instagram URL and automatically fetch metadata + generate poetic description using Gemini
app.post("/api/fetch-media-meta", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ success: false, error: "URL is required" });
  }

  try {
    // 1. YouTube URL matching
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
    const ytMatch = url.match(ytRegex);

    if (ytMatch) {
      const videoId = ytMatch[1];
      let title = "Aesthetic Recitation in the Void";
      let thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      try {
        // Fetch title via oEmbed
        const oembedUrl = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`;
        const response = await fetch(oembedUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.title) {
            title = data.title;
          }
          if (data.thumbnail_url) {
            thumbnailUrl = data.thumbnail_url;
          }
        }
      } catch (err) {
        console.warn("Could not fetch YouTube oEmbed info:", err);
      }

      // Generate a beautiful, poetic description with Gemini
      let description = "A cinematic recitation exploring the profound silences of our shared human memory.";
      try {
        const ai = getGeminiClient();
        const geminiRes = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `The user has uploaded a YouTube video titled "${title}". Please write a beautiful, deeply poetic, atmospheric 1-2 sentence description for this poetry video. Focus on themes of literature, classical Urdu/Hindi, nostalgia, or quiet solitude. Do not write any conversational intro or greetings. Start directly with the description.`,
        });
        if (geminiRes.text) {
          description = geminiRes.text.trim();
        }
      } catch (e) {
        console.warn("Could not generate Gemini description:", e);
      }

      return res.json({
        success: true,
        meta: {
          title,
          type: "youtube",
          embedId: videoId,
          description,
          thumbnailUrl,
          url
        }
      });
    }

    // 2. Instagram URL matching
    const igRegex = /instagram\.com\/(?:p|reel|reels)\/([a-zA-Z0-9_-]+)/;
    const igMatch = url.match(igRegex);

    if (igMatch) {
      const shortcode = igMatch[1];
      let title = `Poetic Scroll in the Void (${shortcode})`;
      let description = "A slow-paced handwritten poetry scroll paired with calming acoustic melodies.";

      // Generate poetic Title and Description using Gemini
      try {
        const ai = getGeminiClient();
        const geminiRes = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `The user has uploaded an Instagram reel/post with shortcode "${shortcode}". Since Instagram does not have open oEmbed metadata, please generate a gorgeous, deeply poetic, and atmospheric title (3-5 words) and a matching 1-2 sentence description. Reflect themes of classical poetry, Ghalib, Jaun, Gulzar, ink, calligraphy, or silent rain. Output your answer strictly in valid JSON format with keys "title" and "description". Do not include markdown code block formatting or any other text.`,
        });
        if (geminiRes.text) {
          const raw = geminiRes.text.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
          const parsed = JSON.parse(raw);
          if (parsed.title) title = parsed.title;
          if (parsed.description) description = parsed.description;
        }
      } catch (e) {
        console.warn("Could not generate Gemini IG details:", e);
      }

      return res.json({
        success: true,
        meta: {
          title,
          type: "instagram",
          embedId: shortcode,
          description,
          thumbnailUrl: "",
          url
        }
      });
    }

    return res.status(400).json({ success: false, error: "Unsupported URL format. Please provide a valid YouTube video/shorts or Instagram reel URL." });
  } catch (error: any) {
    console.error("Error in metadata fetch endpoint:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to parse video metadata." });
  }
});


// Helper middleware/function to check admin/bulk token
function verifyAdminToken(req: any): boolean {
  const tokenHeader = req.headers["x-admin-token"] || req.headers["authorization"]?.replace("Bearer ", "");
  const tokenParam = req.query.token || req.body.token;
  const providedToken = tokenHeader || tokenParam;

  const configToken = process.env.ADMIN_TOKEN;
  
  if (!configToken) {
    console.warn("ADMIN_TOKEN is not configured in environment variables. All bulk requests will be denied.");
    return false;
  }
  
  return providedToken === configToken;
}

// POST: Verify creator password for UI lock
app.post("/api/verify-creator-password", (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, error: "Password is required" });
  }

  const configuredPassword = process.env.CREATOR_PASSWORD;
  if (!configuredPassword) {
    console.warn("CREATOR_PASSWORD is not configured in environment variables. Creator mode login will fail.");
    return res.status(500).json({ success: false, error: "Server configuration missing: CREATOR_PASSWORD not set." });
  }

  if (password === configuredPassword) {
    return res.json({ success: true, msg: "Unlocked successfully" });
  } else {
    return res.status(401).json({ success: false, error: "Incorrect passcode. Access denied." });
  }
});

// POST: Bulk upload literature
app.post("/api/bulk/literature", async (req, res) => {
  if (!verifyAdminToken(req)) {
    return res.status(401).json({ success: false, error: "Unauthorized. Invalid or missing X-Admin-Token." });
  }

  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ success: false, error: "Invalid payload. Expected an array of 'items'." });
  }

  if (!db) {
    return res.status(500).json({ success: false, error: "Database not initialized. Ensure Firebase is configured." });
  }

  try {
    const results: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.title || !item.author || !item.category || !item.originalText) {
        errors.push({ index: i, error: "Missing required fields: title, author, category, originalText" });
        continue;
      }

      const itemId = item.id || `lit-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newItem = {
        ...item,
        id: itemId,
        viewsCount: item.viewsCount || Math.floor(Math.random() * 300) + 50,
        likesCount: item.likesCount || 0,
        datePublished: item.datePublished || new Date().toISOString().split("T")[0],
        vocabulary: item.vocabulary || [],
        popularity: item.popularity || "curated"
      };

      await setDoc(doc(db, "literature", itemId), newItem);
      results.push({ id: itemId, title: item.title });
    }

    res.json({
      success: true,
      processed: items.length,
      uploaded: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error: any) {
    console.error("Bulk upload error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to process bulk upload." });
  }
});

// POST: Bulk upload broadcasts
app.post("/api/bulk/broadcasts", async (req, res) => {
  if (!verifyAdminToken(req)) {
    return res.status(401).json({ success: false, error: "Unauthorized. Invalid or missing X-Admin-Token." });
  }

  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ success: false, error: "Invalid payload. Expected an array of 'items'." });
  }

  if (!db) {
    return res.status(500).json({ success: false, error: "Database not initialized. Ensure Firebase is configured." });
  }

  try {
    const results: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.title || !item.type || !item.embedId) {
        errors.push({ index: i, error: "Missing required fields: title, type, embedId" });
        continue;
      }

      const broadcastId = item.id || `media-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newBroadcast = {
        ...item,
        id: broadcastId,
        timestamp: item.timestamp || new Date().toISOString()
      };

      await setDoc(doc(db, "broadcasts", broadcastId), newBroadcast);
      results.push({ id: broadcastId, title: item.title });
    }

    res.json({
      success: true,
      processed: items.length,
      uploaded: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error: any) {
    console.error("Bulk broadcasts upload error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to process bulk broadcasts upload." });
  }
});


// POST: Submit a feature suggestion or feedback
app.post("/api/suggestions", async (req, res) => {
  const { feature, email, message } = req.body;
  if (!feature) {
    return res.status(400).json({ success: false, error: "Suggestion feature title is required." });
  }

  if (!db) {
    // If no db, just simulate success for the demo
    return res.json({ success: true, msg: "Thank you for whispering into the void." });
  }

  try {
    const suggestionId = `sugg-${Date.now()}`;
    await setDoc(doc(db, "feature_suggestions", suggestionId), {
      feature,
      email: email || "anonymous",
      message: message || "",
      timestamp: serverTimestamp()
    });

    res.json({ success: true, msg: "Your whisper has been recorded." });
  } catch (error: any) {
    console.error("Suggestion error:", error);
    res.status(500).json({ success: false, error: "Failed to save suggestion." });
  }
});


// Serve Vite dev server in development, static files in production
async function startServer() {
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
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
