import { AnalysisResult, PortfolioItem } from "../types";
import { GoogleGenAI } from "@google/genai";

// Try to get the key from process.env (injected by Vite define)
const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.error("API_KEY is missing. Please add API_KEY to your Render Environment Variables.");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

type StreamUpdate = (data: Partial<AnalysisResult>) => void;

export const analyzeMarket = async (query: string, onUpdate?: StreamUpdate): Promise<AnalysisResult> => {
  if (!apiKey) throw new Error("API Key is missing. Please add 'API_KEY' to your Render Environment Variables and Redeploy.");

  const prompt = `
    Perform a financial analysis for: "${query}".
    
    TASK:
    1. If the query is a specific PUBLIC COMPANY (e.g., Apple, TSLA):
       - SEARCH for Real-Time Price, Today's Change %, Market Cap, and P/E Ratio.
       - SEARCH for recent analyst upgrades/downgrades and major news.
       - **FORENSIC SCAN**: Search for "Insider selling [Company Name] last 3 months", "Short seller reports [Company Name]", and "Accounting irregularities [Company Name]".
       
    2. If the query is a SECTOR, MARKET, or ECONOMIC TOPIC (e.g., "AI Bubble", "Housing Market", "Crypto"):
       - SEARCH for major indices performance.
       - SEARCH for contradictory data (e.g., "Jobs report vs. Reality").
    
    3. Analyze the gathered data to determine risks, opportunities, AND hidden anomalies.
    
    4. ESTIMATE recent price action to generate a trend chart (trendData) if exact historical CSV data is unavailable.
  `;
  
  const systemInstruction = `
    You are a Senior Financial Analyst & Forensic Accountant (The "Whistleblower").
    
    **OBJECTIVE**: 
    Provide a standard financial report but ALSO act as a "Digital Lie Detector". You must flag contradictions (e.g., Stock price rising while Insiders are dumping shares).
    
    **REPORT STRUCTURE (Markdown)**:
    1. **Executive Summary**: 
        - Current Status/Price (Bold)
        - Immediate Verdict (BUY / SELL / HOLD / CAUTION / OBSERVING)
    2. **Real-Time Catalysts**:
        - What is moving the asset/market *today*?
    3. **Valuation & Risk**:
        - Is it overvalued? What are the bubble risks?
    4. **Final Verdict**:
        - Format strictly as: [[[BUY]]] or [[[SELL]]] or [[[HOLD]]] or [[[CAUTION]]]

    **IMPORTANT CONSTRAINTS**:
    - **DO NOT** write a "SWOT Analysis" section in the Markdown text. Use JSON.
    - **DO NOT** write a "Whistleblower" section in the Markdown text. Use JSON.

    **DATA STRUCTURE (JSON)**:
    Generate a valid JSON block at the very end of your response inside \`\`\`json code fences.
    {
      "riskScore": number (0-100),
      "riskLevel": "Low" | "Moderate" | "High" | "Critical",
      "bubbleProbability": number (0-100),
      "marketSentiment": "Bullish" | "Bearish" | "Neutral",
      "keyMetrics": [ { "label": "Price", "value": "$..." } ],
      "trendData": [ 
        // MANDATORY: Generate exactly 15 data points representing the last 30 days.
        { "label": "01-01", "value": 145.20, "ma50": 142.50, "rsi": 55 },
        { "label": "01-02", "value": 147.10, "ma50": 143.00, "rsi": 58 }
      ], 
      "warningSignals": [ "Signal 1" ],
      "swot": { "strengths": [], "weaknesses": [], "opportunities": [], "threats": [] },
      "bubbleAudit": {
        "valuationVerdict": "Undervalued" | "Fair Value" | "Overvalued" | "Bubble Territory",
        "score": number (0-100),
        "fundamentalDivergence": "Brief sentence explaining if price is ahead of earnings/revenue.",
        "peerComparison": "Brief sentence comparing P/E or valuation to sector peers.",
        "speculativeActivity": "Low" | "Moderate" | "High" | "Extreme"
      },
      "whistleblower": {
        "integrityScore": number (0-100, where 100 is Clean/Trustworthy and 0 is Fraud/High Risk),
        "verdict": "Clean" | "Suspicious" | "High Risk" | "Manipulation Detected",
        "anomalies": [ "CEO sold $50M stock before bad news", "Revenue up but Cash Flow negative" ],
        "insiderActivity": "Brief summary of insider buying/selling trends.",
        "accountingFlags": "Brief note on any accounting gimmicks or 'adjusted' EBITDA concerns."
      }
    }
  `;

  return await executeGeminiRequest(prompt, systemInstruction, onUpdate);
};

export const analyzePortfolio = async (portfolio: PortfolioItem[], onUpdate?: StreamUpdate): Promise<AnalysisResult> => {
  if (!apiKey) throw new Error("API Key is missing. Please add 'API_KEY' to your Render Environment Variables and Redeploy.");

  const summary = portfolio.map(p => `${p.quantity} shares of ${p.symbol} (Bought @ $${p.buyPrice})`).join(', ');
  
  const prompt = `
    Audit this portfolio: ${summary}.
    1. SEARCH for the current price of each stock to calculate current value and P/L.
    2. Assess diversification and risk.
  `;
  
  const systemInstruction = `
    Role: Hedge Fund Risk Manager.
    Output:
    1. Markdown Report (Assessment, Diversification Check, Actionable Advice).
    2. JSON Data Block (same schema as market analysis, including 'trendData' for the overall portfolio value over time).
    
    Constraint: Do NOT include a text-based SWOT section. Use the JSON for SWOT.
  `;

  return await executeGeminiRequest(prompt, systemInstruction, onUpdate);
};

export const analyzeBubbles = async (onUpdate?: StreamUpdate): Promise<AnalysisResult> => {
    if (!apiKey) throw new Error("API Key is missing. Please add 'API_KEY' to your Render Environment Variables and Redeploy.");

    const prompt = `
      Scan the current global financial markets (Stocks, Crypto, Real Estate) for Bubbles and Overvaluation.
      
      TASK:
      1. SEARCH for sectors with historically high P/E ratios, FOMO sentiment, or disconnected valuations.
      2. SEARCH for "Market Crash Warning [Current Year]" and "Overvalued Stocks [Current Month]".
      3. Identify specific assets (e.g., AI Stocks, Specific Coins, Housing Markets) that are at risk.
    `;
    
    const systemInstruction = `
      Role: Forensic Financial Analyst & Crash Predictor.
      Tone: Serious, Cautionary, Data-Driven.

      **REPORT STRUCTURE (Markdown)**:
      1. **Global Bubble Index**: Summary of overall market frothiness.
      2. **The "Red Zones"**: Detailed breakdown of the most dangerous sectors.
      3. **Historical Parallels**: Comparison to Dot-com (2000) or 2008 if relevant.
      4. **Safe Havens**: Where capital is flowing for safety.
      
      **IMPORTANT**: DO NOT write a SWOT analysis in text.

      **DATA STRUCTURE (JSON)**:
      Generate a valid JSON block at the very end of your response inside \`\`\`json code fences.
      {
        "riskScore": number (Overall Market Risk 0-100),
        "riskLevel": "Low" | "Moderate" | "High" | "Critical",
        "bubbleProbability": number (0-100),
        "marketSentiment": "Bearish" | "Neutral" | "Euphoric",
        "keyMetrics": [ { "label": "VIX", "value": "15.2" }, { "label": "Buffett Indicator", "value": "180%" } ],
        "trendData": [ 
          // Generate a chart showing the divergence between Price and Fundamental Value over the last year for the most bubbled asset
          { "label": "Jan", "value": 100, "ma50": 100 }, 
          { "label": "Feb", "value": 110, "ma50": 102 } 
        ], 
        "warningSignals": [ "Extreme Greed Index", "RSI Divergence" ],
        "topBubbleAssets": [
            { 
               "name": "Name of Asset/Sector", 
               "riskScore": 90, 
               "sector": "Tech", 
               "price": "$123.45",
               "reason": "Trading at 200x earnings with slowing growth."
            }
        ]
      }
    `;
  
    return await executeGeminiRequest(prompt, systemInstruction, onUpdate);
  };

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Common execution logic with Retry
async function executeGeminiRequest(prompt: string, systemInstruction: string, onUpdate?: StreamUpdate): Promise<AnalysisResult> {
  let attempt = 0;
  const maxRetries = 3;
  let backoff = 2000; // Start with 2 seconds

  while (attempt <= maxRetries) {
    try {
      const result = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          tools: [{ googleSearch: {} }],
        },
      });

      let fullText = "";
      let groundingChunks: any[] = [];
      
      // Iterate through the stream
      for await (const chunk of result) {
        if (chunk.text) {
          fullText += chunk.text;
          
          if (onUpdate) {
              onUpdate({ 
                  markdownReport: fullText,
                  isEstimated: false
              });
          }
        }
        const metadata = chunk.candidates?.[0]?.groundingMetadata;
        if (metadata?.groundingChunks) {
          groundingChunks.push(...metadata.groundingChunks);
        }
      }

      // Process the final result
      let structuredData: any | undefined;
      const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
      
      // Clean the markdown report by removing the JSON block
      const cleanReport = fullText.replace(codeBlockRegex, (match, group1) => {
          if (!structuredData) {
              try {
                  const potentialData = JSON.parse(group1);
                  if (potentialData.riskScore !== undefined) {
                      structuredData = potentialData;
                      return ""; // Remove the JSON block from the visible report
                  }
              } catch (e) {}
          }
          return match; 
      }).trim();

      // Filter duplicate sources
      const uniqueSources = [];
      const seenUris = new Set();
      for (const g of groundingChunks) {
          if (g.web?.uri && !seenUris.has(g.web.uri)) {
              seenUris.add(g.web.uri);
              uniqueSources.push(g);
          }
      }

      const finalResult = {
        markdownReport: cleanReport || "Analysis generated.",
        structuredData,
        groundingChunks: uniqueSources,
        isEstimated: false
      };

      if (onUpdate) onUpdate(finalResult);
      return finalResult;

    } catch (error: any) {
      console.error(`Gemini API Error (Attempt ${attempt + 1}):`, error);
      
      // Check for 503 or overload errors
      const isOverloaded = error.message?.includes('503') || error.message?.includes('overloaded') || error.status === 503;
      
      if (isOverloaded && attempt < maxRetries) {
        console.warn(`Model overloaded. Retrying in ${backoff}ms...`);
        if (onUpdate) {
            onUpdate({ markdownReport: `*Server is currently busy. Retrying analysis (Attempt ${attempt + 2}/${maxRetries + 1})...*` });
        }
        await delay(backoff);
        backoff *= 2; // Exponential backoff
        attempt++;
        continue;
      }
      
      // If we're out of retries or it's a different error
      throw new Error(error.message || "Failed to contact Gemini API.");
    }
  }
  
  throw new Error("Service unavailable. Please try again later.");
}