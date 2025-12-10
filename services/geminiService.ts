import { AnalysisResult, PortfolioItem } from "../types";

// This service now calls the secure Vercel API Route (/api/analyze)
// It does NOT need the GoogleGenAI SDK or API_KEY on the client side.

export const analyzeMarket = async (query: string): Promise<AnalysisResult> => {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'market',
        data: query
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Market analysis failed');
    }

    return await response.json();
  } catch (error: any) {
    console.error("Analysis Error:", error);
    throw new Error(error.message || "Failed to analyze the market. Please check your connection.");
  }
};

export const analyzePortfolio = async (portfolio: PortfolioItem[]): Promise<AnalysisResult> => {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'portfolio',
        data: portfolio
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Portfolio analysis failed');
    }

    return await response.json();
  } catch (error: any) {
    console.error("Portfolio Error:", error);
    throw new Error(error.message || "Portfolio analysis failed.");
  }
};