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

    // 3. Construct Prompt (Demanding JSON for Charts)
    let promptText = "";
    if (marketQuery) {
      promptText = `
        You are a financial analyst. Analyze: "${marketQuery}".
        Return valid JSON (NO markdown) with these exact keys:
        {
          "sentiment": "Bullish" or "Bearish",
          "riskScore": (number 0-100),
          "summary": "Brief analysis string...",
          "redFlags": ["flag1", "flag2"],
          "outlook": "Positive" or "Negative"
        }
      `;
    } else if (portfolioData) {
      promptText = `
        Analyze this portfolio: ${JSON.stringify(portfolioData)}.
        Return valid JSON (NO markdown) with these exact keys:
        {
          "riskScore": (number 0-100),
          "verdict": "Buy" or "Hold" or "Sell",
          "summary": "Brief analysis string...",
          "redFlags": ["flag1", "flag2"]
        }
      `;
    } else {
      return res.status(400).json({ error: "No data received." });
    }

    // 4. Call Gemini (Using 'gemini-flash-latest' for best free limits)
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      })
    });

    if (!response.ok) {
       // Graceful fallback if limits hit
       if (response.status === 429) throw new Error("Free Quota Limit. Please wait 30s.");
       const err = await response.text();
       throw new Error(`Google API Error: ${response.status}`);
    }

    const data = await response.json();
    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // 5. Clean & Parse JSON (Fixes the "Text instead of Charts" bug)
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const analysisJson = JSON.parse(rawText);

    return res.status(200).json({ analysis: analysisJson });

  } catch (error: any) {
    console.error("Server Error:", error);
    // Return a "Safe" JSON object so the app doesn't crash
    return res.status(200).json({ 
      analysis: {
        riskScore: 50,
        sentiment: "Neutral",
        summary: "Analysis unavailable momentarily (" + error.message + ")",
        redFlags: ["System Busy"],
        outlook: "Neutral"
      }
    });
  }
}