export default async function handler(req, res) {
  // 1. CORS Headers (Keep the door open)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 2. Parse Body (Handle Vercel's data quirks)
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }

    const marketQuery = body.data || body.query;
    const portfolioData = body.portfolioData;

    // 3. Construct the Prompt
    let promptText = "";
    if (marketQuery) {
      promptText = `You are a financial analyst. Provide a deep dive analysis on: "${marketQuery}". Output: Sentiment, Risks, and Outlook.`;
    } else if (portfolioData) {
      promptText = `Analyze this portfolio: ${JSON.stringify(portfolioData)}. Output: Risk Score, Red Flags, and Verdict.`;
    } else {
      return res.status(400).json({ error: "No analysis data received." });
    }

    // 4. THE AI CALL (Using your available model: gemini-2.0-flash)
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: promptText }]
        }]
      })
    });

    if (!response.ok) {
      const errData = await response.text();
      throw new Error(`Google API Error: ${response.status} - ${errData}`);
    }

    const data = await response.json();
    const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis generated.";

    // 5. Success
    return res.status(200).json({ analysis: analysisText });

  } catch (error: any) {
    console.error("Analysis Error:", error);
    return res.status(500).json({ error: error.message || "Analysis Failed" });
  }
}