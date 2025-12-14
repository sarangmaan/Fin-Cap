
export interface ChartDataPoint {
  label: string;
  value: number;
  ma50?: number;
  rsi?: number;
}

export interface BubbleAudit {
  valuationVerdict: 'Undervalued' | 'Fair Value' | 'Overvalued' | 'Bubble Territory';
  score: number; // 0-100 (Bubble intensity)
  fundamentalDivergence: string; // Explanation of price vs value
  peerComparison: string; // Context vs sector
  speculativeActivity: 'Low' | 'Moderate' | 'High' | 'Extreme';
}

export interface StructuredAnalysisData {
  riskScore: number; // 0-100
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
  bubbleProbability: number; // 0-100
  marketSentiment: 'Bullish' | 'Bearish' | 'Neutral';
  keyMetrics: { label: string; value: string }[];
  trendData: ChartDataPoint[];
  warningSignals?: string[];
  swot?: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  // Specific Bubble Audit for the searched asset
  bubbleAudit?: BubbleAudit;
  // New field for Bubble Scope view
  topBubbleAssets?: {
    name: string;
    riskScore: number;
    sector: string;
    price: string;
    reason: string;
  }[];
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface AnalysisResult {
  markdownReport: string;
  structuredData?: StructuredAnalysisData;
  groundingChunks?: GroundingChunk[];
  isEstimated?: boolean; // New flag to indicate fallback mode
}

export interface PortfolioItem {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number; // Simulated/Fetched
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  ANALYZING = 'ANALYZING',
  REPORT = 'REPORT',
  PORTFOLIO = 'PORTFOLIO',
  BUBBLE_SCOPE = 'BUBBLE_SCOPE',
  ERROR = 'ERROR'
}