import { GoogleGenAI } from '@google/genai';

// CORRECT MODEL: gemini-2.0-flash-exp (Stable Experimental)
const MODEL_NAME = "gemini-2.0-flash-exp";

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { mode, data } = req.body;
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      console.error("API_KEY missing");
      return res.status(500).json({ error: 'Server Config Error: API_KEY is missing.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    // --- SYSTEM INSTRUCTION ---
    let systemInstruction = "";
    let prompt = "";
    
    // DEFAULT: JSON-First Protocol
    const jsonSystemInstruction = `
      You are a Senior Forensic Financial Analyst.
      CRITICAL PROTOCOL:
      1. KILL THE BIAS: Default to "Hold" or "Sell".
      2. BE HARSH: Risk Score 0-30 is rare.
      3. SWOT PRECISION: EXACTLY 4 distinct points per category.
      4. FORENSIC TONE: Professional, cynical.

      STEP 1: GENERATE JSON DATA (Output this FIRST)
      \`\`\`json
      {
        "riskScore": number (0-100),
        "bubbleProbability": number (0-100),
        "marketSentiment": "Bullish" | "Bearish" | "Neutral" | "Euphoric" | "Fear",
        "keyMetrics": [ { "label": "Price", "value": "$..." } ],
        "technicalAnalysis": {
            "priceData": [], "rsiData": [], "currentRsi": 0, "currentMa": 0, "signal": "Neutral"
        },
        "bubbleAudit": {
            "riskStatus": "Elevated", "valuationVerdict": "Fair Value", "score": 50,
            "fundamentals": "...", "peerContext": "...", "speculativeActivity": "Moderate", "burstTrigger": "...", "liquidityStatus": "Neutral"
        },
        "warningSignals": [],
        "swot": { "strengths": [], "weaknesses": [], "opportunities": [], "threats": [] },
        "whistleblower": { "integrityScore": 50, "forensicVerdict": "...", "anomalies": [], "insiderDetails": [] },
        "topBubbleAssets": []
      }
      \`\`\`

      STEP 2: GENERATE FORENSIC REPORT (Markdown)
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
        try { payload = typeof data === 'string' ? JSON.parse(data) : data; } catch (e) { payload = { history: [], message: data }; }
        systemInstruction = `You are 'The Reality Check', a witty, sarcastic financial assistant. Keep it short.`;
        const historyText = payload.history ? payload.history.map((h: any) => `${h.sender === 'user' ? 'User' : 'AI'}: ${h.text}`).join('\n') : '';
        prompt = `Previous conversation:\n${historyText}\n\nCurrent User Message: ${payload.message}`;
    }

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

    if (mode === 'chat') {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(200).send(text || "I'm speechless.");
    }
    
    const sources = result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const uniqueSources: any[] = [];
    const seenUris = new Set();
    
    if (sources) {
        for (const g of sources) {
            if (g.web?.uri && !seenUris.has(g.web.uri)) {
                seenUris.add(g.web.uri);
                uniqueSources.push(g);
            }
        }
    }

    return res.status(200).json({
        text: text,
        metadata: uniqueSources
    });

  } catch (error: any) {
    console.error("[API ERROR]", error);
    return res.status(500).json({ error: error.message || 'Forensic Engine Offline', details: JSON.stringify(error) });
  }
}