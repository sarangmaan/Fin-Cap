import React from 'react';
import { AnalysisResult, StructuredAnalysisData } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import RiskGauge from './RiskGauge';
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
  ScanEye
} from 'lucide-react';

interface AnalysisViewProps {
  data: AnalysisResult;
  title: string;
}

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

  // Determine Alert Box Styling
  const isHighRisk = structuredData?.riskLevel === 'Critical' || 
                     structuredData?.riskLevel === 'High' || 
                     structuredData?.bubbleAudit?.valuationVerdict === 'Bubble Territory' || 
                     structuredData?.bubbleAudit?.valuationVerdict === 'Overvalued';

  const alertBoxClass = isHighRisk 
    ? 'bg-rose-950/20 border-rose-500/30' 
    : 'bg-slate-800/40 border-slate-700/50';
    
  const alertIconClass = isHighRisk ? 'text-rose-500' : 'text-yellow-500';

  return (
    <div className="animate-fade-in pb-20">
      
      {/* Title Section */}
      <div className="mb-8 border-b border-slate-700/50 pb-6 text-center relative">
         <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-2 drop-shadow-lg">{title}</h1>
         
         {!isEstimated ? (
            <div className="text-sm text-slate-400 flex items-center justify-center gap-2 font-mono">
                {isStreaming ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                        GENERATING LIVE ANALYSIS...
                    </>
                ) : (
                    <>
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                        LIVE AI ANALYSIS REPORT
                    </>
                )}
            </div>
         ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/40 rounded-full text-yellow-300 text-xs font-bold uppercase tracking-wider mt-2">
                <WifiOff className="w-4 h-4" />
                Live Data Unavailable - Showing AI Estimates
            </div>
         )}
      </div>

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
              
              <p className="text-[10px] text-slate-500 mt-4 text-center italic">
                *Technical indicators are estimated based on historical trends for illustrative purposes.
              </p>
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