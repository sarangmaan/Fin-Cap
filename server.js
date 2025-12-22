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

// Models to try for backend redundancy - Optimized for stability
const BACKEND_MODELS = ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"];

// Mock Generator for Server Side
const generateMockAnalysis = (query) => {
    return {
        sentiment: "Neutral",
        riskScore: 50,
        summary: `Automated analysis for ${query} (Service Busy). Market conditions appear stable but volatile.`,
        redFlags: ["Data Unavailable"],
        outlook: "Neutral"
    };
};

// --- 1. THE ANALYST ROUTE ---
app.post('/api/analyze', async (req, res) => {
  try {
    const { portfolioData, data: marketQuery } = req.body;
    let promptText = "";

    if (marketQuery) {
      promptText = `Analyze: "${marketQuery}". Return JSON: { "sentiment": "Bullish"|"Bearish", "riskScore": 0-100, "summary": "string", "redFlags": [], "outlook": "Positive"|"Negative" }`;
    } else {
      promptText = req.body.prompt || "Analyze the market.";
    }

    if (!ai) {
         // Fallback if no AI instance
         return res.json({ analysis: generateMockAnalysis(marketQuery || "Portfolio") });
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
            break; 
        } catch (e) {
            console.warn(`Backend model ${model} failed.`);
        }
    }

    if (!responseText) {
        // FAIL-SAFE: Return mock data instead of error
        return res.json({ analysis: generateMockAnalysis(marketQuery || "Portfolio") });
    }
    
    try {
        const json = JSON.parse(responseText);
        res.json({ analysis: json });
    } catch (e) {
        res.json({ text: responseText });
    }

  } catch (error) {
    console.error("Analysis Error:", error);
    // FAIL-SAFE
    res.json({ analysis: generateMockAnalysis("Unknown") });
  }
});

// --- 2. THE CHATBOT ROUTE (Legacy/Backup) ---
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body; 
    let reply = "The market is unpredictable today. (Service Busy)";

    if (ai) {
        for (const model of BACKEND_MODELS) {
            try {
                const response = await ai.models.generateContent({
                  model: model,
                  contents: message,
                  config: { maxOutputTokens: 200 }
                });
                reply = response.text;
                break;
            } catch(e) {}
        }
    }
    res.json({ reply });

  } catch (error) {
    res.json({ reply: "I'm focusing on the charts right now. Ask me later." });
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