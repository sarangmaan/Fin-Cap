import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

// --- THE ANALYST ROUTE (Updated for Gemini 1.5 Flash) ---
app.post('/api/analyze', async (req, res) => {
  const { mode, data } = req.body;
  console.log(`\n[API] Received request for mode: ${mode}`);

  try {
    // 1. Security Check
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("[ERROR] API_KEY is missing in environment variables.");
      return res.status(500).json({ error: 'Server Config Error: API_KEY is missing in .env file.' });
    }

    // 2. Initialize Gemini Client
    const ai = new GoogleGenAI({ apiKey });

    // 3. Define System Instruction & Prompt based on Mode
    let systemInstruction = "";
    let prompt = "";
    
    // DEFAULT: JSON-First Protocol for Analysis
    const jsonSystemInstruction = `
      You are a Senior Forensic Financial Analyst & Investment Banker at a top-tier hedge fund.
      Your job is to find the "rot beneath the floorboards." You are NOT a cheerleader.

      CRITICAL BEHAVIORAL PROTOCOL:
      1. **KILL THE BIAS**: Do not default to "Buy" or "Strong Buy". Most assets are "Hold" or "Sell" in reality. If an asset is at All-Time Highs (ATH) with high RSI (>70), you MUST lean towards "Hold" or "Sell" unless fundamentals are perfect.
      2. **BE HARSH**: A Risk Score of 0-30 is rare. A Score of 80-100 is rare. Most assets sit in the middle. Be statistically realistic.
      3. **SWOT PRECISION**: You MUST provide **EXACTLY 4 distinct points** for EACH category (Strengths, Weaknesses, Opportunities, Threats). No more, no less.
      4. **FORENSIC TONE**: Use professional, cynical institutional language. Focus on cash burn, debt maturity, insider selling, and margin compression.

      STEP 1: GENERATE JSON DATA (Output this FIRST)
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
            "fundamentals": "2-3 sentences analyzing cash flow, earnings growth vs price, and margin sustainability. Be critical.",
            "peerContext": "2-3 sentences comparing valuation multiples (P/E, P/S) against key sector competitors.",
            "speculativeActivity": "Moderate" | "High" | "Low" | "Extreme",
            "burstTrigger": "Identify 1 specific catalyst that could crash this asset (e.g. 'Slowing cloud revenue', 'Fed rates > 5%').",
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
           "insiderDetails": [
              "Detail 1: Name specific insider or institution (e.g. 'CEO dumped $5M shares at peak').",
              "Detail 2: Suspicious option flow (e.g. 'High volume of deep OTM puts').",
              "Detail 3: Institutional ownership trend (e.g. 'Vanguard reduced stake by 2%')."
           ]
        },
        "topBubbleAssets": [
            { "name": "Asset Name", "riskScore": 90, "sector": "Tech", "price": "$100", "reason": "Reason..." }
        ]
      }
      \`\`\`

      STEP 2: GENERATE FORENSIC REPORT (Markdown)
      The report must follow this exact structure, providing deep detail:

      ### 1. Executive Summary
      - Provide a robust breakdown of the asset's current market standing, key fundamentals, and recent price action.
      - Summarize the "Bubble Probability" and "Risk Score" context with reasoning.

      ### 2. Insider & Forensic Deep Dive
      - **Insider Activity**: Analyze if executives/promoters are buying or dumping shares. Be specific about recent filings.
      - **Institutional Flow**: Analyze "Smart Money" movements. Are FIIs/DIIs accumulating or distributing?
      - **Forensic Red Flags**: Highlight any accounting anomalies, off-balance sheet items, debt concerns, or regulatory risks.
      - **Retail Sentiment**: Analyze if the stock is being driven by hype (dumb money) or solid fundamentals.

      ### 3. Final Verdict
      - Provide a definitive, actionable conclusion based on the forensic evidence.
      - **MANDATORY**: End the report with a single rating wrapped in triple brackets.
      - format: [[[Strong Buy]]], [[[Buy]]], [[[Hold]]], [[[Sell]]], or [[[Strong Sell]]].
    `;

    if (mode === 'market') {
        systemInstruction = jsonSystemInstruction;
        prompt = `Perform a forensic deep-dive analysis for: "${data}".`;
        
    } else if (mode === 'portfolio') {
        systemInstruction = jsonSystemInstruction;
        prompt = `Audit this portfolio for risk and exposure: ${data}.`;
        
    } else if (mode === 'bubbles') {
        systemInstruction = jsonSystemInstruction;
        prompt = `Scan global markets for major Bubbles, Overvalued Assets, and Crash Risks. Identify at least 4-6 specific assets in the 'topBubbleAssets' JSON array.`;
        
    } else if (mode === 'chat') {
        // Chat mode uses a different personality and no forced JSON
        let payload;
        try {
            payload = JSON.parse(data);
        } catch (e) {
            payload = { history: [], message: data, context: {} };
        }
        
        systemInstruction = `
            You are 'The Reality Check', a witty, sarcastic, but intelligent financial assistant.
            CONTEXT: Asset: ${payload.context?.symbol || 'General'}, Risk: ${payload.context?.riskScore || 0}/100.
            PERSONALITY:
            - High Risk (>60): Roast the user. "Do you hate money?"
            - Low Risk (<40): Praise the user. "Finally, a smart move."
            - Keep it short. Use emojis.
        `;
        
        const historyText = payload.history 
           ? payload.history.map(h => `${h.sender === 'user' ? 'User' : 'AI'}: ${h.text}`).join('\n')
           : '';
           
        prompt = `Previous conversation:\n${historyText}\n\nCurrent User Message: ${payload.message}`;
    }

    // 4. Execute Request
    console.log("[API] Sending request to Gemini...");
    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
        maxOutputTokens: 8192,
        temperature: 0.3
      }
    });

    const text = result.text;
    console.log("[API] Response received. Length:", text ? text.length : 0);
    
    // For Chat mode, we just return the text directly
    if (mode === 'chat') {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.write(text || "I'm speechless.");
        res.end();
        return;
    }
    
    // For Analysis modes, we extract metadata and send JSON
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
    console.error("[API ERROR] Analysis Failed:", error);
    // Explicitly send JSON error so frontend doesn't choke on HTML
    res.status(500).json({ error: error.message || 'Forensic Engine Offline' });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n> FinCap Forensic Engine running on port ${PORT}`);
    console.log(`> Model: gemini-1.5-flash`);
});