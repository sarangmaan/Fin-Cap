import { AnalysisResult, PortfolioItem } from "../types";

// Helper to handle the fetch logic
const callAnalyzeApi = async (mode: 'market' | 'portfolio', data: any, fastMode: boolean): Promise<AnalysisResult> => {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, data, fastMode }),
  });

  const text = await response.text();
  
  try {
      const json = JSON.parse(text);
      if (!response.ok) {
          throw new Error(json.error || 'Analysis failed');
      }
      return json;
  } catch (e) {
      console.error("Server Error Response:", text);
      throw new Error("Analysis Timeout");
  }
};

// Simple wait helper
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const analyzeMarket = async (query: string): Promise<AnalysisResult> => {
  try {
    // Attempt 1: Full Analysis with Search (might timeout on free tier)
    return await callAnalyzeApi('market', query, false);
  } catch (error: any) {
    console.warn("Standard analysis failed (likely timeout), switching to Fast Mode...");
    
    // Short delay to let the server breathe
    await wait(1000);

    // Attempt 2: Fast Mode (No Search, pure AI generation - very fast)
    try {
      const result = await callAnalyzeApi('market', query, true);
      // Mark as estimated so UI can show a warning
      return { ...result, isEstimated: true };
    } catch (retryError: any) {
      throw new Error("Service is currently busy. Please try a simpler query.");
    }
  }
};

export const analyzePortfolio = async (portfolio: PortfolioItem[]): Promise<AnalysisResult> => {
  try {
    return await callAnalyzeApi('portfolio', portfolio, false);
  } catch (error: any) {
    console.warn("Portfolio analysis failed, switching to Fast Mode...");
    await wait(1000);
    try {
      const result = await callAnalyzeApi('portfolio', portfolio, true);
      return { ...result, isEstimated: true };
    } catch (retryError: any) {
      throw new Error("Portfolio analysis failed. Please try with fewer assets.");
    }
  }
};