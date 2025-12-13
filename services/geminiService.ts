import { AnalysisResult, PortfolioItem } from "../types";
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini SDK with the API Key injected by Vite
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY is missing. Please check your .env file.");
}
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export const analyzeMarket = async (query: string): Promise<AnalysisResult> => {
  if (!apiKey) throw new Error("API Key is missing. Check .env configuration.");

  const prompt = `
    Perform a financial analysis for: "${query}".
    
    1. SEARCH for the CURRENT STOCK PRICE, today's change, and recent news.
    2. SEARCH for P/E ratio, Market Cap, and recent analyst ratings.
    3. Analyze the data.
  `;
  
  const systemInstruction = `
    You are a Senior Financial Analyst & Risk Manager.
    
    **OBJECTIVE**: 
    Use Google Search to find real-time market data, then analyze it.
    
    **REPORT STRUCTURE (Markdown)**:
    1. **Executive Summary**: 
        - Current Price & Ticker (Bold)
        - Immediate Verdict (BUY / SELL / HOLD / CAUTION)
    2. **Real-Time Catalysts**:
        - What is moving the stock *today*?
    3. **Valuation & Risk**:
        - Is it overvalued?
    4. **Final Verdict**:
        - Format strictly as: [[[BUY]]] or [[[SELL]]] or [[[HOLD]]] or [[[CAUTION]]]

    **DATA STRUCTURE (JSON)**:
    Generate a valid JSON block at the very end of your response inside \`\`\`json code fences.
    {
      "riskScore": number (0-100),
      "riskLevel": "Low" | "Moderate" | "High" | "Critical",
      "bubbleProbability": number (0-100),
      "marketSentiment": "Bullish" | "Bearish" | "Neutral",
      "keyMetrics": [ { "label": "Price", "value": "$..." } ],
      "trendData": [ { "label": "Now", "value": 100 } ], 
      "warningSignals": [ "Signal 1" ],
      "swot": { "strengths": [], "weaknesses": [], "opportunities": [], "threats": [] }
    }
  `;

  return await executeGeminiRequest(prompt, systemInstruction);
};

export const analyzePortfolio = async (portfolio: PortfolioItem[]): Promise<AnalysisResult> => {
  if (!apiKey) throw new Error("API Key is missing. Check .env configuration.");

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
    2. JSON Data Block (same schema as market analysis).
  `;

  return await executeGeminiRequest(prompt, systemInstruction);
};

// Common execution logic
async function executeGeminiRequest(prompt: string, systemInstruction: string): Promise<AnalysisResult> {
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

    return {
      markdownReport: cleanReport || "Analysis generated, but format was unexpected.",
      structuredData,
      groundingChunks: uniqueSources,
      isEstimated: false
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to contact Gemini API.");
  }
}