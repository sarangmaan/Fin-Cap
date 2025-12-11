import { GoogleGenAI } from "@google/genai";

export const runtime = 'edge';

const ALPHA_VANTAGE_KEY = '91DA6W6JSEUJ7I8E';

async function fetchFinancialData(symbol: string) {
  const controller = new AbortController();
  // STRICT RULE: 8-Second Timeout
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const [quoteRes, overviewRes] = await Promise.all([
      fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`, { signal: controller.signal }),
      fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`, { signal: controller.signal })
    ]);

    const quote = await quoteRes.json();
    const overview = await overviewRes.json();

    // STRICT RULE: Rate Limit Handling
    if (quote.Note || overview.Note) {
      throw new Error('API Limit Reached (5 calls/min). Please wait.');
    }

    // STRICT RULE: Symbol Not Found Handling
    if (!quote['Global Quote'] || Object.keys(quote['Global Quote']).length === 0) {
      throw new Error(`Symbol not found. Try searching for a specific company like IBM or AAPL.`);
    }

    // Strict check for valid price data to avoid partial failures
    const price = quote['Global Quote']['05. price'];
    if (!price) {
       throw new Error(`Data Unavailable: Invalid price data returned for ${symbol}.`);
    }

    return {
      price: price,
      changePercent: quote['Global Quote']['10. change percent'],
      pe: overview['PERatio'] || 'N/A',
      peg: overview['PEGRatio'] || 'N/A',
      eps: overview['EPS'] || 'N/A',
      high52: overview['52WeekHigh'] || 'N/A',
      low52: overview['52WeekLow'] || 'N/A'
    };

  } catch (error: any) {
    // STRICT RULE: Connection Timeout Handling
    if (error.name === 'AbortError') {
       throw new Error('Connection Timed Out');
    }
    // Propagate specific API errors (Rate Limit / Not Found)
    throw error;
  } finally {
    clearTimeout(timeoutId);
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
      // 1. Extract Symbol
      let symbol = data.split(' - ')[0].trim().toUpperCase();
      
      // If input looks vague, warn user
      if (symbol.includes(' ') || symbol.length > 8) {
         // We allow generic queries to pass to AI, but we explicitly tell the user no live data was fetched
         financialContext = "No specific stock ticker detected. Analysis based on general market knowledge (NO REAL-TIME DATA).";
      } else {
         try {
             // 2. Fetch Data from Alpha Vantage (STRICT MODE)
             const stockData = await fetchFinancialData(symbol);
             
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
         } catch (e: any) {
             // If Fetch Fails, we MUST return error to frontend to show Red Alert Box
             // We do NOT fall back to AI hallucination for specific symbols
             console.error("Financial Data Fetch Failed:", e.message);
             return new Response(JSON.stringify({ error: e.message || 'Data Fetch Error' }), { status: 400 });
         }
      }

      prompt = `Analyze: ${data}\n\n${financialContext}`;
      
      systemInstruction = `
        You are a Senior Financial Analyst & Risk Manager.
        
        **OBJECTIVE**: 
        Perform a deep-dive analysis using the provided FINANCIAL DATA context.
        
        **REPORT STRUCTURE (Markdown)**:
        1. **Executive Summary**: 
           - Current Price (Bold)
           - Immediate Verdict (BUY / SELL / HOLD / CAUTION)
        2. **Real-Time Catalysts**:
           - What is moving the stock *today*?
        3. **Valuation & Risk**:
           - Is it overvalued? (Use P/E, PEG from context)
        4. **Technical Outlook**:
           - Key support/resistance levels.
        5. **Final Verdict**:
           - Format the final decision strictly as: [[[BUY]]] or [[[SELL]]] or [[[HOLD]]] or [[[CAUTION]]]

        **DATA STRUCTURE (JSON)**:
        Generate a valid JSON block at the very end of your response inside \`\`\`json code fences.
        {
          "riskScore": number (0-100),
          "riskLevel": "Low" | "Moderate" | "High" | "Critical",
          "bubbleProbability": number (0-100),
          "marketSentiment": "Bullish" | "Bearish" | "Neutral",
          "keyMetrics": [ { "label": "Price", "value": "..." } ],
          "trendData": [ { "label": "Week 1", "value": 150, "ma50": 145, "rsi": 60 } ],
          "warningSignals": [ "Signal 1" ],
          "swot": { "strengths": [], "weaknesses": [], "opportunities": [], "threats": [] }
        }
      `;

    } else if (mode === 'portfolio') {
      const portfolio = data;
      const summary = portfolio.slice(0, 15).map((p: any) => `${p.quantity} shares of ${p.symbol} @ $${p.buyPrice}`).join(', ');
      
      prompt = `Audit this portfolio for risk and diversification: ${summary}`;
      systemInstruction = `
        Role: Hedge Fund Risk Manager.
        Output:
        1. Markdown Report (Assessment, Diversification Check, Actionable Advice).
        2. JSON Data Block (same schema as above).
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
        
        const heartbeat = setInterval(() => {
            try { controller.enqueue(encoder.encode("  ")); } catch (e) { clearInterval(heartbeat); }
        }, 800);

        try {
          for await (const chunk of result) {
            clearInterval(heartbeat);
            const text = chunk.text;
            if (text) controller.enqueue(encoder.encode(text));
          }
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
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (error: any) {
    console.error("API Setup Error:", error);
    return new Response(JSON.stringify({ error: error.message || 'Analysis failed to start.' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}