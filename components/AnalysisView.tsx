import React, { useState, useEffect } from 'react';
import { AnalysisResult, StructuredAnalysisData } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import RiskGauge from './RiskGauge';
import RealityChat from './RealityChat';
import { 
  ComposedChart, 
  LineChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  ReferenceLine 
} from 'recharts';
import { 
  AlertTriangle, 
  ExternalLink, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Info,
  Zap,
  Target,
  AlertOctagon,
  MinusCircle,
  WifiOff,
  Loader2,
  ScanEye,
  Siren,
  Fingerprint,
  FileWarning,
  X,
  MessageSquareWarning
} from 'lucide-react';

interface AnalysisViewProps {
  data: AnalysisResult;
  title: string;
}

// Custom Whistle Icon for the Whistleblower feature
const WhistleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className} 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M11 3C6.03 3 2 7.03 2 12C2 13.66 2.44 15.2 3.21 16.54L2.41 19.74C2.27 20.3 2.7 20.73 3.26 20.59L6.46 19.79C7.8 20.56 9.34 21 11 21C15.97 21 20 16.97 20 12V3H11ZM18 12C18 15.86 14.86 19 11 19C9.65 19 8.39 18.61 7.32 17.94L7.09 17.8L4.69 18.4L5.29 16L5.15 15.77C4.48 14.7 4.09 13.44 4.09 12.09C4.09 8.23 7.23 5.09 11.09 5.09H18V12Z" opacity="0.3"/>
    <path d="M22 10H19V14H22C22.55 14 23 13.55 23 13V11C23 10.45 22.55 10 22 10Z" />
    <path d="M12 2C7.02944 2 3 6.02944 3 11C3 13.0852 3.70938 14.9962 4.90891 16.5055L4.25 19.1429C4.125 19.6429 4.57143 20.0893 5.07143 19.9643L7.70882 19.3054C9.21815 20.5049 11.1291 21.2143 13.2143 21.2143C18.1849 21.2143 22.2143 17.1849 22.2143 12.2143V5.5C22.2143 3.567 20.6473 2 18.7143 2H12ZM13.2143 19.2143C11.5161 19.2143 9.94982 18.6657 8.67888 17.7303L8.35851 17.4946L5.86607 18.1179L6.48933 15.6254L6.25363 15.3051C5.31818 14.0341 4.76957 12.4678 4.76957 10.7696C4.76957 6.64386 8.11393 3.29949 12.2396 3.29949H18.7143C19.9297 3.29949 20.9143 4.2841 20.9143 5.5V12.2143C20.9143 16.34 17.5699 19.6843 13.4442 19.6843H13.2143Z" fill="currentColor"/>
    <path d="M15 11H9V13H15V11Z" fill="currentColor"/>
  </svg>
);

const SwotCard: React.FC<{ title: string; items: string[]; type: 'strength' | 'weakness' | 'opportunity' | 'threat' }> = ({ title, items, type }) => {
  let styles = '';
  let icon = null;

  switch (type) {
    case 'strength':
      styles = 'bg-emerald-900/10 border-emerald-500/30 text-emerald-100';
      icon = <Zap className="w-5 h-5 text-emerald-400" />;
      break;
    case 'weakness':
      styles = 'bg-amber-900/10 border-amber-500/30 text-amber-100';
      icon = <MinusCircle className="w-5 h-5 text-amber-400" />;
      break;
    case 'opportunity':
      styles = 'bg-sky-900/10 border-sky-500/30 text-sky-100';
      icon = <Target className="w-5 h-5 text-sky-400" />;
      break;
    case 'threat':
      styles = 'bg-rose-900/10 border-rose-500/30 text-rose-100';
      icon = <AlertOctagon className="w-5 h-5 text-rose-400" />;
      break;
  }

  return (
    <div className={`p-5 rounded-xl border backdrop-blur-sm ${styles}`}>
      <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2">
        {icon}
        <h4 className="font-bold text-base uppercase tracking-wider">{title}</h4>
      </div>
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li key={idx} className="text-sm flex items-start gap-2 opacity-90">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-current opacity-60"></span>
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Skeleton Loader Component
const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse bg-slate-800/50 rounded-xl ${className}`}></div>
);

const AnalysisView: React.FC<AnalysisViewProps> = ({ data, title }) => {
  const { markdownReport, structuredData, groundingChunks, isEstimated } = data;
  const isStreaming = !structuredData;
  const [isWhistleOpen, setIsWhistleOpen] = useState(false);
  const [isRealityChatOpen, setIsRealityChatOpen] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isWhistleOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isWhistleOpen]);

  // Determine Alert Box Styling
  const isHighRisk = structuredData?.riskLevel === 'Critical' || 
                     structuredData?.riskLevel === 'High' || 
                     structuredData?.bubbleAudit?.valuationVerdict === 'Bubble Territory' || 
                     structuredData?.bubbleAudit?.valuationVerdict === 'Overvalued';

  const alertBoxClass = isHighRisk 
    ? 'bg-rose-950/20 border-rose-500/30' 
    : 'bg-slate-800/40 border-slate-700/50';
    
  const alertIconClass = isHighRisk ? 'text-rose-500' : 'text-yellow-500';

  // Whistleblower Data logic
  const wbScore = structuredData?.whistleblower?.integrityScore || 100;
  const isWbWarning = wbScore < 70;
  const wbColor = wbScore < 50 ? 'text-rose-500' : wbScore < 80 ? 'text-amber-400' : 'text-emerald-400';
  const wbBg = wbScore < 50 ? 'bg-rose-950/90 border-rose-500/50' : wbScore < 80 ? 'bg-amber-950/90 border-amber-500/50' : 'bg-slate-900/90 border-slate-700/50';

  return (
    <div className="animate-fade-in pb-20 relative">
      
      {/* Title Section */}
      <div className="mb-8 border-b border-slate-700/50 pb-6 text-center relative">
         
         <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg mb-3">{title}</h1>
         
         {/* Live Status Text (Moved below title) */}
         <div className="flex justify-center mb-6">
            {!isEstimated ? (
                <div className="text-[10px] md:text-xs text-slate-500 flex items-center justify-center gap-2 font-mono uppercase tracking-widest">
                    {isStreaming ? (
                        <>
                            <Loader2 className="w-3 h-3 animate-spin text-sky-500" />
                            GENERATING LIVE ANALYSIS...
                        </>
                    ) : (
                        <>
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                            LIVE AI ANALYSIS REPORT
                        </>
                    )}
                </div>
            ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/40 rounded-full text-yellow-300 text-[10px] font-bold uppercase tracking-wider">
                    <WifiOff className="w-3 h-3" />
                    Live Data Unavailable - Showing AI Estimates
                </div>
            )}
         </div>

         {/* Thin Separator */}
         <div className="max-w-md mx-auto h-px bg-gradient-to-r from-transparent via-slate-700/70 to-transparent mb-6"></div>
         
         {/* Action Buttons (Moved to bottom of header) */}
         <div className="flex items-center justify-center gap-3 flex-wrap">
             {/* Whistleblower Toggle */}
             {structuredData?.whistleblower && (
                <button 
                    onClick={() => setIsWhistleOpen(true)}
                    className={`group relative flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 shadow-lg ${
                        isWbWarning 
                        ? 'bg-rose-500/10 border-rose-500 text-rose-400 hover:bg-rose-500 hover:text-white animate-pulse-slow' 
                        : 'bg-slate-800 border-slate-600 text-slate-300 hover:text-white hover:border-sky-400'
                    }`}
                    title="Open AI Whistleblower Audit"
                >
                    <WhistleIcon className={`w-4 h-4 ${isWbWarning ? 'text-current' : 'text-sky-400'}`} />
                    <span className="text-xs font-bold uppercase tracking-wide">Whistleblower</span>
                    {isWbWarning && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                        </span>
                    )}
                </button>
             )}

             {/* Reality Check Chat Toggle */}
             {structuredData && (
               <button 
                 onClick={() => setIsRealityChatOpen(!isRealityChatOpen)}
                 className="flex items-center gap-2 px-4 py-2 rounded-full bg-violet-900/20 border border-violet-500/40 text-violet-300 hover:bg-violet-600 hover:text-white transition-all text-xs font-bold uppercase tracking-wide shadow-lg shadow-violet-900/10"
                 title="Talk to the Reality Check AI"
               >
                 <MessageSquareWarning className="w-4 h-4" />
                 Reality Check
               </button>
             )}
         </div>
      </div>

      {/* REALITY CHECK CHAT BOT */}
      {structuredData && (
        <RealityChat 
            isOpen={isRealityChatOpen} 
            onClose={() => setIsRealityChatOpen(false)} 
            context={{
                symbol: title,
                riskScore: structuredData.riskScore,
                sentiment: structuredData.marketSentiment
            }}
        />
      )}

      {/* WHISTLEBLOWER MODAL OVERLAY */}
      {isWhistleOpen && structuredData?.whistleblower && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
               className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" 
               onClick={() => setIsWhistleOpen(false)}
            />
            
            {/* Modal Card - UPDATED STYLES FOR SCROLLING */}
            <div className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 ${wbBg}`}>
               
               {/* Decorative Background Elements */}
               <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none rounded-2xl overflow-hidden">
                  <Fingerprint className="w-64 h-64 text-white" />
               </div>

               {/* Header - Fixed at top of modal */}
               <div className="relative z-10 p-6 border-b border-white/10 flex justify-between items-start flex-shrink-0">
                  <div className="flex items-center gap-3">
                     <div className={`p-3 rounded-xl ${isWbWarning ? 'bg-rose-500/20' : 'bg-emerald-500/20'}`}>
                        <WhistleIcon className={`w-8 h-8 ${wbColor}`} />
                     </div>
                     <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">AI Whistleblower</h2>
                        <p className="text-slate-400 text-sm">Digital Forensic Audit & Anomaly Detection</p>
                     </div>
                  </div>
                  <button 
                     onClick={() => setIsWhistleOpen(false)}
                     className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                  >
                     <X className="w-6 h-6" />
                  </button>
               </div>

               {/* Body - Scrollable Area */}
               <div className="relative z-10 p-6 space-y-6 overflow-y-auto">
                  
                  {/* Score Section */}
                  <div className="flex flex-col md:flex-row gap-6 items-center bg-black/20 p-4 rounded-xl border border-white/5">
                      <div className="flex-1 w-full">
                         <div className="flex justify-between items-end mb-2">
                            <span className="text-slate-400 text-xs uppercase font-bold tracking-widest">Integrity Confidence</span>
                            <span className={`text-3xl font-mono font-bold ${wbColor}`}>{wbScore}/100</span>
                         </div>
                         <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                             <div className={`h-full rounded-full transition-all duration-1000 ${wbColor.replace('text', 'bg')}`} style={{ width: `${wbScore}%` }}></div>
                         </div>
                      </div>
                      <div className="md:border-l border-white/10 md:pl-6 flex flex-col items-center min-w-[120px]">
                         <span className="text-slate-400 text-xs uppercase font-bold mb-1">Verdict</span>
                         <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                            isWbWarning 
                            ? 'bg-rose-500/20 border-rose-500 text-rose-400' 
                            : 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                         }`}>
                            {structuredData.whistleblower.verdict}
                         </span>
                      </div>
                  </div>

                  {/* Anomalies List */}
                  <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                         <FileWarning className="w-4 h-4 text-rose-400" />
                         Detected Anomalies
                      </h3>
                      <div className="space-y-2">
                         {structuredData.whistleblower.anomalies.map((anomaly, i) => (
                             <div key={i} className="flex items-start gap-3 bg-rose-900/10 p-3 rounded-lg border border-rose-500/20 hover:border-rose-500/40 transition-colors">
                                 <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
                                 <p className="text-sm text-slate-200 leading-relaxed">{anomaly}</p>
                             </div>
                         ))}
                         {structuredData.whistleblower.anomalies.length === 0 && (
                            <div className="p-4 bg-emerald-900/10 border border-emerald-500/20 rounded-lg text-emerald-300 text-sm flex items-center gap-2">
                               <ShieldCheck className="w-5 h-5" />
                               No major forensic anomalies detected in current scan.
                            </div>
                         )}
                      </div>
                  </div>

                  {/* Grid Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                          <div className="flex items-center gap-2 mb-2">
                             <ScanEye className="w-4 h-4 text-sky-400" />
                             <span className="text-xs font-bold text-slate-400 uppercase">Insider Activity</span>
                          </div>
                          <p className="text-sm text-white leading-relaxed">
                             {structuredData.whistleblower.insiderActivity}
                          </p>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                          <div className="flex items-center gap-2 mb-2">
                             <Fingerprint className="w-4 h-4 text-sky-400" />
                             <span className="text-xs font-bold text-slate-400 uppercase">Accounting Check</span>
                          </div>
                          <p className="text-sm text-white leading-relaxed">
                             {structuredData.whistleblower.accountingFlags}
                          </p>
                      </div>
                  </div>

                  <div className="text-[10px] text-slate-500 text-center pt-2">
                     * AI-generated forensic scan based on public filings, news sentiment, and historical patterns. Not legal advice.
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* Top Level Summary Cards */}
      {isStreaming ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
             <Skeleton className="h-40" />
             <Skeleton className="h-40" />
             <Skeleton className="h-40" />
             <Skeleton className="h-40" />
          </div>
      ) : structuredData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <RiskGauge score={structuredData.riskScore} label="Risk Score" type="risk" />
          <RiskGauge score={structuredData.bubbleProbability} label="Bubble Probability" type="bubble" />
          
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex flex-col justify-center backdrop-blur-sm">
            <div className="text-white text-base font-bold uppercase tracking-wider mb-3">Market Sentiment</div>
            <div className={`text-4xl font-extrabold flex items-center gap-2 ${
              structuredData.marketSentiment === 'Bullish' ? 'text-emerald-400' :
              structuredData.marketSentiment === 'Bearish' ? 'text-rose-400' : 'text-yellow-400'
            }`}>
              {structuredData.marketSentiment === 'Bullish' && <TrendingUp className="w-8 h-8" />}
              {structuredData.marketSentiment === 'Bearish' && <TrendingDown className="w-8 h-8" />}
              {structuredData.marketSentiment === 'Neutral' && <Info className="w-8 h-8" />}
              {structuredData.marketSentiment}
            </div>
            <div className="mt-4 text-xs text-slate-500">Based on {isEstimated ? 'historical patterns' : 'recent news & volatility'}</div>
          </div>

          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 flex flex-col backdrop-blur-sm">
            <div className="text-white text-base font-bold uppercase tracking-wider mb-4">Key Metrics</div>
            <div className="space-y-3">
              {structuredData.keyMetrics.slice(0, 3).map((metric, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-slate-700/50 pb-2 last:border-0 last:pb-0">
                  <span className="text-slate-300 text-sm">{metric.label}</span>
                  <span className="font-mono text-sky-300 font-bold">{metric.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SWOT Analysis Section */}
      {structuredData?.swot && (
        <div className="mb-8 animate-fade-in">
           <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
             <Target className="w-5 h-5 text-sky-400" />
             Strategic Analysis (SWOT)
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <SwotCard title="Strengths" items={structuredData.swot.strengths} type="strength" />
             <SwotCard title="Weaknesses" items={structuredData.swot.weaknesses} type="weakness" />
             <SwotCard title="Opportunities" items={structuredData.swot.opportunities} type="opportunity" />
             <SwotCard title="Threats" items={structuredData.swot.threats} type="threat" />
           </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Written Report */}
        <div className="lg:col-span-2 bg-slate-800/40 p-8 rounded-2xl border border-slate-700/50 shadow-xl backdrop-blur-sm min-h-[500px]">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
             <ShieldCheck className="w-6 h-6 text-sky-400" />
             <h2 className="text-3xl font-bold text-white">Analyst Report</h2>
             {isStreaming && <Loader2 className="w-5 h-5 animate-spin text-slate-500 ml-auto" />}
          </div>
          <MarkdownRenderer content={markdownReport} />
          
          {/* Sources Section - Hide if estimated */}
          {!isEstimated && groundingChunks && groundingChunks.length > 0 && (
             <div className="mt-12 pt-6 border-t border-slate-700 animate-fade-in">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Sources & References</h4>
                <div className="flex flex-wrap gap-2">
                   {groundingChunks.map((chunk, i) => (
                      <a 
                        key={i} 
                        href={chunk.web?.uri} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-sky-400 hover:text-sky-300 hover:border-sky-500 transition-colors"
                      >
                         <ExternalLink className="w-3 h-3" />
                         {chunk.web?.title || 'Source Link'}
                      </a>
                   ))}
                </div>
             </div>
          )}
        </div>

        {/* Right Col: Charts & Alerts */}
        <div className="space-y-6">
          
          {/* Chart Card */}
          {isStreaming ? (
              <div className="space-y-6">
                  <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50">
                      <div className="flex items-center gap-2 mb-6">
                          <Skeleton className="w-6 h-6 rounded-full" />
                          <Skeleton className="w-32 h-6 rounded" />
                      </div>
                      <Skeleton className="h-64 w-full mb-6" />
                      <Skeleton className="h-24 w-full" />
                  </div>
                  <Skeleton className="h-40 w-full rounded-2xl" />
                  <Skeleton className="h-40 w-full rounded-2xl" />
              </div>
          ) : structuredData?.trendData && structuredData.trendData.length > 0 && (
            <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 shadow-lg backdrop-blur-sm animate-fade-in">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Technical Analysis
              </h3>
              
              {/* Main Price & MA Chart */}
              <div className="h-64 w-full mb-6">
                <div className="text-xs text-slate-400 mb-2 font-medium">Price Action & Moving Average (50D)</div>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={structuredData.trendData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      tickLine={false}
                      axisLine={false}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                      itemStyle={{ color: '#38bdf8' }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
                    <Area 
                      name="Price"
                      type="monotone" 
                      dataKey="value" 
                      stroke="#38bdf8" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                    />
                    <Line 
                      name="MA (50)"
                      type="monotone" 
                      dataKey="ma50" 
                      stroke="#f59e0b" 
                      strokeWidth={2} 
                      dot={false}
                      strokeDasharray="5 5"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* RSI Chart */}
              <div className="h-32 w-full pt-4 border-t border-slate-700/50">
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-bold text-white uppercase tracking-wider">RSI Momentum (14D)</span>
                    <span className="text-[10px] text-slate-600 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                       Overbought &gt; 70 • Oversold &lt; 30
                    </span>
                 </div>
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={structuredData.trendData}>
                       <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                       <XAxis dataKey="label" hide />
                       <YAxis domain={[0, 100]} hide />
                       <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                          labelStyle={{ display: 'none' }}
                       />
                       <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
                       <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} />
                       <Line 
                          type="monotone" 
                          dataKey="rsi" 
                          stroke="#8b5cf6" 
                          strokeWidth={2} 
                          dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }}
                       />
                    </LineChart>
                 </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Bubble Warning System (Unified Card) */}
          {structuredData && (
             <div className={`p-6 rounded-2xl border shadow-lg backdrop-blur-sm animate-fade-in ${alertBoxClass}`}>
               <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className={`w-6 h-6 ${alertIconClass}`} />
                  <h3 className="text-xl font-bold text-white">Bubble Warning</h3>
               </div>
               
               <div className="space-y-4">
                  {/* Status Row */}
                  <div className="flex justify-between items-center text-sm border-b border-white/10 pb-3">
                     <span className="text-slate-300 font-medium">Risk Status</span>
                     <span className={`font-bold tracking-wider ${
                        isHighRisk ? 'text-rose-400' : 'text-emerald-400'
                     }`}>
                        {isHighRisk ? 'ELEVATED' : 'STABLE'}
                     </span>
                  </div>

                  {/* Detailed Bubble Audit info if available */}
                  {structuredData.bubbleAudit && (
                      <div className="space-y-3 pt-1">
                          <div>
                              <div className="text-xs text-slate-400 uppercase font-bold mb-1 flex justify-between">
                                  <span>Valuation Verdict</span>
                                  <span className={isHighRisk ? 'text-rose-400' : 'text-emerald-400'}>
                                      {structuredData.bubbleAudit.valuationVerdict}
                                  </span>
                              </div>
                              {/* Simple Bar */}
                              <div className="w-full h-1.5 bg-slate-900/50 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${isHighRisk ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${structuredData.bubbleAudit.score}%` }}></div>
                              </div>
                          </div>

                          <div className="grid gap-3 pt-2">
                             <div className="bg-slate-900/30 p-2.5 rounded border border-white/5">
                                 <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Fundamentals</span>
                                 <p className="text-xs text-slate-300 leading-snug">{structuredData.bubbleAudit.fundamentalDivergence}</p>
                             </div>
                             <div className="bg-slate-900/30 p-2.5 rounded border border-white/5">
                                 <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Peer Context</span>
                                 <p className="text-xs text-slate-300 leading-snug">{structuredData.bubbleAudit.peerComparison}</p>
                             </div>
                          </div>
                          
                          <div className="flex justify-between items-center text-xs pt-1">
                                <span className="text-slate-500 font-bold uppercase">Speculative Activity</span>
                                <span className={`font-mono font-bold ${
                                    structuredData.bubbleAudit.speculativeActivity === 'Extreme' || structuredData.bubbleAudit.speculativeActivity === 'High' 
                                    ? 'text-rose-400' : 'text-emerald-400'
                                }`}>
                                    {structuredData.bubbleAudit.speculativeActivity}
                                </span>
                          </div>
                      </div>
                  )}

                  {/* Warning Signals List */}
                  {structuredData.warningSignals && structuredData.warningSignals.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                       <p className="text-xs font-bold text-slate-400 uppercase">Warning Signals:</p>
                       <ul className="space-y-2">
                          {structuredData.warningSignals.map((signal, idx) => (
                             <li key={idx} className="text-sm text-slate-300 flex items-start gap-2 leading-tight">
                                <span className="text-rose-400 mt-0.5 text-xs">●</span>
                                {signal}
                             </li>
                          ))}
                       </ul>
                    </div>
                  )}
               </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AnalysisView;