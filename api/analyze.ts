import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export default async function handler(req, res) {
  // 1. CORS Headers (Essential for Vercel)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 2. Safe Data Parsing
    let body = req.body;

    // Handle stringified body (common Vercel quirk)
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error("JSON Parse Error:", e);
      }
    }

    const { portfolioData } = body || {};

    // 3. Validation (Without the crashing log)
    if (!portfolioData || !Array.isArray(portfolioData) || portfolioData.length === 0) {
      // Return a proper 400 error instead of crashing
      return res.status(400).json({ error: "No stock data received. Please refresh and try again." });
    }

    // 4. Construct Prompt
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `
      Analyze this portfolio.
      DATA: ${JSON.stringify(portfolioData)}
      
      OUTPUT:
      1. Risk Score (0-10)
      2. 3 Red Flags
      3. Verdict (Buy/Hold/Sell)
      Keep it short and professional.
    `;

    // 5. Generate
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ analysis: text });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: error.message || "Analysis Failed" });
  }
}