import { AnalysisResult, PortfolioItem } from "../types";
import { GoogleGenAI } from "@google/genai";

// 1. HARDCODED KEY
const FALLBACK_KEY = "AIzaSyAX_SmJKiCNoxchff0lOcFBJc7GFceTLoM";
const apiKey = process.env.API_KEY || FALLBACK_KEY;

if (!apiKey) {
  console.error("API_KEY is missing.");
}

const ai = new GoogleGenAI({ apiKey });

type StreamUpdate = (data: Partial<AnalysisResult>) => void;

// 2. MODEL SELECTION (Updated to supported models)
const MODELS_TO_TRY = [
  "gemini-2.5-flash-preview",
  "gemini-flash-latest",
  "gemini-2.0-flash-exp"
];

// --- API FUNCTIONS ---

export const chatWithGemini = async (
  history: any[], 
  message: string, 
  context: { symbol: string, riskScore: number, sentiment: string }
): Promise<string> => {
  if (!apiKey) return "API Key missing. Cannot chat.";

  const systemInstruction = `
        You are 'The Reality Check', a witty, sarcastic, but intelligent financial assistant.
        CONTEXT: Asset: ${context.symbol}, Risk: ${context.riskScore}/100.
        PERSONALITY:
        - High Risk (>60): Roast the user. "Do you hate money?"
        - Low Risk (<40): Praise the user. "Finally, a smart move."
        - Keep it short. Use emojis.
  `;

  // Try models in order
  for (const model of MODELS_TO_TRY) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: [...history, { role: 'user', parts: [{ text: message }] }],
        config: { systemInstruction, maxOutputTokens: 300 }
      });
      return response.text || "No response generated.";
    } catch (e: any) {
      console.warn(`Chat model ${model} failed:`, e.message);
      if (model === MODELS_TO_TRY[MODELS_TO_TRY.length - 1]) {
         return "I'm having trouble connecting to the market brain right now. Try again later.";
      }
    }
  }
  return "Connection failed.";
};

export const analyzeMarket = async (query: string, onUpdate?: StreamUpdate): Promise<AnalysisResult> => {
  const prompt = `Perform a deep-dive financial analysis for: "${query}".`;
  const systemInstruction = `You are an Elite Forensic Accountant. Output a structured report with a Whistleblower JSON section at the end.`;
  return await executeGeminiRequest(prompt, systemInstruction, onUpdate);
};

export const analyzePortfolio = async (portfolio: PortfolioItem[], onUpdate?: StreamUpdate): Promise<AnalysisResult> => {
  const summary = portfolio.map(p => `${p.quantity} shares of ${p.symbol}`).join(', ');
  const prompt = `Audit this portfolio: ${summary}.`;
  const systemInstruction = `Role: Hedge Fund Risk Manager. Output formatted report.`;
  return await executeGeminiRequest(prompt, systemInstruction, onUpdate);
};

export const analyzeBubbles = async (onUpdate?: StreamUpdate): Promise<AnalysisResult> => {
  const prompt = `Scan global markets for Bubbles.`;
  const systemInstruction = `Role: Forensic Financial Analyst. Output structured bubble report.`;
  return await executeGeminiRequest(prompt, systemInstruction, onUpdate);
};

// Helper for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function executeGeminiRequest(prompt: string, systemInstruction: string, onUpdate?: StreamUpdate): Promise<AnalysisResult> {
  if (!apiKey) {
      throw new Error("API Key is missing");
  }

  let lastError: any;

  // Retry Loop for Model Variants
  for (const modelName of MODELS_TO_TRY) {
      try {
        const result = await ai.models.generateContentStream({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction: systemInstruction,
            tools: [{ googleSearch: {} }],
          },
        });

        let fullText = "";
        let groundingChunks: any[] = [];
        
        for await (const chunk of result) {
          if (chunk.text) {
            fullText += chunk.text;
            if (onUpdate) onUpdate({ markdownReport: fullText, isEstimated: false });
          }
          const metadata = chunk.candidates?.[0]?.groundingMetadata;
          if (metadata?.groundingChunks) groundingChunks.push(...metadata.groundingChunks);
        }

        let structuredData: any | undefined;
        const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
        const cleanReport = fullText.replace(codeBlockRegex, (match, group1) => {
            if (!structuredData) {
                try {
                    const potentialData = JSON.parse(group1);
                    if (potentialData.riskScore !== undefined) {
                        structuredData = potentialData;
                        return "";
                    }
                } catch (e) {}
            }
            return match; 
        }).trim();

        const uniqueSources = [];
        const seenUris = new Set();
        for (const g of groundingChunks) {
            if (g.web?.uri && !seenUris.has(g.web.uri)) {
                seenUris.add(g.web.uri);
                uniqueSources.push(g);
            }
        }

        const finalResult = {
          markdownReport: cleanReport || "Analysis generated.",
          structuredData,
          groundingChunks: uniqueSources,
          isEstimated: false
        };

        if (onUpdate) onUpdate(finalResult);
        return finalResult;

      } catch (error: any) {
        console.warn(`Model ${modelName} failed:`, error.message);
        lastError = error;
        continue;
      }
  }

  throw new Error(`Analysis failed. Please check your internet connection or API quota.`);
}