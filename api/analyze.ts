export default async function handler(req, res) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 2. Parse Body
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }

    const marketQuery = body.data || body.query;
    const portfolioData = body.portfolioData;

    // 3. Construct Prompt
    let promptText = "";
    if (marketQuery) {
      promptText = `You are a financial analyst. Provide a deep dive analysis on: "${marketQuery}". Output: Sentiment, Risks, and Outlook.`;
    } else if (portfolioData) {
      promptText = `Analyze this portfolio: ${JSON.stringify(portfolioData)}. Output: Risk Score, Red Flags, and Verdict.`;
    } else {
      return res.status(400).json({ error: "No analysis data received." });
    }

    // 4. THE SWITCH: Using 'gemini-2.0-flash-lite' (Better for Free Tier limits)
    const apiKey = process.env.GEMINI_API_KEY;
    
    // We use the EXACT version from your available model list:
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite-preview-02-05:generateContent?key=${apiKey}`;

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
      // 5. Handle Rate Limits (429) Gracefully
      if (response.status === 429) {
        throw new Error("High Traffic: Free tier limit reached. Please wait 1 minute.");
      }
      const errData = await response.text();
      throw new Error(`Google API Error: ${response.status} - ${errData}`);
    }

    const data = await response.json();
    const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis generated.";

    return res.status(200).json({ analysis: analysisText });

  } catch (error: any) {
    console.error("Analysis Error:", error);
    return res.status(500).json({ error: error.message || "Analysis Failed" });
  }
}