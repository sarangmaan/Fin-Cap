import { AnalysisResult, PortfolioItem } from "../types";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.error("API_KEY is missing. Please add API_KEY to your Render Environment Variables.");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

type StreamUpdate = (data: Partial<AnalysisResult>) => void;

export const analyzeMarket = async (query: string, onUpdate?: StreamUpdate): Promise<AnalysisResult> => {
  if (!apiKey) throw new Error("API Key is missing. Please add 'API_KEY' to your Render Environment Variables and Redeploy.");

  const prompt = `
    Perform a deep-dive financial analysis for: "${query}".
    
    TASK:
    1. If the query is a specific PUBLIC COMPANY (e.g., Apple, TSLA):
       - SEARCH for Real-Time Price, Today's Change %, Market Cap, and P/E Ratio.
       - SEARCH for **Technical Indicators**: RSI, MACD status, Moving Averages (50/200 DMA status).
       - SEARCH for recent analyst upgrades/downgrades and major news.
       - **FORENSIC SCAN**: Deeply investigate:
          - "Insider selling [Company Name] last 6 months" (Look for specific names/amounts)
          - "Short seller reports [Company Name]"
          - "Litigation [Company Name] 2024"
          - "Auditor changes or accounting concerns [Company Name]"
          - "Opaque offshore subsidiaries [Company Name]"
       
    2. If the query is a SECTOR, MARKET, or ECONOMIC TOPIC:
       - SEARCH for macro contradictions (e.g., "Yield curve vs. Equity rally").
       - SEARCH for hidden systemic risks.
    
    3. Analyze the gathered data to determine risks, opportunities, AND hidden anomalies.
    
    4. ESTIMATE recent price action to generate a trend chart (trendData) if exact historical CSV data is unavailable.
  `;
  
  const systemInstruction = `
    You are an Elite Forensic Accountant & Market Whistleblower.
    
    **OBJECTIVE**: 
    Provide a standard report, but your "Whistleblower" section must be a masterclass in forensic digging. Do not just state the obvious. Look for the "skeletons in the closet".
    
    **REPORT STRUCTURE (Markdown)**:
    1. Executive Summary: 
        - Current Status/Price (Plain Text, Bold)
    2. Real-Time Catalysts:
        - What is moving the asset/market *today*?
    3. Valuation & Risk:
        - Is it overvalued? What are the bubble risks?
    4. Final Verdict:
        - A detailed explanation of why you reached your conclusion.
        - **ONLY AT THE VERY END OF THIS SECTION**, output the verdict strictly as: [[[BUY]]] or [[[SELL]]] or [[[HOLD]]] or [[[CAUTION]]] or [[[STRONG BUY]]] or [[[STRONG SELL]]].

    **DATA STRUCTURE (JSON)**:
    Generate a valid JSON block at the very end of your response inside \`\`\`json code fences.
    
    The "whistleblower" section MUST be long and detailed. If you find no major issues, explain WHY the integrity is high.
    {
      "riskScore": number,
      "riskLevel": "Low" | "Moderate" | "High" | "Critical",
      "bubbleProbability": number,
      "marketSentiment": "Bullish" | "Bearish" | "Neutral",
      "keyMetrics": [ { "label": "Price", "value": "$..." } ],
      "trendData": [ { "label": "01-01", "value": 100, "ma50": 95, "rsi": 50 } ], 
      "technicalAnalysis": "A 2-3 sentence summary of the technical setup (e.g., 'Stock is forming a double top pattern with RSI divergence at 75. 50 DMA support broken...').",
      "warningSignals": [ "Signal 1" ],
      "swot": { 
        "strengths": ["Specific point 1", "Specific point 2", "Specific point 3"], 
        "weaknesses": ["Specific point 1", "Specific point 2", "Specific point 3"], 
        "opportunities": ["Specific point 1", "Specific point 2", "Specific point 3"], 
        "threats": ["Specific point 1", "Specific point 2", "Specific point 3"] 
      },
      "bubbleAudit": {
        "valuationVerdict": "Undervalued" | "Fair Value" | "Overvalued" | "Bubble Territory",
        "score": number,
        "fundamentalDivergence": "Explain specifically e.g. 'P/E is 50x while growth slowed to 5%...'",
        "peerComparison": "Compare specifically to 2-3 competitors.",
        "speculativeActivity": "Low" | "Moderate" | "High" | "Extreme"
      },
      "whistleblower": {
        "integrityScore": number,
        "verdict": "Clean" | "Suspicious" | "High Risk" | "Manipulation Detected",
        "forensicVerdict": "A 2-3 sentence summary of the forensic audit results.",
        "anomalies": [ 
           "Detailed anomaly 1 (e.g. CEO selling 50% of holdings ahead of earnings)", 
           "Detailed anomaly 2 (e.g. Inventory rising 3x faster than sales)", 
           "Detailed anomaly 3 (e.g. Sudden resignation of CFO)" 
        ],
        "insiderActivity": "A comprehensive paragraph on recent insider trades, share buybacks, or share dilution.",
        "accountingFlags": "A detailed look at the quality of earnings, cash flow vs net income, and Capex trends.",
        "networkAnalysis": "Analyze the company's relationships, major shareholders, and any opaque subsidiary structures or joint ventures.",
        "regulatoryFriction": "List ongoing SEC/DOJ investigations, antitrust lawsuits, or compliance failures.",
        "sentimentDivergence": "Contrast retail 'Hype' (social media) against institutional flow (13F filings)."
      }
    }
  `;

  return await executeGeminiRequest(prompt, systemInstruction, onUpdate);
};

export const analyzePortfolio = async (portfolio: PortfolioItem[], onUpdate?: StreamUpdate): Promise<AnalysisResult> => {
  if (!apiKey) throw new Error("API Key is missing.");
  const summary = portfolio.map(p => `${p.quantity} shares of ${p.symbol}`).join(', ');
  const prompt = `Audit this portfolio: ${summary}.`;
  const systemInstruction = `Role: Hedge Fund Risk Manager. Constraint: Only output the verdict badge [[[...]]] at the end of the report.`;
  return await executeGeminiRequest(prompt, systemInstruction, onUpdate);
};

export const analyzeBubbles = async (onUpdate?: StreamUpdate): Promise<AnalysisResult> => {
    if (!apiKey) throw new Error("API Key is missing.");
    const prompt = `Scan global markets for Bubbles.`;
    const systemInstruction = `Role: Forensic Financial Analyst. Constraint: Only output the verdict badge [[[...]]] at the end of the report.`;
    return await executeGeminiRequest(prompt, systemInstruction, onUpdate);
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function executeGeminiRequest(prompt: string, systemInstruction: string, onUpdate?: StreamUpdate): Promise<AnalysisResult> {
  let attempt = 0;
  const maxRetries = 3;
  let backoff = 2000;

  while (attempt <= maxRetries) {
    try {
      // USING gemini-2.0-flash-exp to avoid 404 (1.5 mismatch) and 429 (2.0 stable limit)
      const result = await ai.models.generateContentStream({
        model: "gemini-2.0-flash-exp",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          tools: [{ googleSearch: {} }],
        },
      });

      let fullText = "";
      let groundingChunks: any[] = [];
      
      for await (const chunk of result) {
        if (chunk.text) {
          fullText += chunk.text;
          if (onUpdate) onUpdate({ markdownReport: fullText, isEstimated: false });
        }
        const metadata = chunk.candidates?.[0]?.groundingMetadata;
        if (metadata?.groundingChunks) groundingChunks.push(...metadata.groundingChunks);
      }

      let structuredData: any | undefined;
      const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
      
      const cleanReport = fullText.replace(codeBlockRegex, (match, group1) => {
          if (!structuredData) {
              try {
                  const potentialData = JSON.parse(group1);
                  if (potentialData.riskScore !== undefined) {
                      structuredData = potentialData;
                      return "";
                  }
              } catch (e) {}
          }
          return match; 
      }).trim();

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
      console.error("Gemini Request Error:", error);
      const isOverloaded = error.message?.includes('503') || error.message?.includes('overloaded') || error.status === 503 || error.status === 429;
      
      // If we are hitting rate limits, retry with backoff
      if (isOverloaded && attempt < maxRetries) {
        await delay(backoff);
        backoff *= 2;
        attempt++;
        continue;
      }
      
      // If the error persists or is not a rate limit, throw it up
      throw new Error(error.message || "Failed to contact Gemini API.");
    }
  }
  throw new Error("Service unavailable. Rate limits reached.");
}