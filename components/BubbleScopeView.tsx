import React from 'react';
import { AnalysisResult } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import RiskGauge from './RiskGauge';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  AlertOctagon, 
  Flame, 
  TrendingUp, 
  ShieldAlert, 
  Activity, 
  Search,
  Loader2
} from 'lucide-react';

interface BubbleScopeViewProps {
  data: AnalysisResult;
}

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`animate-pulse bg-slate-800/50 rounded-xl ${className}`}></div>
);

const BubbleAssetCard: React.FC<{ asset: any }> = ({ asset }) => {
    return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-red-900/30 rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-red-500/50 transition-all">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Flame className="w-16 h-16 text-rose-500" />
            </div>
            
            <div className="flex justify-between items-start mb-3 relative z-10">
                <div>
                    <h4 className="font-bold text-lg text-white">{asset.name}</h4>
                    <span className="text-xs text-slate-400 font-mono uppercase">{asset.sector}</span>
                </div>
                <div className={`px-2 py-1 rounded font-bold text-xs ${asset.riskScore > 80 ? 'bg-rose-500 text-white' : 'bg-orange-500 text-slate-900'}`}>
                    {asset.riskScore}/100 Risk
                </div>
            </div>

            <div className="mb-4 relative z-10">
                <div className="text-2xl font-mono text-rose-300 font-bold">{asset.price}</div>
                <div className="text-xs text-slate-500">Current Valuation</div>
            </div>

            <p className="text-sm text-slate-300 border-t border-slate-700 pt-3 relative z-10 leading-relaxed">
                {asset.reason}
            </p>
        </div>
    );
};

const BubbleScopeView: React.FC<BubbleScopeViewProps> = ({ data }) => {
  const { markdownReport, structuredData } = data;
  const isStreaming = !structuredData;

  return (
    <div className="animate-fade-in pb-20">
        {/* Header */}
        <div className="relative mb-10 text-center">
            <div className="absolute inset-x-0 -top-20 -bottom-20 bg-rose-500/5 blur-[100px] pointer-events-none"></div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-rose-500/30 bg-rose-950/20 text-rose-300 text-sm font-bold mb-4 uppercase tracking-widest shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                <Activity className="w-4 h-4 animate-pulse" />
                Global Systemic Risk Monitor
            </div>
            <h1 className="text-5xl font-extrabold text-white tracking-tight mb-4 drop-shadow-xl">Bubble Scope</h1>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                Detecting disconnected valuations, irrational exuberance, and market fragility in real-time.
            </p>
        </div>

        {/* Key Warning Metrics */}
        {isStreaming ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
            </div>
        ) : structuredData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-slate-900/80 border border-slate-700 p-6 rounded-2xl flex items-center justify-between shadow-lg">
                    <div>
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Global Fragility</div>
                        <div className={`text-4xl font-extrabold ${structuredData.riskScore > 70 ? 'text-rose-500' : 'text-yellow-500'}`}>
                            {structuredData.riskScore}
                        </div>
                    </div>
                    <RiskGauge score={structuredData.riskScore} label="" type="risk" />
                </div>

                <div className="bg-slate-900/80 border border-slate-700 p-6 rounded-2xl shadow-lg col-span-2">
                    <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                        <AlertOctagon className="w-4 h-4 text-rose-500" />
                        Critical Warning Signals
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {structuredData.warningSignals?.map((signal, i) => (
                            <span key={i} className="px-3 py-1.5 bg-rose-950/40 border border-rose-900/50 rounded-lg text-rose-300 text-sm font-medium flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                {signal}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: The Red Zones (Identified Bubbles) */}
            <div className="lg:col-span-8 space-y-8">
                <div>
                    <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                        <Flame className="w-6 h-6 text-rose-500" />
                        Active Red Zones
                    </h3>
                    
                    {isStreaming ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Skeleton className="h-48" />
                            <Skeleton className="h-48" />
                        </div>
                    ) : structuredData?.topBubbleAssets && structuredData.topBubbleAssets.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {structuredData.topBubbleAssets.map((asset, idx) => (
                                <BubbleAssetCard key={idx} asset={asset} />
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 bg-slate-800/30 rounded-xl border border-slate-700 text-center text-slate-400">
                             No specific extreme bubbles detected in structured analysis. See report for details.
                        </div>
                    )}
                </div>

                {/* Analysis Report */}
                <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-700/50">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
                        <Search className="w-5 h-5 text-sky-400" />
                        <h2 className="text-xl font-bold text-white">Forensic Analysis</h2>
                        {isStreaming && <Loader2 className="w-4 h-4 animate-spin text-slate-500 ml-auto" />}
                    </div>
                    <MarkdownRenderer content={markdownReport} />
                </div>
            </div>

            {/* Right Column: Visuals & Sentiment */}
            <div className="lg:col-span-4 space-y-6">
                {/* Bubble Divergence Chart */}
                {structuredData?.trendData && (
                    <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-700 shadow-lg">
                        <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-rose-400" />
                            Price vs Reality Divergence
                        </h3>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={structuredData.trendData}>
                                    <defs>
                                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="label" hide />
                                    <YAxis hide domain={['auto', 'auto']} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="value" 
                                        stroke="#f43f5e" 
                                        fillOpacity={1} 
                                        fill="url(#colorPrice)" 
                                        name="Market Price"
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="ma50" 
                                        stroke="#10b981" 
                                        strokeDasharray="4 4"
                                        fill="none" 
                                        name="Fair Value Est"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 text-center">
                            Red line indicates market price, green dashed line indicates estimated fair value. Wide gaps indicate bubble risk.
                        </p>
                    </div>
                )}

                {/* Market Sentiment */}
                {structuredData && (
                     <div className={`p-6 rounded-2xl border ${
                         structuredData.marketSentiment === 'Euphoric' ? 'bg-purple-900/20 border-purple-500/30' : 'bg-slate-800/40 border-slate-700'
                     }`}>
                         <h3 className="text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Market Psychology</h3>
                         <div className="text-3xl font-bold text-white mb-1">{structuredData.marketSentiment || "Neutral"}</div>
                         <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden mt-3">
                             <div 
                                className={`h-full transition-all duration-1000 ${
                                    structuredData.marketSentiment === 'Euphoric' ? 'bg-purple-500 w-[90%]' : 
                                    structuredData.marketSentiment === 'Bearish' ? 'bg-rose-500 w-[20%]' : 'bg-emerald-500 w-[60%]'
                                }`}
                             ></div>
                         </div>
                         <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                             <span>Fear</span>
                             <span>Greed</span>
                         </div>
                     </div>
                )}

                <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-700">
                    <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-emerald-400" />
                        Safe Havens
                    </h3>
                    <ul className="space-y-3">
                        <li className="flex items-center justify-between text-sm text-slate-400 hover:text-white transition-colors">
                            <span>Gold (XAU)</span>
                            <span className="text-emerald-400 font-mono">Strong</span>
                        </li>
                        <li className="flex items-center justify-between text-sm text-slate-400 hover:text-white transition-colors">
                            <span>Govt Bonds (TLT)</span>
                            <span className="text-yellow-400 font-mono">Neutral</span>
                        </li>
                        <li className="flex items-center justify-between text-sm text-slate-400 hover:text-white transition-colors">
                            <span>Consumer Staples</span>
                            <span className="text-emerald-400 font-mono">Strong</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
  );
};

export default BubbleScopeView;
