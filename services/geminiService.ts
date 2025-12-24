import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, PortfolioItem } from '../types';

// Initialize Gemini AI Client
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY is missing. Please check your .env file.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

// --- SYSTEM INSTRUCTIONS ---
const ANALYST_SYSTEM_INSTRUCTION = `
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

const CHAT_SYSTEM_INSTRUCTION = `
You are 'The Reality Check', a witty, sarcastic, but intelligent financial assistant.
PERSONALITY:
- High Risk (>60): Roast the user. "Do you hate money?"
- Low Risk (<40): Praise the user. "Finally, a smart move."
- Keep it short. Use emojis.
`;

// --- ROBUST PARSER ---
const parseGeminiResponse = (rawText: string, metadata: any[]): AnalysisResult => {
  let structuredData = null;
  let markdownReport = rawText;

  // 1. Regex to find the JSON block inside ```json ... ```
  const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/);

  if (jsonMatch && jsonMatch[1]) {
    try {
      const cleanJson = jsonMatch[1].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      structuredData = JSON.parse(cleanJson);
      markdownReport = rawText.replace(jsonMatch[0], '').trim();
    } catch (e) {
      console.error("JSON Parse Failed:", e);
    }
  } else {
      // Fallback 2: Try to find the first '{' and last '}'
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

  // If parsing failed completely, ensure markdownReport is not null
  if (!markdownReport) markdownReport = "Analysis completed but returned no text content. Please try again.";

  return {
    markdownReport,
    structuredData,
    groundingChunks: metadata
  };
};

// Execute Request using Google GenAI SDK
const executeGenAIRequest = async (prompt: string, systemInstruction: string) => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                tools: [{ googleSearch: {} }],
                temperature: 0.3
            }
        });

        // Extract Text
        const text = response.text || "";

        // Extract Grounding Metadata
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        // Clean metadata for frontend
        const sources = groundingChunks
            .filter((c: any) => c.web?.uri)
            .map((c: any) => ({ web: c.web }));

        // Deduplicate sources
        const uniqueSources = Array.from(new Set(sources.map((s: any) => s.web.uri)))
            .map(uri => sources.find((s: any) => s.web.uri === uri));

        return { text, metadata: uniqueSources };

    } catch (error: any) {
        console.error("Gemini API Error:", error);
        throw new Error(error.message || "Failed to contact Gemini AI");
    }
};

export const analyzeMarket = async (query: string, onUpdate?: (data: AnalysisResult) => void): Promise<AnalysisResult> => {
  const prompt = `Perform a forensic deep-dive analysis for: "${query}".`;
  const { text, metadata } = await executeGenAIRequest(prompt, ANALYST_SYSTEM_INSTRUCTION);
  
  const result = parseGeminiResponse(text, metadata);
  if (onUpdate) onUpdate(result);
  return result;
};

export const analyzePortfolio = async (portfolio: PortfolioItem[], onUpdate?: (data: AnalysisResult) => void): Promise<AnalysisResult> => {
  const data = JSON.stringify(portfolio);
  const prompt = `Audit this portfolio for risk and exposure: ${data}.`;
  const { text, metadata } = await executeGenAIRequest(prompt, ANALYST_SYSTEM_INSTRUCTION);
  
  const result = parseGeminiResponse(text, metadata);
  if (onUpdate) onUpdate(result);
  return result;
};

export const analyzeBubbles = async (onUpdate?: (data: AnalysisResult) => void): Promise<AnalysisResult> => {
  const prompt = `Scan global markets for major Bubbles, Overvalued Assets, and Crash Risks. Identify at least 4-6 specific assets in the 'topBubbleAssets' JSON array.`;
  const { text, metadata } = await executeGenAIRequest(prompt, ANALYST_SYSTEM_INSTRUCTION);
  
  const result = parseGeminiResponse(text, metadata);
  if (onUpdate) onUpdate(result);
  return result;
};

export const chatWithGemini = async (
  history: any[], 
  message: string, 
  context: { symbol: string, riskScore: number, sentiment: string }
): Promise<string> => {
    try {
        const contextStr = `CONTEXT: Asset: ${context.symbol || 'General'}, Risk: ${context.riskScore || 0}/100.`;
        
        // Create Chat
        const chat = ai.chats.create({
            model: "gemini-1.5-flash",
            config: {
                systemInstruction: CHAT_SYSTEM_INSTRUCTION + "\n" + contextStr,
            },
            history: history
        });

        const result = await chat.sendMessage({ message: message });
        return result.text;

    } catch (error) {
        console.error("Chat Error:", error);
        return "I'm having trouble connecting to the network right now.";
    }
};