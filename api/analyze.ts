import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }

    const marketQuery = body.data || body.query;
    const portfolioData = body.portfolioData;

    let prompt = "";

    if (marketQuery) {
      prompt = `
        You are a financial analyst. Provide a deep dive analysis on: "${marketQuery}".
        OUTPUT FORMAT (Markdown):
        ## Market Sentiment
        (Bullish/Bearish and why)
        ## Key Risks
        (List 3 risks)
        ## Outlook
        (Short term forecast)
      `;
    } else if (portfolioData) {
      prompt = `
        Analyze this portfolio: ${JSON.stringify(portfolioData)}.
        Output: Risk Score, Red Flags, and Verdict.
      `;
    } else {
      throw new Error("No analysis data received.");
    }

    // --- THE FIX IS HERE ---
    // We switched from "gemini-pro" to "gemini-1.5-flash"
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ analysis: text });

  } catch (error: any) {
    console.error("Gemini Error:", error);
    return res.status(500).json({ error: error.message || "AI Analysis Failed" });
  }
}