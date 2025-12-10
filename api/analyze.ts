import { GoogleGenAI } from "@google/genai";

export const config = {
  maxDuration: 60, 
};

// Re-defining types
interface PortfolioItem {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { mode, data, fastMode } = await req.json();
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Server misconfigured: API Key missing.' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelId = "gemini-2.5-flash";

    let systemInstruction = '';
    let prompt = '';
    
    // Logic to determine if we use tools or not
    const useTools = !fastMode;
    const toolConfig = useTools ? { tools: [{ googleSearch: {} }] } : {};

    if (mode === 'market') {
      const query = data;
      prompt = query;
      
      const baseInstruction = `
        You are a Senior Financial Analyst. 
        Goal: Provide a HIGH-CONVICTION investment analysis.
        
        Structure:
        1. **Markdown Report (Keep it concise, under 300 words):**
           - **Executive Summary:** Buy/Sell/Hold verdict.
           - **Key Metrics Table:** Price, P/E, 52w High/Low.
           - **Catalysts:** What moves the stock next?
           - **Final Verdict:** strictly wrapped: [[[Buy]]], [[[Hold]]], etc.

        2. **JSON Data Block (Strictly at the end, wrapped in \`\`\`json):**
           - 'riskScore' (0-100)
           - 'bubbleProbability' (0-100)
           - 'marketSentiment' (Bullish/Bearish)
           - 'trendData': Generate **4 months** of realistic weekly price points ending at Current Price. Calculate 'ma50' and 'rsi'.
           - 'warningSignals': 2-3 brief bullet points.
           - 'swot': Simple arrays.

        Schema:
        {
          "riskScore": number,
          "riskLevel": "Low"|"Moderate"|"High",
          "bubbleProbability": number,
          "marketSentiment": string,
          "keyMetrics": [ {"label": "P/E", "value": "20x"} ],
          "trendData": [ {"label": "W1", "value": 100, "ma50": 95, "rsi": 55} ],
          "warningSignals": ["High P/E"],
          "swot": { "strengths": [], "weaknesses": [], "opportunities": [], "threats": [] }
        }
      `;

      if (useTools) {
        systemInstruction = `${baseInstruction}
        Tool: Use Google Search to fetch REAL-TIME price and news.`;
      } else {
         // Fast mode instruction: No tools, estimate data
        systemInstruction = `${baseInstruction}
        CRITICAL: Real-time search is unavailable. 
        You MUST provide plausible ESTIMATES based on your last known data.
        In the report, explicitly mention that data is estimated/historical.
        DO NOT fail. Generate the best possible analysis with internal knowledge.`;
      }

    } else if (mode === 'portfolio') {
      const portfolio = data as PortfolioItem[];
      const summary = portfolio.slice(0, 10).map(p => `${p.quantity} ${p.symbol} @ $${p.buyPrice}`).join(', ');
      
      prompt = "Audit my portfolio.";
      systemInstruction = `
        Role: Portfolio Risk Manager.
        Portfolio: [${summary}]
        
        Task:
        1. Concise Markdown report on diversification and risk.
        2. JSON block with 'riskScore' (0-100), 'bubbleProbability' and aggregated 'trendData' (mocked index performance).
        
        ${!useTools ? "Real-time search unavailable. Analyze based on asset allocation fundamentals only." : ""}
        Keep it fast.
      `;
    } else {
       return new Response(JSON.stringify({ error: 'Invalid mode' }), { status: 400 });
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        ...toolConfig,
        // Limit output tokens to prevent timeouts
        maxOutputTokens: 1500, 
      },
    });

    const text = response.text || "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as any[] || [];

    let structuredData: any | undefined;
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
    const cleanReport = text.replace(codeBlockRegex, (match, group1) => {
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

    const result = {
      markdownReport: cleanReport,
      structuredData,
      groundingChunks: groundingChunks.map(chunk => ({
        web: chunk.web ? { uri: chunk.web.uri, title: chunk.web.title } : undefined
      })).filter(c => c.web !== undefined),
    };

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: 'Analysis failed.' }), { status: 500 });
  }
}