import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));
const ALPHA_VANTAGE_KEY = '91DA6W6JSEUJ7I8E';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

// Helper function to fetch financial data with strict timeout
async function fetchFinancialData(symbol) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

  try {
    const [quoteRes, overviewRes] = await Promise.all([
      fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`, { signal: controller.signal }),
      fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`, { signal: controller.signal })
    ]);

    const quote = await quoteRes.json();
    const overview = await overviewRes.json();

    if (quote.Note || overview.Note) {
      throw new Error('API Limit Reached (5 calls/min). Please wait 60s.');
    }

    if (!quote['Global Quote'] || Object.keys(quote['Global Quote']).length === 0) {
      throw new Error(`Symbol '${symbol}' not found. Try IBM, AAPL, or MSFT.`);
    }

    const price = quote['Global Quote']['05. price'];
    if (!price) {
       throw new Error(`Data Unavailable: Invalid price returned for ${symbol}.`);
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

  } catch (error) {
    if (error.name === 'AbortError') {
       throw new Error('Connection Timed Out (Backend)');
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
      return res.status(500).json({ error: 'Server misconfigured: API Key missing.' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelId = "gemini-2.5-flash"; 

    let systemInstruction = '';
    let prompt = '';
    let financialContext = '';

    // --- LOGIC FROM api/analyze.ts ---
    if (mode === 'market') {
      let symbol = data.split(' - ')[0].trim().toUpperCase();
      
      if (symbol.includes(' ') || symbol.length > 8) {
         financialContext = "No specific stock ticker detected. Analysis based on general market knowledge (NO REAL-TIME DATA).";
      } else {
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
             console.error("Financial Data Fetch Failed:", e.message);
             return res.status(400).json({ error: e.message || 'Data Fetch Error' });
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
      const summary = portfolio.slice(0, 15).map(p => `${p.quantity} shares of ${p.symbol} @ $${p.buyPrice}`).join(', ');
      
      prompt = `Audit this portfolio for risk and diversification: ${summary}`;
      systemInstruction = `
        Role: Hedge Fund Risk Manager.
        Output:
        1. Markdown Report (Assessment, Diversification Check, Actionable Advice).
        2. JSON Data Block (same schema as above).
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
        maxOutputTokens: 2500, 
      },
    });

    // Heartbeat to keep connection alive
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
        res.status(500).json({ error: error.message || 'Analysis failed to start.' });
    } else {
        res.end();
    }
  }
});

// Handle React Routing
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));