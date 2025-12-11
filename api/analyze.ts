import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export default async function handler(req, res) {
  // 1. CORS Headers (Standard)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // 2. Parse the Body
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }

    // 3. DETECT DATA TYPE (The Fix)
    // Scenario A: Portfolio Analysis (List of stocks)
    const portfolioData = body.portfolioData;
    
    // Scenario B: Market Analysis (Single search query)
    const marketQuery = body.data || body.query;

    let prompt = "";

    if (portfolioData && Array.isArray(portfolioData)) {
      // It's a Portfolio
      prompt = `
        You are a financial analyst. Analyze this portfolio.
        DATA: ${JSON.stringify(portfolioData)}
        OUTPUT: Risk Score (0-10), 3 Red Flags, and Buy/Hold/Sell Verdict.
      `;
    } else if (marketQuery) {
      // It's a Single Stock/Market Query (This is what you are doing now!)
      prompt = `
        You are a financial analyst. Provide a deep dive analysis on: "${marketQuery}".
        OUTPUT:
        1. Market Sentiment (Bullish/Bearish)
        2. Key Risks
        3. Future Outlook
        Keep it professional and concise.
      `;
    } else {
      throw new Error("No valid data received. (Expected 'portfolioData' or 'data')");
    }

    // 4. Send to Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ analysis: text });

  } catch (error: any) {
    console.error("Gemini Error:", error);
    return res.status(500).json({ error: error.message || "AI Analysis Failed" });
  }
}