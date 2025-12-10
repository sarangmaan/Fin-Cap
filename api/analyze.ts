import { GoogleGenAI } from "@google/genai";

export const runtime = 'edge';

const ALPHA_VANTAGE_KEY = '91DA6W6JSEUJ7I8E';

// Mock data for fallback when API rate limit is reached
const MOCK_DATA = {
  price: "245.50 (Simulated)",
  changePercent: "+2.4%",
  pe: "32.5",
  peg: "1.8",
  eps: "7.42",
  high52: "260.00",
  low52: "180.00"
};

async function fetchFinancialData(symbol: string) {
  try {
    const [quoteRes, overviewRes] = await Promise.all([
      fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`),
      fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`)
    ]);

    const quote = await quoteRes.json();
    const overview = await overviewRes.json();

    // Check for Alpha Vantage Rate Limit message
    if (quote.Note || overview.Note) {
      return null; // Triggers fallback
    }

    // Check if symbol exists
    if (!quote['Global Quote'] || Object.keys(quote['Global Quote']).length === 0) {
      return undefined; // Symbol not found
    }

    return {
      price: quote['Global Quote']['05. price'],
      changePercent: quote['Global Quote']['10. change percent'],
      pe: overview['PERatio'],
      peg: overview['PEGRatio'],
      eps: overview['EPS'],
      high52: overview['52WeekHigh'],
      low52: overview['52WeekLow']
    };
  } catch (error) {
    console.error("Alpha Vantage Fetch Error:", error);
    return null; // Triggers fallback on network error
  }
}

export default async function POST(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { mode, data } = await req.json();
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server misconfigured: API Key missing.' }), { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelId = "gemini-2.5-flash"; 

    let systemInstruction = '';
    let prompt = '';
    let financialContext = '';

    if (mode === 'market') {
      // 1. Extract Symbol (Simple heuristic: first word before " - ")
      let symbol = data.split(' - ')[0].trim().toUpperCase();
      
      // If input looks like a general query (e.g., "Housing Market"), skip specific stock fetch
      if (symbol.includes(' ') || symbol.length > 6) {
         financialContext = "No specific stock ticker detected. Analyze based on general market knowledge.";
      } else {
         // 2. Fetch Data from Alpha Vantage
         let stockData = await fetchFinancialData(symbol);

         if (stockData === null) {
            // Rate limit hit -> Use Mock
            stockData = MOCK_DATA;
            financialContext = `
            [SYSTEM NOTICE: Real-time data API rate limit reached. Using SIMULATED DATA for demonstration.]
            
            Financial Data for ${symbol}:
            - Current Price: ${stockData.price}
            - Change: ${stockData.changePercent}
            - P/E Ratio: ${stockData.pe}
            - PEG Ratio: ${stockData.peg}
            - EPS: ${stockData.eps}
            - 52 Week High: ${stockData.high52}
            - 52 Week Low: ${stockData.low52}
            `;
         } else if (stockData === undefined) {
             financialContext = `[SYSTEM NOTICE: Could not find financial data for symbol '${symbol}'. Analyze based on general knowledge.]`;
         } else {
             // Success
             financialContext = `
            REAL-TIME FINANCIAL DATA (Source: Alpha Vantage):
            - Symbol: ${symbol}
            - Current Price: $${stockData.price}
            - Change: ${stockData.changePercent}
            - P/E Ratio: ${stockData.pe}
            - PEG Ratio: ${stockData.peg}
            - EPS: ${stockData.eps}
            - 52 Week High: ${stockData.high52}
            - 52 Week Low: ${stockData.low52}
            `;
         }
      }

      prompt = `Analyze: ${data}\n\n${financialContext}`;
      
      systemInstruction = `
        You are a Senior Financial Analyst & Risk Manager.
        
        **OBJECTIVE**: 
        Perform a deep-dive analysis using the provided FINANCIAL DATA context.
        Do NOT complain about missing tools. Use the provided text data or your internal knowledge.

        **REPORT STRUCTURE (Markdown)**:
        1. **Executive Summary**: 
           - Current Price (Bold)
           - Immediate Verdict (BUY / SELL / HOLD / CAUTION)
        2. **Real-Time Catalysts**:
           - What is moving the stock *today*? (Use provided Change % or estimate based on knowledge)
           - Recent earnings or news events.
        3. **Valuation & Risk**:
           - Is it overvalued? (Use P/E, PEG from context)
           - Bubble Warning: Is the price parabolic?
        4. **Technical Outlook**:
           - Key support/resistance levels.
        5. **Final Verdict**:
           - Conclude with a clear direction.
           - Format the final decision strictly as: [[[BUY]]] or [[[SELL]]] or [[[HOLD]]] or [[[CAUTION]]]

        **DATA STRUCTURE (JSON)**:
        You must generate a valid JSON block at the very end of your response inside \`\`\`json code fences.
        
        JSON Schema:
        {
          "riskScore": number (0-100, where 100 is extreme risk),
          "riskLevel": "Low" | "Moderate" | "High" | "Critical",
          "bubbleProbability": number (0-100),
          "marketSentiment": "Bullish" | "Bearish" | "Neutral",
          "keyMetrics": [ 
             { "label": "Price", "value": "$..." },
             { "label": "P/E Ratio", "value": "..." },
             { "label": "52W High", "value": "..." } 
          ],
          "trendData": [ 
             // Generate 12 weeks of data ending at current price
             { "label": "Week 1", "value": 150, "ma50": 145, "rsi": 60 } 
          ],
          "warningSignals": [ "Signal 1", "Signal 2" ],
          "swot": {
            "strengths": ["..."],
            "weaknesses": ["..."],
            "opportunities": ["..."],
            "threats": ["..."]
          }
        }
      `;

    } else if (mode === 'portfolio') {
      const portfolio = data;
      const summary = portfolio.slice(0, 15).map((p: any) => `${p.quantity} shares of ${p.symbol} @ $${p.buyPrice}`).join(', ');
      
      prompt = `Audit this portfolio for risk and diversification: ${summary}`;
      systemInstruction = `
        Role: Hedge Fund Risk Manager.
        Task: Analyze the user's portfolio for concentration risk, sector exposure, and bubble risk.
        
        Output:
        1. Markdown Report (Assessment, Diversification Check, Actionable Advice).
        2. JSON Data Block (same schema as above, but 'trendData' should be a simulated aggregate performance).
      `;
    }

    const result = await ai.models.generateContentStream({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        maxOutputTokens: 2500, 
      },
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // HEARTBEAT LOOP: Send a space every 0.8s to keep the connection alive while generating
        const heartbeat = setInterval(() => {
            try {
                controller.enqueue(encoder.encode("  "));
            } catch (e) {
                clearInterval(heartbeat);
            }
        }, 800);

        try {
          for await (const chunk of result) {
            clearInterval(heartbeat);
            
            const text = chunk.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          // Note: No grounding metadata is sent as we replaced the Search tool
        } catch (e) {
          clearInterval(heartbeat);
          console.error("Streaming error", e);
          controller.enqueue(encoder.encode(`\n\n[System Error: ${e instanceof Error ? e.message : 'Stream interrupted'}]`));
        } finally {
          clearInterval(heartbeat);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { 
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
    });

  } catch (error: any) {
    console.error("API Setup Error:", error);
    return new Response(JSON.stringify({ error: error.message || 'Analysis failed to start.' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}