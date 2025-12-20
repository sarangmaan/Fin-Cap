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

export interface WhistleblowerData {
  integrityScore: number; // 0-100 (100 = Clean, 0 = High Fraud Risk)
  verdict: 'Clean' | 'Suspicious' | 'High Risk' | 'Manipulation Detected';
  forensicVerdict: string; // Detailed sentence summary of the forensic audit
  anomalies: string[]; // List of specific contradictions found
  insiderActivity: string; // "CEO dumping shares" vs "Net buying"
  accountingFlags: string; // "Revenue up, Cash flow down" etc.
  networkAnalysis?: string; // Hidden connections or opaque subsidiary structures
  regulatoryFriction?: string; // Ongoing investigations or compliance failures
  sentimentDivergence?: string; // Difference between retail hype and institutional actions
}

export interface StructuredAnalysisData {
  riskScore: number; // 0-100
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
  bubbleProbability: number; // 0-100
  marketSentiment: 'Bullish' | 'Bearish' | 'Neutral' | 'Euphoric';
  keyMetrics: { label: string; value: string }[];
  trendData: ChartDataPoint[];
  technicalAnalysis?: string; // Detailed momentum commentary
  warningSignals?: string[];
  swot?: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  bubbleAudit?: BubbleAudit;
  whistleblower?: WhistleblowerData;
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
  isEstimated?: boolean;
}

export interface PortfolioItem {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  ANALYZING = 'ANALYZING',
  REPORT = 'REPORT',
  PORTFOLIO = 'PORTFOLIO',
  BUBBLE_SCOPE = 'BUBBLE_SCOPE',
  ERROR = 'ERROR'
}