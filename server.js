import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
// Switching to gemini-2.0-flash-exp as requested for better availability/performance.
const MODEL_NAME = "gemini-2.0-flash-exp";

// Middleware
app.use(cors());
app.use(express.json());

// Request Logging
app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.originalUrl}`);
    next();
});

// Serve Static Files
app.use(express.static(join(__dirname, 'dist')));

// Handle Options for CORS
app.options('*', cors());

// --- THE ANALYST ROUTE ---
app.post('/api/analyze', async (req, res) => {
  const { mode, data } = req.body;
  console.log(`\n[API] Processing ${mode} request with ${MODEL_NAME}...`);

  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("[ERROR] API_KEY is missing.");
      return res.status(500).json({ error: 'Server Config Error: API_KEY is missing.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    // --- SYSTEM INSTRUCTION & PROMPT LOGIC ---
    let systemInstruction = "";
    let prompt = "";
    
    // DEFAULT: JSON-First Protocol for Analysis
    const jsonSystemInstruction = `
      You are a Senior Forensic Financial Analyst & Investment Banker at a top-tier hedge fund.
      Your job is to find the "rot beneath the floorboards." You are NOT a cheerleader.

      CRITICAL BEHAVIORAL PROTOCOL:
      1. **KILL THE BIAS**: Do not default to "Buy" or "Strong Buy". Most assets are "Hold" or "Sell" in reality.
      2. **BE HARSH**: A Risk Score of 0-30 is rare. A Score of 80-100 is rare. Most assets sit in the middle.
      3. **SWOT PRECISION**: You MUST provide **EXACTLY 4 distinct points** for EACH category.
      4. **FORENSIC TONE**: Use professional, cynical institutional language.

      STEP 1: GENERATE JSON DATA (Output this FIRST)
      You MUST start your response with a valid JSON block.
      \`\`\`json
      {
        "riskScore": number (0-100),
        "bubbleProbability": number (0-100),
        "marketSentiment": "Bullish" | "Bearish" | "Neutral" | "Euphoric" | "Fear",
        "keyMetrics": [
          { "label": "Price", "value": "$..." },
          { "label": "Market Cap", "value": "..." },
          { "label": "P/E Ratio", "value": "..." },
          { "label": "52W High", "value": "..." }
        ],
        "technicalAnalysis": {
            "priceData": [
                { "date": "T-5", "price": 100, "ma50": 95 },
                { "date": "T-4", "price": 102, "ma50": 96 },
                { "date": "T-3", "price": 105, "ma50": 97 },
                { "date": "T-2", "price": 103, "ma50": 98 },
                { "date": "T-1", "price": 108, "ma50": 99 },
                { "date": "Now", "price": 110, "ma50": 100 }
            ],
            "rsiData": [
                { "date": "T-5", "value": 45 },
                { "date": "T-4", "value": 50 },
                { "date": "T-3", "value": 55 },
                { "date": "T-2", "value": 52 },
                { "date": "T-1", "value": 60 },
                { "date": "Now", "value": 65 }
            ],
            "currentRsi": 65,
            "currentMa": 100,
            "signal": "Buy" | "Sell" | "Neutral"
        },
        "bubbleAudit": {
            "riskStatus": "Elevated" | "Safe" | "Critical",
            "valuationVerdict": "Overvalued" | "Fair Value" | "Undervalued" | "Bubble",
            "score": 75,
            "fundamentals": "2-3 sentences analyzing cash flow, earnings growth vs price.",
            "peerContext": "2-3 sentences comparing valuation multiples.",
            "speculativeActivity": "Moderate" | "High" | "Low" | "Extreme",
            "burstTrigger": "Identify 1 specific catalyst.",
            "liquidityStatus": "Abundant" | "Neutral" | "Drying Up" | "Illiquid"
        },
        "warningSignals": ["Signal 1", "Signal 2"],
        "swot": {
          "strengths": ["Detail 1", "Detail 2", "Detail 3", "Detail 4"],
          "weaknesses": ["Detail 1", "Detail 2", "Detail 3", "Detail 4"],
          "opportunities": ["Detail 1", "Detail 2", "Detail 3", "Detail 4"],
          "threats": ["Detail 1", "Detail 2", "Detail 3", "Detail 4"]
        },
        "whistleblower": {
           "integrityScore": number (0-100),
           "forensicVerdict": "Short sentence summary",
           "anomalies": ["Anomaly 1", "Anomaly 2"],
           "insiderDetails": ["Detail 1"]
        },
        "topBubbleAssets": [
            { "name": "Asset Name", "riskScore": 90, "sector": "Tech", "price": "$100", "reason": "Reason..." }
        ]
      }
      \`\`\`

      STEP 2: GENERATE FORENSIC REPORT (Markdown)
      The report must follow this exact structure:
      ### 1. Executive Summary
      ### 2. Insider & Forensic Deep Dive
      ### 3. Final Verdict
      MANDATORY: End with [[[Strong Buy]]], [[[Buy]]], [[[Hold]]], [[[Sell]]], or [[[Strong Sell]]].
    `;

    if (mode === 'market') {
        systemInstruction = jsonSystemInstruction;
        prompt = `Perform a forensic deep-dive analysis for: "${data}".`;
    } else if (mode === 'portfolio') {
        systemInstruction = jsonSystemInstruction;
        prompt = `Audit this portfolio for risk and exposure: ${data}.`;
    } else if (mode === 'bubbles') {
        systemInstruction = jsonSystemInstruction;
        prompt = `Scan global markets for major Bubbles, Overvalued Assets, and Crash Risks. Identify at least 4-6 specific assets.`;
    } else if (mode === 'chat') {
        let payload;
        try {
            payload = typeof data === 'string' ? JSON.parse(data) : data;
        } catch (e) {
            payload = { history: [], message: data, context: {} };
        }
        
        systemInstruction = `
            You are 'The Reality Check', a witty, sarcastic, but intelligent financial assistant.
            CONTEXT: Asset: ${payload.context?.symbol || 'General'}, Risk: ${payload.context?.riskScore || 0}/100.
            Keep it short. Use emojis.
        `;
        
        const historyText = payload.history 
           ? payload.history.map(h => `${h.sender === 'user' ? 'User' : 'AI'}: ${h.text}`).join('\n')
           : '';
           
        prompt = `Previous conversation:\n${historyText}\n\nCurrent User Message: ${payload.message}`;
    }

    // --- EXECUTE REQUEST ---
    const result = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
        maxOutputTokens: 8192,
        temperature: 0.3
      }
    });

    const text = result.text;
    console.log(`[API] Response generated. Length: ${text ? text.length : 0}`);

    if (mode === 'chat') {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(200).send(text || "I'm speechless.");
        return;
    }
    
    const sources = result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const uniqueSources = [];
    const seenUris = new Set();
    
    if (sources) {
        for (const g of sources) {
            if (g.web?.uri && !seenUris.has(g.web.uri)) {
                seenUris.add(g.web.uri);
                uniqueSources.push(g);
            }
        }
    }

    res.json({
        text: text,
        metadata: uniqueSources
    });

  } catch (error) {
    console.error("[API ERROR]", error);
    res.status(500).json({ error: error.message || 'Forensic Engine Offline', details: JSON.stringify(error) });
  }
});

// Explicit handle for API 404s
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: `API Endpoint Not Found: ${req.method} ${req.originalUrl}` });
});

// Catch-All
app.get('*', (req, res) => {
    try {
        res.sendFile(join(__dirname, 'dist', 'index.html'));
    } catch (e) {
        res.status(500).send('Server Error: Could not serve index.html');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n> FinCap Forensic Engine running on port ${PORT}`);
    console.log(`> Model: ${MODEL_NAME}`);
});