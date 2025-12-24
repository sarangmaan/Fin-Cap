import { AnalysisResult, PortfolioItem } from '../types';

// --- ROBUST PARSER ---
// Parses the raw text response from the backend into structured data for the UI
const parseGeminiResponse = (rawText: string, metadata: any[]): AnalysisResult => {
  let structuredData = null;
  let markdownReport = rawText;

  // 1. Regex to find the JSON block inside ```json ... ``` or just ``` ... ```
  // Added optional (?:json)? to handle cases where model omits language tag
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);

  if (jsonMatch && jsonMatch[1]) {
    try {
      const cleanJson = jsonMatch[1].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      structuredData = JSON.parse(cleanJson);
      markdownReport = rawText.replace(jsonMatch[0], '').trim();
    } catch (e) {
      console.error("JSON Parse Failed:", e);
    }
  } else {
      // Fallback 2: Try to find the first '{' and last '}'
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
          try {
              const potentialJson = rawText.substring(firstBrace, lastBrace + 1);
              structuredData = JSON.parse(potentialJson);
              markdownReport = rawText.replace(potentialJson, '').trim();
          } catch (e) {}
      }
  }

  // If parsing failed completely, ensure markdownReport is not null
  if (!markdownReport) markdownReport = "Analysis completed but returned no text content. Please try again.";

  return {
    markdownReport,
    structuredData,
    groundingChunks: metadata
  };
};

// Helper to call the backend API
// CRITICAL FIX: Use window.location.origin to avoid connecting to localhost in production
const callBackend = async (mode: string, payloadData: any) => {
    try {
        const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';
        const response = await fetch(`${BASE_URL}/api/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ mode, data: payloadData }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            let errorMessage = errorData.error || `Server Error: ${response.status}`;
            
            // Detect common "Model Not Found" error which indicates stale deployment or model misconfiguration
            const errorString = JSON.stringify(errorData).toLowerCase();
            if (errorString.includes('not found') || errorString.includes('404')) {
                errorMessage = "Deployment Error: The configured AI model version was not found. Please redeploy the application.";
            }

            throw new Error(errorMessage);
        }

        return await response.json();
    } catch (error: any) {
        console.error("Backend API Call Failed:", error);
        throw error;
    }
};

export const analyzeMarket = async (query: string, onUpdate?: (data: AnalysisResult) => void): Promise<AnalysisResult> => {
  // Pass the query string directly to the backend 'market' mode
  const { text, metadata } = await callBackend('market', query);
  
  const result = parseGeminiResponse(text, metadata);
  if (onUpdate) onUpdate(result);
  return result;
};

export const analyzePortfolio = async (portfolio: PortfolioItem[], onUpdate?: (data: AnalysisResult) => void): Promise<AnalysisResult> => {
  // Pass the portfolio array stringified to the backend 'portfolio' mode
  const data = JSON.stringify(portfolio);
  const { text, metadata } = await callBackend('portfolio', data);
  
  const result = parseGeminiResponse(text, metadata);
  if (onUpdate) onUpdate(result);
  return result;
};

export const analyzeBubbles = async (onUpdate?: (data: AnalysisResult) => void): Promise<AnalysisResult> => {
  // Bubbles mode doesn't need specific data input
  const { text, metadata } = await callBackend('bubbles', {});
  
  const result = parseGeminiResponse(text, metadata);
  if (onUpdate) onUpdate(result);
  return result;
};

export const chatWithGemini = async (
  history: any[], 
  message: string, 
  context: { symbol: string, riskScore: number, sentiment: string }
): Promise<string> => {
    try {
        // Chat mode on backend expects a JSON string containing history, message, and context
        const payload = JSON.stringify({ history, message, context });
        
        const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';
        const response = await fetch(`${BASE_URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'chat', data: payload })
        });

        if (!response.ok) return "Connection lost. The Reality Check is offline.";
        
        // Chat endpoint returns plain text directly
        return await response.text();

    } catch (error) {
        console.error("Chat Error:", error);
        return "I'm having trouble connecting to the network right now.";
    }
};