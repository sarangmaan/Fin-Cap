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
  MinusCircle
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

const AnalysisView: React.FC<AnalysisViewProps> = ({ data, title }) => {
  const { markdownReport, structuredData, groundingChunks } = data;

  return (
    <div className="animate-fade-in pb-20">
      
      {/* Title Section */}
      <div className="mb-8 border-b border-slate-700/50 pb-6 text-center">
         <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-2 drop-shadow-lg">{title}</h1>
         <div className="text-sm text-slate-400 flex items-center justify-center gap-2 font-mono">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            LIVE AI ANALYSIS REPORT
         </div>
      </div>

      {/* Top Level Summary Cards */}
      {structuredData && (
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
            <div className="mt-4 text-xs text-slate-500">Based on recent news & volatility</div>
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
        <div className="mb-8">
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
        <div className="lg:col-span-2 bg-slate-800/40 p-8 rounded-2xl border border-slate-700/50 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
             <ShieldCheck className="w-6 h-6 text-sky-400" />
             <h2 className="text-3xl font-bold text-white">Analyst Report</h2>
          </div>
          <MarkdownRenderer content={markdownReport} />
          
          {/* Sources Section */}
          {groundingChunks && groundingChunks.length > 0 && (
             <div className="mt-12 pt-6 border-t border-slate-700">
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
          {structuredData?.trendData && structuredData.trendData.length > 0 && (
            <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 shadow-lg backdrop-blur-sm">
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

          {/* Early Warning Card */}
          <div className={`p-6 rounded-2xl border shadow-lg backdrop-blur-sm ${
             structuredData?.riskLevel === 'Critical' || structuredData?.riskLevel === 'High' 
             ? 'bg-rose-950/20 border-rose-500/30' 
             : 'bg-slate-800/40 border-slate-700/50'
          }`}>
             <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className={`w-6 h-6 ${
                  structuredData?.riskLevel === 'Critical' || structuredData?.riskLevel === 'High' 
                  ? 'text-rose-500' 
                  : 'text-yellow-500'
                }`} />
                <h3 className="text-xl font-bold text-white">Early Warning System</h3>
             </div>
             
             <div className="space-y-4">
                <div className="flex justify-between items-center text-sm border-b border-white/10 pb-3">
                   <span className="text-slate-300 font-medium">Bubble Status</span>
                   <span className={`font-bold tracking-wider ${
                      structuredData?.bubbleProbability && structuredData.bubbleProbability > 60 ? 'text-rose-400' : 'text-emerald-400'
                   }`}>
                      {structuredData?.bubbleProbability && structuredData.bubbleProbability > 60 ? 'DETECTED' : 'STABLE'}
                   </span>
                </div>

                {structuredData?.warningSignals && structuredData.warningSignals.length > 0 ? (
                  <div className="space-y-2">
                     <p className="text-xs font-bold text-slate-400 uppercase">Risk Factors & Signals:</p>
                     <ul className="space-y-2">
                        {structuredData.warningSignals.map((signal, idx) => (
                           <li key={idx} className="text-sm text-slate-300 flex items-start gap-2 leading-tight">
                              <span className="text-rose-400 mt-0.5 text-xs">●</span>
                              {signal}
                           </li>
                        ))}
                     </ul>
                  </div>
                ) : (
                   <div className="text-sm text-slate-300 leading-relaxed">
                      {structuredData?.riskLevel === 'Critical' 
                       ? "Immediate caution advised. Indicators suggest a high probability of correction. Capital preservation strategies recommended."
                       : structuredData?.riskLevel === 'High'
                       ? "Significant downside risks identified. Volatility expected to increase. Monitor stop-losses closely."
                       : "Market conditions appear stable, but standard risk management protocols should remain in effect."}
                   </div>
                )}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AnalysisView;