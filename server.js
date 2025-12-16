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

// Initialize Gemini (Server Side)
const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("⚠️ Warning: API_KEY not found in environment variables. Server-side AI calls will fail.");
}
// We create the instance safely, but individual routes will check for key existence
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// --- 1. THE ANALYST ROUTE ---
app.post('/api/analyze', async (req, res) => {
  try {
    if (!ai) {
        return res.status(500).json({ error: "Server missing API Key. Check .env file." });
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
      // Fallback for generic prompts
      promptText = req.body.prompt || "Analyze the market.";
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text;
    
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
// Note: The frontend now mostly uses Client-Side SDK to avoid server timeouts, 
// but we keep this here for compatibility.
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

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
      config: {
        systemInstruction: systemInstruction,
        maxOutputTokens: 200
      }
    });

    res.json({ reply: response.text });

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