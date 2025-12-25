import { AnalysisResult, PortfolioItem } from '../types';

// --- ROBUST PARSER ---
// Parses the raw text response from the backend into structured data for the UI
const parseGeminiResponse = (rawText: string, metadata: any[]): AnalysisResult => {
  let structuredData = null;
  let markdownReport = rawText;

  // 1. Regex to find the JSON block inside ```json ... ``` or just ``` ... ```
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

        // 1. Check for standard network failures or 404/500 status codes
        if (!response.ok) {
            let errorMessage = `Server Error: ${response.status} ${response.statusText}`;
            
            try {
                // Try to parse JSON error message from backend
                const errorData = await response.json();
                if (errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (e) {
                // If it fails to parse JSON, stick with status code
                console.warn("Could not parse backend error JSON", e);
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
  const { text, metadata } = await callBackend('market', query);
  
  const result = parseGeminiResponse(text, metadata);
  if (onUpdate) onUpdate(result);
  return result;
};

export const analyzePortfolio = async (portfolio: PortfolioItem[], onUpdate?: (data: AnalysisResult) => void): Promise<AnalysisResult> => {
  const data = JSON.stringify(portfolio);
  const { text, metadata } = await callBackend('portfolio', data);
  
  const result = parseGeminiResponse(text, metadata);
  if (onUpdate) onUpdate(result);
  return result;
};

export const analyzeBubbles = async (onUpdate?: (data: AnalysisResult) => void): Promise<AnalysisResult> => {
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
        const payload = JSON.stringify({ history, message, context });
        
        const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';
        const response = await fetch(`${BASE_URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'chat', data: payload })
        });

        if (!response.ok) return "Connection lost. The Reality Check is offline.";
        
        return await response.text();

    } catch (error) {
        console.error("Chat Error:", error);
        return "I'm having trouble connecting to the network right now.";
    }
};