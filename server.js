import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

// Initialize Gemini (Server Side) with Fallback Key
const apiKey = process.env.API_KEY || "AIzaSyCR27lyrzBJZS_taZGGa62oy548x3L2tEs";

if (!apiKey) {
  console.warn("⚠️ Warning: API_KEY not found in environment variables. Server-side AI calls will fail.");
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Models to try for backend redundancy
const BACKEND_MODELS = ["gemini-2.0-flash-exp", "gemini-2.0-flash", "gemini-1.5-flash"];

// --- 1. THE ANALYST ROUTE ---
app.post('/api/analyze', async (req, res) => {
  try {
    if (!ai) {
        return res.status(500).json({ error: "Server missing API Key. Check environment variables." });
    }

    const { portfolioData, data: marketQuery } = req.body;
    let promptText = "";

    // Construct Prompt (Asking for JSON)
    if (marketQuery) {
      promptText = `
        You are a financial analyst. Analyze: "${marketQuery}".
        Return valid JSON (NO markdown) with these exact keys:
        {
          "sentiment": "Bullish" or "Bearish",
          "riskScore": (number 0-100),
          "summary": "Brief analysis string...",
          "redFlags": ["flag1", "flag2"],
          "outlook": "Positive" or "Negative"
        }
      `;
    } else if (portfolioData) {
      promptText = `
        Analyze this portfolio: ${JSON.stringify(portfolioData)}.
        Return valid JSON (NO markdown) with these exact keys:
        {
          "riskScore": (number 0-100),
          "verdict": "Buy" or "Hold" or "Sell",
          "summary": "Brief analysis...",
          "redFlags": ["flag1", "flag2"]
        }
      `;
    } else {
      promptText = req.body.prompt || "Analyze the market.";
    }

    let responseText = null;

    // Backend Fallback Loop
    for (const model of BACKEND_MODELS) {
        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: promptText,
                config: { responseMimeType: "application/json" }
            });
            responseText = response.text;
            break; // Success
        } catch (e) {
            console.warn(`Backend model ${model} failed, trying next...`);
        }
    }

    if (!responseText) throw new Error("All backend models failed.");
    
    // Attempt to parse JSON
    try {
        const json = JSON.parse(responseText);
        res.json({ analysis: json });
    } catch (e) {
        // If not JSON, return as text
        res.json({ text: responseText });
    }

  } catch (error) {
    console.error("Analysis Error:", error);
    res.status(200).json({ 
      analysis: {
        riskScore: 50,
        sentiment: "Neutral",
        summary: "Analysis unavailable momentarily.",
        redFlags: ["System Busy"],
        outlook: "Neutral"
      }
    });
  }
});

// --- 2. THE CHATBOT ROUTE (Legacy/Backup) ---
app.post('/api/chat', async (req, res) => {
  try {
    if (!ai) {
        return res.status(500).json({ error: "Server missing API Key." });
    }

    const { message, context } = req.body; 
    let systemInstruction = "You are 'The Reality Check', a sarcastic, witty, and brutally honest financial friend.";
    
    if (context && context.riskScore > 70) {
      systemInstruction += ` The user is looking at ${context.symbol} which has a HIGH RISK score (${context.riskScore}/100). Roast them.`;
    } else {
      systemInstruction += " Be skeptical and witty.";
    }

    let reply = "Server busy.";

    for (const model of BACKEND_MODELS) {
        try {
            const response = await ai.models.generateContent({
              model: model,
              contents: message,
              config: {
                systemInstruction: systemInstruction,
                maxOutputTokens: 200
              }
            });
            reply = response.text;
            break;
        } catch(e) { console.warn("Chat model failed, retrying..."); }
    }

    res.json({ reply: reply });

  } catch (error) {
    console.error("Chat Error:", error);
    res.json({ reply: "I'm on a coffee break. (Server Error)" });
  }
});

// Handle React Routing
app.get('*', (req, res) => {
    try {
        res.sendFile(join(__dirname, 'dist', 'index.html'));
    } catch (e) {
        res.send('API Server Running. Frontend should be served via Vite in dev mode.');
    }
});

app.listen(port, () => console.log(`Server running on port ${port}`));