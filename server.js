import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

// API Route
app.post('/api/analyze', async (req, res) => {
  try {
    const { mode, data } = req.body;
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Server Config Error: API_KEY is missing.' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelId = "gemini-2.5-flash"; 

    let systemInstruction = '';
    let prompt = '';

    if (mode === 'market') {
      // We rely on Gemini's Google Search tool to find the price and info
      prompt = `
        Perform a financial analysis for: "${data}".
        
        1. SEARCH for the CURRENT STOCK PRICE, today's change, and recent news.
        2. SEARCH for P/E ratio, Market Cap, and recent analyst ratings.
        3. Analyze the data.
      `;
      
      systemInstruction = `
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

    } else if (mode === 'portfolio') {
      const portfolioItems = data;
      // Construct a summary string for Gemini to digest
      const summary = portfolioItems.map(p => `${p.quantity} shares of ${p.symbol} (Bought @ $${p.buyPrice})`).join(', ');
      
      prompt = `
        Audit this portfolio: ${summary}.
        1. SEARCH for the current price of each stock to calculate current value and P/L.
        2. Assess diversification and risk.
      `;
      
      systemInstruction = `
        Role: Hedge Fund Risk Manager.
        Output:
        1. Markdown Report (Assessment, Diversification Check, Actionable Advice).
        2. JSON Data Block (same schema as market analysis).
      `;
    }

    // STREAMING RESPONSE SETUP
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const result = await ai.models.generateContentStream({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        // ENABLE GOOGLE SEARCH TOOL
        tools: [{ googleSearch: {} }],
        maxOutputTokens: 2500, 
      },
    });

    const heartbeat = setInterval(() => {
        res.write("  "); 
    }, 1000);

    const accumulatedGrounding = [];

    try {
        for await (const chunk of result) {
            clearInterval(heartbeat);
            const text = chunk.text;
            if (text) {
                res.write(text);
            }
            
            // Capture grounding metadata (Sources) from the chunks
            if (chunk.groundingMetadata?.groundingChunks) {
                accumulatedGrounding.push(...chunk.groundingMetadata.groundingChunks);
            }
        }
        
        // Append metadata for frontend to display sources
        if (accumulatedGrounding.length > 0) {
            // Filter duplicates based on URI
            const uniqueSources = [];
            const seenUris = new Set();
            for (const g of accumulatedGrounding) {
                if (g.web?.uri && !seenUris.has(g.web.uri)) {
                    seenUris.add(g.web.uri);
                    uniqueSources.push(g);
                }
            }
            res.write(`\n\n__FINCAP_METADATA__\n${JSON.stringify(uniqueSources)}`);
        }

    } catch (streamError) {
        clearInterval(heartbeat);
        console.error("Streaming Error:", streamError);
        res.write(`\n\n[System Error: ${streamError.message}]`);
    } finally {
        clearInterval(heartbeat);
        res.end();
    }

  } catch (error) {
    console.error("Server Error:", error);
    if (!res.headersSent) {
        res.status(500).json({ error: error.message || 'Server Internal Error' });
    } else {
        res.end();
    }
  }
});

// Handle React Routing
app.get('*', (req, res) => {
    try {
        res.sendFile(join(__dirname, 'dist', 'index.html'));
    } catch (e) {
        res.status(404).send('Not Found (Did you run npm run build?)');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));