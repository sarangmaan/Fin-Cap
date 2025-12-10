import { AnalysisResult, PortfolioItem } from "../types";

export const analyzeMarket = async (query: string): Promise<AnalysisResult> => {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'market', data: query }),
    });

    // Robust handling for Vercel 504 Timeouts (which return HTML/Text)
    const text = await response.text();
    
    try {
        const data = JSON.parse(text);
        if (!response.ok) {
            throw new Error(data.error || 'Market analysis failed');
        }
        return data;
    } catch (e) {
        // If JSON parse fails, it means we got an HTML error page (Timeout/Crash)
        console.error("Server Error Response:", text);
        throw new Error("Analysis Timeout: The market analysis took too long. Please try again or use a simpler query.");
    }

  } catch (error: any) {
    console.error("Analysis Error:", error);
    throw new Error(error.message || "Failed to analyze the market. Please check your connection.");
  }
};

export const analyzePortfolio = async (portfolio: PortfolioItem[]): Promise<AnalysisResult> => {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'portfolio', data: portfolio }),
    });

    const text = await response.text();
    
    try {
        const data = JSON.parse(text);
        if (!response.ok) {
            throw new Error(data.error || 'Portfolio analysis failed');
        }
        return data;
    } catch (e) {
        console.error("Server Error Response:", text);
        throw new Error("Analysis Timeout: Portfolio analysis took too long. Please try with fewer assets.");
    }

  } catch (error: any) {
    console.error("Portfolio Error:", error);
    throw new Error(error.message || "Portfolio analysis failed.");
  }
};