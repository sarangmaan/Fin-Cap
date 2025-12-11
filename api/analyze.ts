export default async function handler(req, res) {
  // 1. Force the door open (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 2. THE MIRROR
  // We grab the raw body and send it back to your screen.
  let body = req.body;
  
  // Debug: Is it a string? If so, parse it.
  const isString = typeof body === 'string';
  if (isString) {
      try { body = JSON.parse(body); } catch (e) {}
  }

  const debugMessage = `
  ## 🔍 DIAGNOSTIC REPORT
  **Status:** Connection Successful
  **Body Type:** ${isString ? "String (Fixed)" : "Object (Good)"}
  **Data Received:** \`\`\`json
  ${JSON.stringify(body, null, 2)}
  \`\`\`
  `;

  // 3. Return as "analysis" so it shows up in your App UI
  return res.status(200).json({ analysis: debugMessage });
}