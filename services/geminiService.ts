import { GoogleGenAI } from '@google/genai';
import { AnalysisResult, PortfolioItem } from '../types';

// Initialize the Client-Side SDK
// API_KEY is injected via vite.config.ts 'define'
const apiKey = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || '' });
const MODEL_NAME = "gemini-3-flash-preview";

// --- ROBUST PARSER ---
const parseGeminiResponse = (rawText: string, metadata: any[]): AnalysisResult => {
  let structuredData = null;
  let markdownReport = rawText;

  // Attempt to find JSON block
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);

  if (jsonMatch && jsonMatch[1]) {
    try {
      // Clean potential trailing commas or formatting issues
      const cleanJson = jsonMatch[1]
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      structuredData = JSON.parse(cleanJson);
      // Remove the JSON block from the report text
      markdownReport = rawText.replace(jsonMatch[0], '').trim();
    } catch (e) {
      console.error("JSON Parse Failed:", e);
    }
  } else {
      // Fallback: look for raw object brackets
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
          try {
              const potentialJson = rawText.substring(firstBrace, lastBrace + 1);
              structuredData = JSON.parse(potentialJson);
              markdownReport = rawText.replace(potentialJson, '').trim();
          } catch (e) {}
      }
  }

  if (!markdownReport) markdownReport = "Analysis completed but returned no text content. Please try again.";

  return {
    markdownReport,
    structuredData,
    groundingChunks: metadata
  };
};

// --- CORE GENERATION FUNCTION ---
const generateAnalysis = async (mode: string, data: any) => {
    if (!apiKey) {
        throw new Error("Missing API Key. Please add API_KEY to your .env file.");
    }

    let systemInstruction = "";
    let prompt = "";
    
    const jsonSystemInstruction = `
      You are a Senior Forensic Financial Analyst.
      
      CRITICAL OPERATIONAL PROTOCOL:
      1. **JSON DATA IS PRIORITY #1**: You MUST output the JSON block *immediately* at the start of your response. Wrap it in \`\`\`json ... \`\`\`.
      2. **SEARCH FAILURE FALLBACK**: If the search tool returns no results, fails, or times out, YOU MUST PROCEED using your internal training data. DO NOT return error messages. DO NOT return empty JSON. Generate high-confidence *ESTIMATES* for all metrics.
      3. **KILL THE BIAS**: Default to "Hold" or "Sell". Be cynical.
      4. **SWOT PRECISION**: EXACTLY 4 distinct points per category.
      5. **CONCISE VERDICT**: The text report (Step 2) must be a high-impact summary (max 300 words).

      STEP 1: GENERATE JSON DATA
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
            "fundamentals": "Brief fundamental summary.",
            "peerContext": "Brief peer comparison.",
            "speculativeActivity": "Moderate" | "High" | "Low" | "Extreme",
            "burstTrigger": "Catalyst.",
            "liquidityStatus": "Abundant" | "Neutral" | "Drying Up" | "Illiquid"
        },
        "warningSignals": ["Signal 1", "Signal 2"],
        "swot": {
          "strengths": ["1", "2", "3", "4"],
          "weaknesses": ["1", "2", "3", "4"],
          "opportunities": ["1", "2", "3", "4"],
          "threats": ["1", "2", "3", "4"]
        },
        "whistleblower": {
           "integrityScore": number (0-100),
           "forensicVerdict": "Summary",
           "anomalies": ["Anomaly 1", "Anomaly 2"],
           "insiderDetails": ["Detail 1"]
        },
        "topBubbleAssets": [
            { "name": "Asset", "riskScore": 90, "sector": "Tech", "price": "$100", "reason": "Reason" }
        ]
      }
      \`\`\`

      STEP 2: FORENSIC VERDICT (Markdown)
      Write a high-impact, 3-paragraph executive summary. 
      Paragraph 1: The Trap (Hidden risks).
      Paragraph 2: The Numbers (Forensic evidence).
      Paragraph 3: The Verdict.
      
      MANDATORY ENDING: [[[Strong Buy]]], [[[Buy]]], [[[Hold]]], [[[Sell]]], or [[[Strong Sell]]].
    `;

    // Configure Prompt based on Mode
    if (mode === 'market') {
        systemInstruction = jsonSystemInstruction;
        prompt = `Perform a forensic deep-dive analysis for: "${data}". If search fails, ESTIMATE values.`;
    } else if (mode === 'portfolio') {
        systemInstruction = jsonSystemInstruction;
        prompt = `Audit this portfolio for risk and exposure: ${data}.`;
    } else if (mode === 'bubbles') {
        systemInstruction = jsonSystemInstruction;
        prompt = `Scan global markets for major Bubbles, Overvalued Assets, and Crash Risks. Identify at least 4-6 specific assets.`;
    }

    try {
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

        // Extract Search Metadata (Grounding)
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

        return {
            text: result.text || "",
            metadata: uniqueSources
        };

    } catch (error: any) {
        console.error("Gemini SDK Error:", error);
        throw new Error(error.message || "AI Connection Failed");
    }
};

// --- EXPORTED FUNCTIONS ---

export const analyzeMarket = async (query: string, onUpdate?: (data: AnalysisResult) => void): Promise<AnalysisResult> => {
  const { text, metadata } = await generateAnalysis('market', query);
  const result = parseGeminiResponse(text, metadata);
  if (onUpdate) onUpdate(result);
  return result;
};

export const analyzePortfolio = async (portfolio: PortfolioItem[], onUpdate?: (data: AnalysisResult) => void): Promise<AnalysisResult> => {
  const data = JSON.stringify(portfolio);
  const { text, metadata } = await generateAnalysis('portfolio', data);
  const result = parseGeminiResponse(text, metadata);
  if (onUpdate) onUpdate(result);
  return result;
};

export const analyzeBubbles = async (onUpdate?: (data: AnalysisResult) => void): Promise<AnalysisResult> => {
  const { text, metadata } = await generateAnalysis('bubbles', {});
  const result = parseGeminiResponse(text, metadata);
  if (onUpdate) onUpdate(result);
  return result;
};

export const chatWithGemini = async (
  history: any[], 
  message: string, 
  context: { symbol: string, riskScore: number, sentiment: string }
): Promise<string> => {
    if (!apiKey) return "API Key Missing";

    const systemInstruction = `
        You are 'The Reality Check', a witty, sarcastic, but intelligent financial assistant.
        CONTEXT: Asset: ${context.symbol || 'General'}, Risk: ${context.riskScore || 0}/100.
        Keep it short. Use emojis.
    `;
    
    const prompt = `Current User Message: ${message}`;
    
    // Convert history to compatible format if needed, though 'history' passed in is usually pre-formatted.
    // We'll append the new message to the history for the 'contents' array.
    const contents = [...history, { role: 'user', parts: [{ text: prompt }] }];

    try {
        const result = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                maxOutputTokens: 1000,
                temperature: 0.7
            }
        });
        return result.text || "I'm speechless.";
    } catch (error) {
        console.error("Chat Error:", error);
        return "Connection lost. The Reality Check is offline.";
    }
};