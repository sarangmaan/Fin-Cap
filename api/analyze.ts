export default function handler(req, res) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 2. DEBUG CHECK
  const hasKey = !!process.env.GEMINI_API_KEY;
  
  // 3. Return a simple success message
  return res.status(200).json({ 
    analysis: `SERVER IS ALIVE. API Key Detected: ${hasKey ? "YES" : "NO"}` 
  });
}