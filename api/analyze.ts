import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini with your secure Server-Side Key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export default async function handler(req, res) {
  // 1. Basic Method Check
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 2. RECEIVE the data from the frontend
    // We expect the frontend to have already done the hard work of fetching prices
    const { portfolioData } = req.body;

    if (!portfolioData || !Array.isArray(portfolioData)) {
      throw new Error("Invalid portfolio data received. No stocks found.");
    }

    // 3. Construct the Prompt for Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `
      You are a no-nonsense financial analyst. I am providing you with a snapshot of a stock portfolio.
      
      PORTFOLIO DATA:
      ${JSON.stringify(portfolioData, null, 2)}
      
      YOUR TASK:
      Analyze this portfolio for risk and performance. 
      
      OUTPUT FORMAT (Markdown):
      1. **Risk Score**: Give a score from 0 (Safe) to 10 (High Risk) and explain why in one sentence.
      2. **The Good**: Briefly list 2 strong points.
      3. **The Bad**: Briefly list 2 weak points or risks.
      4. **Verdict**: One word: BUY, HOLD, or SELL, followed by a brief reason.
      
      Keep it professional, direct, and under 200 words.
    `;

    // 4. Generate Content (This is the only "slow" part, usually 3-5 seconds)
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 5. Send back the analysis
    return res.status(200).json({ analysis: text });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: error.message || "AI Analysis Failed" });
  }
}