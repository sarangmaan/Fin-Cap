import { AnalysisResult, PortfolioItem } from "../types";

// Helper to handle the stream fetching and parsing
const callAnalyzeApi = async (mode: 'market' | 'portfolio', data: any, fastMode: boolean): Promise<AnalysisResult> => {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, data, fastMode }),
  });

  if (!response.ok) {
    const errText = await response.text();
    let errMsg = 'Analysis failed';
    try {
        errMsg = JSON.parse(errText).error;
    } catch(e) {}
    throw new Error(errMsg);
  }

  if (!response.body) throw new Error("No response body");

  // Read the stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fullText += decoder.decode(value, { stream: true });
  }

  // Parse the result
  // We expect: [Report + JSON] + [__FINCAP_METADATA__ + JSON_METADATA]
  const parts = fullText.split('__FINCAP_METADATA__');
  const contentText = parts[0].trim();
  let groundingChunks: any[] = [];
  
  if (parts.length > 1) {
      try {
          groundingChunks = JSON.parse(parts[1].trim());
      } catch (e) {
          console.warn("Failed to parse metadata", e);
      }
  }

  // Extract Structured Data (JSON) from the report text
  let structuredData: any | undefined;
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  
  // Clean the markdown report by removing the JSON block
  const cleanReport = contentText.replace(codeBlockRegex, (match, group1) => {
      if (!structuredData) {
          try {
              const potentialData = JSON.parse(group1);
              // Basic validation to ensure it's our data
              if (potentialData.riskScore !== undefined) {
                  structuredData = potentialData;
                  return ""; // Remove the JSON block from the visible report
              }
          } catch (e) {}
      }
      return match; 
  }).trim();

  // If parsing failed but we have text, return what we have
  return {
    markdownReport: cleanReport || "Analysis generated, but format was unexpected.",
    structuredData,
    groundingChunks: groundingChunks.map(chunk => ({
      web: chunk.web ? { uri: chunk.web.uri, title: chunk.web.title } : undefined
    })).filter(c => c.web !== undefined),
  };
};

// Simple wait helper
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const analyzeMarket = async (query: string): Promise<AnalysisResult> => {
  try {
    // Attempt 1: Full Analysis (Streaming)
    return await callAnalyzeApi('market', query, false);
  } catch (error: any) {
    console.warn("Standard analysis failed, switching to Fast Mode...", error);
    
    await wait(1000);

    // Attempt 2: Fast Mode (Streaming)
    try {
      const result = await callAnalyzeApi('market', query, true);
      return { ...result, isEstimated: true };
    } catch (retryError: any) {
      throw new Error("Service is currently overloaded. Please try again later.");
    }
  }
};

export const analyzePortfolio = async (portfolio: PortfolioItem[]): Promise<AnalysisResult> => {
  try {
    return await callAnalyzeApi('portfolio', portfolio, false);
  } catch (error: any) {
    console.warn("Portfolio analysis failed, switching to Fast Mode...", error);
    await wait(1000);
    try {
      const result = await callAnalyzeApi('portfolio', portfolio, true);
      return { ...result, isEstimated: true };
    } catch (retryError: any) {
      throw new Error("Portfolio analysis failed. Please try with fewer assets.");
    }
  }
};