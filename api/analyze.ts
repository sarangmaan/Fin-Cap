import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 2. Parse Body
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }

    const { mode, data } = body;
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Server Config Error: API_KEY is missing.' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelId = "gemini-2.5-flash"; 

    // Reconstruct prompts consistent with server.js
    let systemInstruction = '';
    let prompt = '';

    if (mode === 'market') {
      prompt = `Analyze: "${data}". Search for current price, news, and valuation.`;
      systemInstruction = `
        Role: Financial Analyst.
        Objective: Use Google Search to get real-time data.
        Output: Markdown Report + JSON Block (riskScore, riskLevel, bubbleProbability, marketSentiment, keyMetrics, trendData, warningSignals, swot).
        Structure: Executive Summary (Verdict), Catalysts, Valuation.
      `;
    } else if (mode === 'portfolio') {
      prompt = `Audit portfolio: ${JSON.stringify(data)}. Search for current prices.`;
      systemInstruction = `
        Role: Risk Manager.
        Output: Markdown Report + JSON Block.
      `;
    } else {
        return res.status(400).json({ error: "Invalid request mode" });
    }

    // Use standard generateContent (non-streaming for Vercel Serverless simplicity, or stream if supported)
    // We will use generateContent for simplicity in serverless environment to avoid stream timeouts/complexity
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
      }
    });

    const text = response.text || "";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    // Format to match the client's expected stream format (Mocking the stream format for compatibility)
    const output = `${text}\n\n__FINCAP_METADATA__\n${JSON.stringify(chunks)}`;

    return res.status(200).send(output);

  } catch (error: any) {
    console.error("Vercel Server Error:", error);
    return res.status(500).json({ error: error.message || 'Server Internal Error' });
  }
}