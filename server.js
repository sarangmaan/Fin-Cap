import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch'; // Ensure fetch is available in Node environment
import 'dotenv/config';

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));
const ALPHA_VANTAGE_KEY = '91DA6W6JSEUJ7I8E';

// Middleware
app.use(cors());
app.use(express.json());
// Serve static files from dist
app.use(express.static(join(__dirname, 'dist')));

// Helper function to fetch financial data
// Returns data object OR throws error
async function fetchFinancialData(symbol) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout for data

  try {
    const [quoteRes, overviewRes] = await Promise.all([
      fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`, { signal: controller.signal }),
      fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`, { signal: controller.signal })
    ]);

    const quote = await quoteRes.json();
    const overview = await overviewRes.json();

    if (quote.Note || overview.Note) {
      throw new Error('Alpha Vantage Rate Limit Hit');
    }

    if (!quote['Global Quote'] || Object.keys(quote['Global Quote']).length === 0) {
      throw new Error(`Symbol '${symbol}' not found.`);
    }

    const price = quote['Global Quote']['05. price'];
    if (!price) {
       throw new Error(`Invalid price data for ${symbol}.`);
    }

    return {
      price: price,
      changePercent: quote['Global Quote']['10. change percent'],
      pe: overview['PERatio'] || 'N/A',
      peg: overview['PEGRatio'] || 'N/A',
      eps: overview['EPS'] || 'N/A',
      high52: overview['52WeekHigh'] || 'N/A',
      low52: overview['52WeekLow'] || 'N/A',
      success: true
    };

  } catch (error) {
    if (error.name === 'AbortError') {
       throw new Error('Data Source Timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

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
    let financialContext = '';
    let isEstimated = false;

    if (mode === 'market') {
      let symbol = data.split(' - ')[0].trim().toUpperCase();
      
      // Attempt to fetch real data
      if (!symbol.includes(' ') && symbol.length <= 8) {
         try {
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
         } catch (e) {
             console.warn("Fetch Failed (Soft Fail):", e.message);
             // SOFT FAIL: We do not return 400. We let AI continue with a warning.
             isEstimated = true;
             financialContext = `
             [SYSTEM WARNING: Real-time financial data is currently unavailable due to: ${e.message}.]
             [INSTRUCTION: Proceed with analysis using your internal knowledge base and recent market trends. 
              Explicitly state that this is an ESTIMATED analysis based on historical patterns.]
             `;
         }
      } else {
         financialContext = "No specific ticker identified. Analyze based on general market knowledge.";
      }

      prompt = `Analyze: ${data}\n\n${financialContext}`;
      
      systemInstruction = `
        You are a Senior Financial Analyst.
        
        **OBJECTIVE**: 
        Perform a deep-dive analysis. ${isEstimated ? "NOTE: Data is unavailable. Provide best-effort estimation based on general knowledge." : "Use the provided Real-Time Data."}
        
        **REPORT STRUCTURE (Markdown)**:
        1. **Executive Summary**: 
           - Current Price (Bold) ${isEstimated ? "(Estimated)" : ""}
           - Verdict (BUY / SELL / HOLD)
        2. **Analysis**:
           - Valuation, Risk, and Technicals.
        3. **Final Verdict**:
           - Format strictly as: [[[BUY]]] or [[[SELL]]] or [[[HOLD]]] or [[[CAUTION]]]

        **DATA STRUCTURE (JSON)**:
        Generate a valid JSON block at the very end of your response inside \`\`\`json code fences.
        {
          "riskScore": number (0-100),
          "riskLevel": "Low" | "Moderate" | "High" | "Critical",
          "bubbleProbability": number (0-100),
          "marketSentiment": "Bullish" | "Bearish" | "Neutral",
          "keyMetrics": [ { "label": "Price", "value": "${isEstimated ? "N/A" : "..."}" } ],
          "trendData": [], 
          "warningSignals": [ "${isEstimated ? "Data Unavailable - AI Estimate" : "Signal 1"}" ],
          "swot": { "strengths": [], "weaknesses": [], "opportunities": [], "threats": [] }
        }
      `;

    } else if (mode === 'portfolio') {
      const portfolio = data;
      const summary = portfolio.slice(0, 15).map(p => `${p.quantity} shares of ${p.symbol} @ $${p.buyPrice}`).join(', ');
      
      prompt = `Audit this portfolio: ${summary}`;
      systemInstruction = "Role: Hedge Fund Risk Manager. Output Markdown report + JSON block.";
    }

    // STREAMING RESPONSE SETUP
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const result = await ai.models.generateContentStream({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        maxOutputTokens: 2500, 
      },
    });

    // Send metadata marker first if estimated, so frontend knows to show "Estimated" badge
    if (isEstimated) {
        // We can't easily change the frontend parsing logic right now without breaking things, 
        // so we will rely on the JSON "warningSignals" or the text report mentioning it.
        // Or we can append metadata at the end.
    }

    const heartbeat = setInterval(() => {
        res.write("  "); 
    }, 1000);

    try {
        for await (const chunk of result) {
            clearInterval(heartbeat);
            const text = chunk.text;
            if (text) {
                res.write(text);
            }
        }
        
        // Append metadata for frontend to detect estimation state
        if (isEstimated) {
            res.write(`\n\n__FINCAP_METADATA__\n[{"web": {"uri": "", "title": "Data Unavailable - Estimated Mode"}}]`);
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
        // Ensure strictly JSON error response
        res.status(500).json({ error: error.message || 'Server Internal Error' });
    } else {
        res.end();
    }
  }
});

// Handle React Routing - Catch all for SPA
app.get('*', (req, res) => {
    // If dist doesn't exist (local dev without build), this might fail, so we wrap it
    try {
        res.sendFile(join(__dirname, 'dist', 'index.html'));
    } catch (e) {
        res.status(404).send('Not Found (Did you run npm run build?)');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));