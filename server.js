import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch'; // You might need to add this to package.json if missing
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

// 1. Middleware
app.use(cors());
app.use(express.json());

// 2. Serve the Frontend (The "dist" folder that Vite builds)
app.use(express.static(join(__dirname, 'dist')));

// 3. THE SMART API ROUTE (Your AI Logic)
app.post('/api/analyze', async (req, res) => {
  try {
    const { portfolioData, data: marketQuery } = req.body;
    let promptText = "";

    // Construct Prompt (Asking for JSON to restore Charts)
    if (marketQuery) {
      promptText = `
        You are a financial analyst. Analyze: "${marketQuery}".
        Return valid JSON (NO markdown) with these exact keys:
        {
          "sentiment": "Bullish" or "Bearish",
          "riskScore": (number 0-100),
          "summary": "Brief analysis string...",
          "redFlags": ["flag1", "flag2", "flag3"],
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

    // Call Gemini (Using Flash-Latest)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    });

    if (!response.ok) {
       if (response.status === 429) throw new Error("Free Quota Limit. Please wait.");
       throw new Error(`Google API Error: ${response.status}`);
    }

    const data = await response.json();
    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // Clean & Parse JSON
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const analysisJson = JSON.parse(rawText);

    res.json({ analysis: analysisJson });

  } catch (error) {
    console.error("Server Error:", error);
    // Return safe fallback so app doesn't crash
    res.status(200).json({ 
      analysis: {
        riskScore: 50,
        sentiment: "Neutral",
        summary: "Analysis unavailable (" + error.message + ")",
        redFlags: ["Server Error"],
        outlook: "Neutral"
      }
    });
  }
});

// 4. Handle React Routing (Redirect any other request to index.html)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// 5. Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));