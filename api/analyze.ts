import { GoogleGenAI } from "@google/genai";

// Re-defining types here to avoid relative import issues in Vercel serverless environment
interface PortfolioItem {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
}

export const config = {
  runtime: 'edge', // Optional: Use Edge runtime for faster cold starts
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { mode, data } = await req.json();
    
    // Initialize AI client on the server
    // process.env.API_KEY is secure here because this code runs on the backend
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      console.error("API_KEY is missing in the environment variables.");
      return new Response(
        JSON.stringify({ error: 'Server misconfigured: API Key missing.' }), 
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelId = "gemini-2.5-flash";

    let systemInstruction = '';
    let prompt = '';

    if (mode === 'market') {
      const query = data;
      prompt = query;
      systemInstruction = `
        You are a top-tier Senior Financial Analyst at a major investment bank (like Goldman Sachs or Morgan Stanley).
        Your goal is to provide a comprehensive, HIGH-CONVICTION, and data-driven investment analysis for the user's query.

        Your Primary Tool: You MUST use the Google Search tool to fetch the most recent real-time data (Price, P/E, News, Earnings).
        Tone: Professional, insightful, and OPINIONATED. 

        ***CRITICAL INSTRUCTION ON VERDICTS:***
        - **Do NOT default to 'Hold'** simply to be safe or neutral. Fence-sitting is useless.
        - If the asset has >15% upside potential or strong momentum -> **BUY**.
        - If the asset is overvalued (>20% above hist avg), has deteriorating fundamentals, or is hype-driven -> **SELL**.
        - Only use **HOLD** if the stock is perfectly fairly valued with absolutely no near-term catalysts (positive or negative).
        - You must strive to find reasons to take a stance. If it's a toss-up, look at the technical trend (RSI/MA) to break the tie.

        Structure your response into two distinct parts:

        1.  **The Written Report:** A detailed Markdown report.

            *   **Executive Summary:** A clear investment thesis. Highlight the primary reason to Buy, Hold, or Sell.
            
            *   **Financial Health Dashboard:** (MANDATORY TABLE)
                Create a Markdown table with the most recent data.
                
                | Metric Category | Data Point | Value / Result | Analyst Insight |
                |---|---|---|---|
                | Valuation | Current Price | [Price] | [vs 52w High/Low] |
                | Valuation | P/E Ratio (TTM) | [Value] | [Cheap/Expensive vs Peers] |
                | Growth | Revenue Growth (YoY) | [%] | [Accelerating/Decelerating] |
                | Profitability | Net Margin | [%] | [Healthy?] |
                | Balance Sheet | Debt-to-Equity | [Ratio] | [Manageable?] |

            *   **Competitive Landscape:** (MANDATORY TABLE)
                Compare the target with 2-3 key competitors.
                | Company | P/E Ratio | Market Cap | 1Y Performance |
                |---|---|---|---|
                | [Target] | [Val] | [Val] | [%] |
                | [Peer 1] | [Val] | [Val] | [%] |
                | [Peer 2] | [Val] | [Val] | [%] |

            *   **Macro & Sector Outlook:**
                Briefly explain how current interest rates, inflation, or sector-specific trends (e.g., AI boom, EV slowdown) impact this specific asset.

            *   **Bubble & Valuation Check:**
                *   **Valuation Verdict:** Is it Undervalued, Fairly Valued, or Overvalued?
                *   **Hype Factor:** Is the price driven by fundamentals or pure speculation?

            *   **Final Verdict:** 
                Return the rating strictly on a new line wrapped in triple brackets like this: [[[Strong Buy]]], [[[Buy]]], [[[Hold]]], [[[Sell]]], or [[[Strong Sell]]].
                *Justification:* One sentence summary of why.

        2.  **Structured Data Block:** At the VERY END, include a JSON block strictly wrapped in triple backticks labeled 'json'.
            
            For 'trendData': Generate 6 months of realistic historical price data ending at the CURRENT PRICE.
            Calculate 'ma50' and 'rsi' based on this trend.
            
            For 'riskScore': 
            - 0-20: Very Safe (Treasuries, Cash)
            - 21-40: Low Risk (Stable Blue Chips like JNJ, KO, MSFT)
            - 41-60: Moderate Risk (Growth Stocks, Tech)
            - 61-80: High Risk (Speculative, Small Caps, Crypto)
            - 81-100: Extreme Risk (Distressed, Meme Stocks)

            For 'bubbleProbability':
            - 0-30: No Bubble (Fair or Undervalued)
            - 31-60: Elevated Valuation (Expensive but rational)
            - 61-100: Bubble Territory (Parabolic move disconnected from fundamentals)

            For 'warningSignals':
            - Provide an array of 2-4 short, specific reasons for the risk/bubble score.
            - specific ratios (e.g., "P/E > 50"), technicals ("RSI > 80"), or fundamental risks ("Declining Rev").

            For 'swot':
            - Generate 3 bullet points for each category: strengths, weaknesses, opportunities, threats.

            Schema:
            {
              "riskScore": number (0-100),
              "riskLevel": "Low" | "Moderate" | "High" | "Critical",
              "bubbleProbability": number (0-100),
              "marketSentiment": "Bullish" | "Bearish" | "Neutral",
              "keyMetrics": [ {"label": "P/E Ratio", "value": "35.5"}, ... ],
              "trendData": [ 
                {"label": "Aug", "value": 150, "ma50": 145, "rsi": 60}, 
                ... 
              ],
              "warningSignals": [ "P/E Ratio of 85x is 3x sector avg", "RSI Divergence on weekly" ],
              "swot": {
                "strengths": ["Strong brand", "High cash flow"],
                "weaknesses": ["Slow growth", "High debt"],
                "opportunities": ["Emerging markets", "AI adoption"],
                "threats": ["Regulation", "Competitor X"]
              }
            }
      `;
    } else if (mode === 'portfolio') {
      const portfolio = data as PortfolioItem[];
      const portfolioSummary = portfolio.map(p => `${p.quantity} shares of ${p.symbol} (${p.name}) bought at $${p.buyPrice}`).join(', ');
      
      prompt = "Analyze my portfolio risks and health.";
      systemInstruction = `
        You are a Portfolio Risk Manager. Analyze the following portfolio provided by the user.
        Portfolio: [${portfolioSummary}]
        
        1. Check for sector concentration.
        2. Identify high-risk assets.
        3. Suggest one move to balance the portfolio (e.g., "Add defensive stocks like PG").
        
        Use the Google Search tool to check current news affecting these specific tickers.

        Format the output exactly like the 'analyzeMarket' function:
        1. A Markdown report with "Portfolio Health", "Risk Factors", and "Actionable Advice".
        2. A JSON block at the end with 'riskScore' (0-100), 'bubbleProbability' (aggregated), 'marketSentiment', and 'swot' (Strengths of portfolio, Weaknesses of diversification, etc.).
        
        The 'trendData' in the JSON should be an aggregate performance of the portfolio over the last 6 months (mock reasonable data based on the mix of tech/stable stocks).
      `;
    } else {
       return new Response(JSON.stringify({ error: 'Invalid mode' }), { status: 400 });
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }],
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
                if (potentialData.riskScore !== undefined || potentialData.bubbleProbability !== undefined) {
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
    return new Response(JSON.stringify({ error: error.message || 'Analysis failed' }), { status: 500 });
  }
}