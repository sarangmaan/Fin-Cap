import { GoogleGenAI } from "@google/genai";

export const runtime = 'edge';

export default async function POST(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { mode, data, fastMode } = await req.json();
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server misconfigured: API Key missing.' }), { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelId = "gemini-2.5-flash";

    let systemInstruction = '';
    let prompt = '';
    
    // Tools logic
    const useTools = !fastMode;
    // We strictly define tools if not in fast mode
    const toolConfig = useTools ? { tools: [{ googleSearch: {} }] } : undefined;

    if (mode === 'market') {
      prompt = data; // query
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
        systemInstruction = `${baseInstruction}
        CRITICAL: Real-time search is unavailable. Provide plausible ESTIMATES based on internal knowledge.
        Mention data is estimated.`;
      }

    } else if (mode === 'portfolio') {
      const portfolio = data;
      const summary = portfolio.slice(0, 10).map((p: any) => `${p.quantity} ${p.symbol} @ $${p.buyPrice}`).join(', ');
      prompt = "Audit my portfolio.";
      systemInstruction = `
        Role: Portfolio Risk Manager.
        Portfolio: [${summary}]
        Task:
        1. Concise Markdown report.
        2. JSON block with 'riskScore', 'bubbleProbability', 'trendData' (mocked index).
        ${!useTools ? "Real-time search unavailable. Analyze based on fundamentals only." : ""}
      `;
    }

    // Use generateContentStream to keep connection alive
    const result = await ai.models.generateContentStream({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        ...toolConfig,
      },
    });

    // Create a readable stream to send chunks to the client
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let collectedMetadata: any[] = [];

        try {
          for await (const chunk of result) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
            
            // Collect grounding metadata if it exists in this chunk
            const metadata = chunk.candidates?.[0]?.groundingMetadata;
            if (metadata?.groundingChunks) {
              collectedMetadata.push(...metadata.groundingChunks);
            }
          }

          // At the end of the stream, append a special separator and the metadata JSON
          // This allows the client to split the text from the metadata
          if (collectedMetadata.length > 0) {
             const metadataStr = JSON.stringify(collectedMetadata);
             controller.enqueue(encoder.encode(`\n\n__FINCAP_METADATA__\n${metadataStr}`));
          }
        } catch (e) {
          console.error("Streaming error", e);
          controller.error(e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (error: any) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: error.message || 'Analysis failed.' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}