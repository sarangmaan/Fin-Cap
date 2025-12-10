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

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Market analysis failed');
      }
      return data;
    } else {
      // Handle non-JSON response (e.g., Vercel HTML error page)
      const text = await response.text();
      console.error("Non-JSON Response:", text);
      throw new Error("Server error: The analysis service is currently unavailable. Please try again later.");
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'portfolio',
        data: portfolio
      }),
    });

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Portfolio analysis failed');
      }
      return data;
    } else {
       const text = await response.text();
       console.error("Non-JSON Response:", text);
       throw new Error("Server error: Portfolio analysis service is unavailable.");
    }

  } catch (error: any) {
    console.error("Portfolio Error:", error);
    throw new Error(error.message || "Portfolio analysis failed.");
  }
};