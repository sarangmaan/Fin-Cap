import { GoogleGenAI } from "@google/genai";

export const runtime = 'edge';

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
    
    // Always use Google Search for real-time data
    const toolConfig = { tools: [{ googleSearch: {} }] };

    if (mode === 'market') {
      prompt = `Analyze: ${data}`;
      systemInstruction = `
        You are a Senior Financial Analyst & Risk Manager.
        
        **OBJECTIVE**: 
        Perform a deep-dive analysis using REAL-TIME data. You MUST use the search tool to find the latest price, news, and sentiment.

        **REPORT STRUCTURE (Markdown)**:
        1. **Executive Summary**: 
           - Current Price (Bold)
           - Immediate Verdict (BUY / SELL / HOLD / CAUTION)
        2. **Real-Time Catalysts**:
           - What is moving the stock *today*?
           - Recent earnings or news events.
        3. **Valuation & Risk**:
           - Is it overvalued? (P/E, PEG, Sector comparison)
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
        ...toolConfig,
        maxOutputTokens: 2500, 
      },
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // HEARTBEAT LOOP: Send a space every 0.8s to keep the connection alive while Google Search thinks.
        const heartbeat = setInterval(() => {
            try {
                controller.enqueue(encoder.encode("  "));
            } catch (e) {
                clearInterval(heartbeat);
            }
        }, 800);

        let collectedMetadata: any[] = [];

        try {
          for await (const chunk of result) {
            // As soon as we get the first chunk of data, stop the heartbeat
            clearInterval(heartbeat);
            
            const text = chunk.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
            
            const metadata = chunk.candidates?.[0]?.groundingMetadata;
            if (metadata?.groundingChunks) {
              collectedMetadata.push(...metadata.groundingChunks);
            }
          }

          if (collectedMetadata.length > 0) {
             const metadataStr = JSON.stringify(collectedMetadata);
             controller.enqueue(encoder.encode(`\n\n__FINCAP_METADATA__\n${metadataStr}`));
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