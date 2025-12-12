import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

// API Route
app.post('/api/analyze', async (req, res) => {
  try {
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
      return res.status(400).json({ error: "No data received." });
    }

    // Call Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    });

    if (!response.ok) throw new Error(`Google API Error: ${response.status}`);

    const data = await response.json();
    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    // Clean JSON
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const analysisJson = JSON.parse(rawText);

    res.json({ analysis: analysisJson });

  } catch (error) {
    console.error("Server Error:", error);
    // Safe fallback
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

// Handle React Routing
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));