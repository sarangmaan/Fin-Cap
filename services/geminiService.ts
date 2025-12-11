import { AnalysisResult, PortfolioItem } from "../types";

// Helper to handle the stream fetching and parsing
const callAnalyzeApi = async (mode: 'market' | 'portfolio', data: any): Promise<AnalysisResult> => {
  // CLIENT-SIDE TIMEOUT: 20 Seconds
  // If the server hangs (API limit, Vercel timeout, etc.), the browser will force kill the request here.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, data }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

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

    // If we got text but no JSON, it might be a partial failure or just chatty model
    // We still return the text so the user sees *something*
    return {
      markdownReport: cleanReport || "Analysis generated, but format was unexpected.",
      structuredData,
      groundingChunks: groundingChunks.map(chunk => ({
        web: chunk.web ? { uri: chunk.web.uri, title: chunk.web.title } : undefined
      })).filter(c => c.web !== undefined),
      isEstimated: false // We are forcing real-time now
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error("Request timed out. The server took too long to respond.");
    }
    throw error;
  }
};

export const analyzeMarket = async (query: string): Promise<AnalysisResult> => {
  try {
    return await callAnalyzeApi('market', query);
  } catch (error: any) {
    console.error("Market Analysis Error", error);
    // Pass the actual error message up to the UI
    throw new Error(error.message || "Market analysis failed.");
  }
};

export const analyzePortfolio = async (portfolio: PortfolioItem[]): Promise<AnalysisResult> => {
  try {
    return await callAnalyzeApi('portfolio', portfolio);
  } catch (error: any) {
    console.error("Portfolio Analysis Error", error);
    throw new Error(error.message || "Portfolio analysis failed.");
  }
};