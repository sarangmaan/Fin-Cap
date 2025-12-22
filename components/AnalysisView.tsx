import React, { useState, useEffect } from 'react';
import { AnalysisResult } from '../types';
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
  ResponsiveContainer,
  Tooltip,
  ReferenceLine
} from 'recharts';
import { 
  AlertTriangle, 
  ExternalLink, 
  ShieldCheck, 
  TrendingUp, 
  Target,
  AlertOctagon,
  MinusCircle,
  Loader2,
  X,
  MessageSquareWarning,
  Download,
  Info,
  Activity,
  Zap,
  WifiOff
} from 'lucide-react';

interface AnalysisViewProps {
  data: AnalysisResult;
  title: string;
}

const WhistleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M11 3C6.03 3 2 7.03 2 12C2 13.66 2.44 15.2 3.21 16.54L2.41 19.74C2.27 20.3 2.7 20.73 3.26 20.59L6.46 19.79C7.8 20.56 9.34 21 11 21C15.97 21 20 16.97 20 12V3H11ZM18 12C18 15.86 14.86 19 11 19C9.65 19 8.39 18.61 7.32 17.94L7.09 17.8L4.69 18.4L5.29 16L5.15 15.77C4.48 14.7 4.09 13.44 4.09 12.09C4.09 8.23 7.23 5.09 11.09 5.09H18V12Z" opacity="0.3"/>
    <path d="M22 10H19V14H22C22.55 14 23 13.55 23 13V11C23 10.45 22.55 10 22 10Z" />
    <path d="M12 2C7.02944 2 3 6.02944 3 11C3 13.0852 3.70938 14.9962 4.90891 16.5055L4.25 19.1429C4.125 19.6429 4.57143 20.0893 5.07143 19.9643L7.70882 19.3054C9.21815 20.5049 11.1291 21.2143 13.2143 21.2143C18.1849 21.2143 22.2143 16.97 22.2143 12.2143V5.5C22.2143 3.567 20.6473 2 18.7143 2H12ZM13.2143 19.2143C11.5161 19.2143 9.94982 18.6657 8.67888 17.7303L8.35851 17.4946L5.86607 18.1179L6.48933 15.6254L6.25363 15.3051C5.31818 14.0341 4.76957 12.4678 4.76957 10.7696C4.76957 6.64386 8.11393 3.29949 12.2396 3.29949H18.7143C19.9297 3.29949 20.9143 4.2841 20.9143 5.5V12.2143C20.9143 16.34 17.5699 19.6843 13.4442 19.6843H13.2143Z" fill="currentColor"/>
    <path d="M15 11H9V13H15V11Z" fill="currentColor"/>
  </svg>
);

const SwotCard: React.FC<{ title: string; items: string[]; type: 'strength' | 'weakness' | 'opportunity' | 'threat'; mode?: 'dark' | 'light' }> = ({ title, items, type, mode = 'dark' }) => {
  let styles = '';
  let icon = null;
  const isLight = mode === 'light';

  // Institutional styling for dark mode
  const baseDark = "glass-card border-l-4"; 
  
  switch (type) {
    case 'strength':
      styles = isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : `${baseDark} border-l-emerald-500`;
      icon = <Zap className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />;
      break;
    case 'weakness':
      styles = isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : `${baseDark} border-l-amber-500`;
      icon = <MinusCircle className={`w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />;
      break;
    case 'opportunity':
      styles = isLight ? 'bg-sky-50 border-sky-200 text-sky-900' : `${baseDark} border-l-sky-500`;
      icon = <Target className={`w-4 h-4 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />;
      break;
    case 'threat':
      styles = isLight ? 'bg-rose-50 border-rose-200 text-rose-900' : `${baseDark} border-l-rose-500`;
      icon = <AlertOctagon className={`w-4 h-4 ${isLight ? 'text-rose-600' : 'text-rose-400'}`} />;
      break;
  }
  return (
    <div className={`p-6 rounded-xl mb-4 break-inside-avoid ${styles}`}>
      <div className={`flex items-center gap-2 mb-4 border-b pb-3 ${isLight ? 'border-black/10' : 'border-white/5'}`}>
        {icon}
        <h4 className="font-extrabold text-sm uppercase tracking-widest">{title}</h4>
      </div>
      <ul className="space-y-3">
        {items.map((item, idx) => (
          <li key={idx} className="text-sm flex items-start gap-3 text-slate-300">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-500 flex-shrink-0"></span>
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const ReportFooter: React.FC<{ mode?: 'dark' | 'light' }> = ({ mode = 'dark' }) => (
  <div className={`flex items-center justify-between border-t mt-12 pt-6 text-[10px] font-mono uppercase tracking-widest ${mode === 'light' ? 'border-slate-300 text-slate-500' : 'border-slate-800 text-slate-500'}`}>
    <div>FinCap AI | Institutional Grade</div>
    <div>Confidence: High</div>
    <div>Confidential</div>
  </div>
);

// --- PRINT TEMPLATE (Pure White for PDF) ---
const PrintTemplate: React.FC<{ data: AnalysisResult; title: string }> = ({ data, title }) => {
    const { structuredData, markdownReport } = data;
    if (!structuredData) return null;

    return (
        <div id="print-root" className="bg-white text-slate-900 min-h-screen p-10 font-serif max-w-[1024px] mx-auto">
             <div className="text-center border-b-2 border-black pb-10 mb-10">
                <div className="mb-4 text-emerald-600 font-black text-2xl tracking-tighter uppercase">FinCap Institutional</div>
                <h1 className="text-6xl font-black text-slate-900 mb-4 uppercase tracking-tighter break-words">{title}</h1>
                <div className="text-slate-500 font-mono uppercase text-sm">{new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}</div>
             </div>

             <div className="grid grid-cols-2 gap-12 mb-12">
                <div className="text-center p-6 border border-slate-200 rounded-xl bg-slate-50">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Risk Assessment</h3>
                    <div className={`text-5xl font-black ${structuredData.riskScore > 50 ? 'text-rose-600' : 'text-emerald-600'}`}>{structuredData.riskScore}<span className="text-lg text-slate-400">/100</span></div>
                </div>
                <div className="text-center p-6 border border-slate-200 rounded-xl bg-slate-50">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Bubble Probability</h3>
                    <div className={`text-5xl font-black ${structuredData.bubbleProbability > 50 ? 'text-rose-600' : 'text-emerald-600'}`}>{structuredData.bubbleProbability}<span className="text-lg text-slate-400">%</span></div>
                </div>
             </div>

             <div className="mb-12">
                <h2 className="text-xl font-bold border-b border-black pb-2 mb-6">EXECUTIVE SUMMARY</h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    {structuredData.keyMetrics.map((m, i) => (
                        <div key={i} className="flex justify-between border-b border-slate-100 py-2">
                            <span className="font-bold text-slate-500">{m.label}</span>
                            <span className="font-mono font-bold text-slate-900">{m.value}</span>
                        </div>
                    ))}
                </div>
             </div>

             <div className="html2pdf__page-break"></div>

             <div className="pt-10">
                <h2 className="text-2xl font-black border-b-2 border-black pb-4 mb-8">FORENSIC ANALYSIS</h2>
                <MarkdownRenderer content={markdownReport} mode="light" />
             </div>

             <div className="html2pdf__page-break"></div>

             <div className="pt-10">
                <h2 className="text-2xl font-black border-b-2 border-black pb-4 mb-8">STRATEGIC & TECHNICAL</h2>
                
                {structuredData.swot && (
                    <div className="grid grid-cols-2 gap-6 mb-12">
                        <SwotCard title="Strengths" items={structuredData.swot.strengths} type="strength" mode="light" />
                        <SwotCard title="Weaknesses" items={structuredData.swot.weaknesses} type="weakness" mode="light" />
                        <SwotCard title="Opportunities" items={structuredData.swot.opportunities} type="opportunity" mode="light" />
                        <SwotCard title="Threats" items={structuredData.swot.threats} type="threat" mode="light" />
                    </div>
                )}

                {structuredData.trendData && (
                    <div className="border border-slate-200 p-6 rounded-xl bg-white mb-8 break-inside-avoid">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 uppercase">Technical Momentum</h3>
                        <div className="h-64 w-full mb-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={structuredData.trendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                    <XAxis dataKey="label" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                                    <Area type="monotone" dataKey="value" stroke="#0ea5e9" fillOpacity={0.1} fill="#0ea5e9" isAnimationActive={false} />
                                    <Line type="monotone" dataKey="ma50" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 5" isAnimationActive={false} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                        {structuredData.technicalAnalysis && (
                            <p className="text-sm text-slate-700 leading-relaxed font-medium bg-slate-50 p-4 rounded-lg border border-slate-100">
                                {structuredData.technicalAnalysis}
                            </p>
                        )}
                    </div>
                )}

                <ReportFooter mode="light" />
             </div>
        </div>
    );
};


const AnalysisView: React.FC<AnalysisViewProps> = ({ data, title }) => {
  const { markdownReport, structuredData, groundingChunks, isEstimated } = data;
  const isStreaming = !structuredData && !markdownReport;
  const [isWhistleOpen, setIsWhistleOpen] = useState(false);
  const [isRealityChatOpen, setIsRealityChatOpen] = useState(false);
  
  // PDF State
  const [isExporting, setIsExporting] = useState(false);

  const isHighRisk = structuredData?.riskLevel === 'Critical' || 
                     structuredData?.riskLevel === 'High' || 
                     structuredData?.bubbleAudit?.valuationVerdict === 'Bubble Territory' || 
                     structuredData?.bubbleAudit?.valuationVerdict === 'Overvalued';

  const alertBoxClass = isHighRisk 
    ? 'bg-rose-950/20 border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.1)] backdrop-blur-md' 
    : 'glass-card border-slate-700/50';
    
  const alertIconClass = isHighRisk ? 'text-rose-500' : 'text-yellow-500';

  const wbScore = structuredData?.whistleblower?.integrityScore || 100;
  const isWbWarning = wbScore < 70;
  const wbColor = wbScore < 50 ? 'text-rose-500' : wbScore < 80 ? 'text-amber-400' : 'text-emerald-400';
  const wbBg = wbScore < 50 ? 'bg-rose-950/90 border-rose-500/50' : wbScore < 80 ? 'bg-amber-950/90 border-amber-500/50' : 'bg-slate-900/90 border-slate-700/50';

  // --------------------------------------------------------
  // PDF EXPORT LOGIC
  // --------------------------------------------------------
  useEffect(() => {
    if (isExporting) {
        const runExport = async () => {
            // 1. Wait for render paint
            await new Promise(resolve => setTimeout(resolve, 2500));

            const element = document.getElementById('print-root');
            if (element) {
                try {
                    const html2pdf = (window as any).html2pdf;
                    if (html2pdf) {
                         const opt = {
                            margin: [0.5, 0.5],
                            filename: `FinCap_Analysis_${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
                            image: { type: 'jpeg', quality: 0.98 },
                            html2canvas: { 
                                scale: 2, 
                                useCORS: true, 
                                scrollY: 0,
                                backgroundColor: '#ffffff',
                                windowWidth: 1024
                            },
                            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
                            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
                        };
                        await html2pdf().from(element).set(opt).save();
                    }
                } catch (e) {
                    console.error("Export Error:", e);
                    alert("Export failed. Please try again.");
                }
            }
            setIsExporting(false);
        };

        runExport();
    }
  }, [isExporting, title]);

  const handleDownloadReport = () => {
    if (isStreaming || !structuredData) return;
    setIsExporting(true);
  };

  return (
    <div className="animate-fade-in pb-20 relative">
      
      {/* 
         VISIBLE EXPORT OVERLAY
      */}
      {isExporting && (
         <div className="fixed inset-0 z-[99999] bg-[#0f172a] overflow-auto flex justify-center items-start pt-10">
             <div className="fixed top-5 right-5 text-white z-[100000] flex items-center gap-2">
                 <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
                 <span className="font-bold">Generating PDF...</span>
             </div>
             <PrintTemplate data={data} title={title} />
         </div>
      )}

      {/* STANDARD DASHBOARD VIEW */}
      <div className="mb-10 border-b border-white/5 pb-8 text-center relative">
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-6 uppercase">{title}</h1>
          <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
              {structuredData?.whistleblower && (
                  <button onClick={() => setIsWhistleOpen(true)} className={`flex items-center gap-2 px-6 py-3 rounded-xl border transition-all shadow-xl font-bold uppercase tracking-wider text-xs ${isWbWarning ? 'bg-rose-500/10 border-rose-500 text-rose-400 hover:bg-rose-500 hover:text-white animate-pulse' : 'bg-slate-800 border-slate-600 text-slate-300 hover:text-white hover:border-sky-400'}`}>
                      <WhistleIcon className={`w-4 h-4 ${isWbWarning ? 'text-current' : 'text-sky-400'}`} />
                      Whistleblower
                  </button>
              )}
              <button onClick={() => setIsRealityChatOpen(!isRealityChatOpen)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-900/20 border border-violet-500/40 text-violet-300 hover:bg-violet-600 hover:text-white transition-all text-xs font-bold uppercase tracking-wider shadow-xl shadow-violet-900/10">
                <MessageSquareWarning className="w-4 h-4" />
                Reality Check
              </button>
              <button 
                  onClick={handleDownloadReport} 
                  disabled={isExporting}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-900/20 border border-sky-500/40 text-sky-300 hover:bg-sky-600 hover:text-white transition-all text-xs font-bold uppercase tracking-wider shadow-xl shadow-sky-900/10 disabled:opacity-50 disabled:cursor-wait"
              >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Export PDF
              </button>
          </div>
          <div className="flex justify-center">
              <div className={`text-[10px] flex items-center justify-center gap-3 font-mono uppercase tracking-[0.3em] px-6 py-2 rounded-full border ${isEstimated ? 'text-amber-500 bg-amber-950/20 border-amber-500/30' : 'text-slate-500 opacity-80 bg-slate-900/50 border-slate-800'}`}>
                  {isStreaming ? (
                    <><Loader2 className="w-3 h-3 animate-spin text-sky-500" /> DECRYPTING MARKET DATA...</>
                  ) : isEstimated ? (
                    <><WifiOff className="w-3 h-3" /> OFFLINE SIMULATION MODE</>
                  ) : (
                    <><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> LIVE FORENSIC STATUS: ACTIVE</>
                  )}
              </div>
          </div>
      </div>

      {structuredData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <RiskGauge score={structuredData.riskScore} label="Risk Score" type="risk" />
          <RiskGauge score={structuredData.bubbleProbability} label="Bubble Probability" type="bubble" />
          
          <div className="glass-card p-6 rounded-xl flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-30 group-hover:opacity-50 transition-opacity"><Activity className="w-12 h-12 text-white" /></div>
            <div className="text-slate-400 text-xs font-extrabold uppercase tracking-widest mb-3">Market Sentiment</div>
            <div className={`text-4xl font-black flex items-center gap-2 drop-shadow-sm ${structuredData.marketSentiment === 'Bullish' ? 'text-emerald-400' : structuredData.marketSentiment === 'Bearish' ? 'text-rose-400' : 'text-yellow-400'}`}>
              {structuredData.marketSentiment}
            </div>
          </div>
          
          <div className="glass-card p-6 rounded-xl flex flex-col relative overflow-hidden">
            <div className="text-white text-xs font-extrabold uppercase tracking-widest mb-4 border-b border-white/5 pb-2 flex items-center gap-2"><Info className="w-4 h-4 text-sky-400" /> Key Metrics</div>
            <div className="space-y-3">
              {structuredData.keyMetrics.slice(0, 4).map((metric, idx) => (
                <div key={idx} className="flex justify-between items-center group">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{metric.label}</span>
                  <span className="font-mono text-sky-400 font-bold text-sm group-hover:text-white transition-colors">{metric.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {structuredData?.swot && (
        <div className="mb-12">
          <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-3 uppercase tracking-tight"><Target className="w-6 h-6 text-sky-400" /> Strategic Analysis (SWOT)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SwotCard title="Strengths" items={structuredData.swot.strengths} type="strength" />
            <SwotCard title="Weaknesses" items={structuredData.swot.weaknesses} type="weakness" />
            <SwotCard title="Opportunities" items={structuredData.swot.opportunities} type="opportunity" />
            <SwotCard title="Threats" items={structuredData.swot.threats} type="threat" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        <div className="lg:col-span-8 glass-card p-10 rounded-3xl min-h-[600px]">
          <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6"><ShieldCheck className="w-8 h-8 text-sky-400" /><h2 className="text-3xl font-black text-white uppercase tracking-tight">Analyst Report</h2></div>
          <MarkdownRenderer content={markdownReport} />
          
          {groundingChunks && groundingChunks.length > 0 && (
            <div className="mt-16 pt-8 border-t border-white/5">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Institutional Citations & Reference Links</h4>
                <div className="flex flex-wrap gap-3">
                  {groundingChunks.map((chunk, i) => (
                      <a key={i} href={chunk.web?.uri} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-xs text-sky-400 hover:bg-slate-800 hover:border-sky-500 transition-all shadow-md group font-medium">
                        <ExternalLink className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> {chunk.web?.title || 'External Reference'}
                      </a>
                  ))}
                </div>
            </div>
          )}
        </div>
        
        <div className="lg:col-span-4 space-y-8">
          {structuredData?.trendData && (
            <div className="glass-card p-8 rounded-3xl">
              <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tight"><TrendingUp className="w-6 h-6 text-emerald-400" /> Momentum Scan</h3>
              
              <div className="mb-2">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Price Action & MA50</span>
                 </div>
                 <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={structuredData.trendData}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} domain={['auto', 'auto']} width={30} />
                        <Area type="monotone" dataKey="value" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorPrice)" name="Price" isAnimationActive={false} />
                        <Line type="monotone" dataKey="ma50" stroke="#f59e0b" strokeWidth={2} dot={false} name="MA50" strokeDasharray="5 5" isAnimationActive={false} />
                        <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px'}} />
                      </ComposedChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              <div className="mb-6">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">RSI (14) Strength</span>
                 </div>
                 <div className="h-24 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={structuredData.trendData}>
                         <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                         <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} domain={[0, 100]} ticks={[30, 70]} width={30} />
                         <ReferenceLine y={70} stroke="#f43f5e" strokeDasharray="3 3" />
                         <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" />
                         <Line type="monotone" dataKey="rsi" stroke="#a855f7" strokeWidth={2} dot={false} isAnimationActive={false} />
                         <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px'}} />
                      </LineChart>
                    </ResponsiveContainer>
                 </div>
              </div>
              
              {structuredData.technicalAnalysis && (
                  <div className="border-t border-white/5 pt-4">
                      <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Technical Commentary</h4>
                      <p className="text-xs text-slate-300 leading-relaxed font-medium">
                          {structuredData.technicalAnalysis}
                      </p>
                  </div>
              )}
            </div>
          )}
          
          {structuredData && (
            <div className={`p-8 rounded-3xl border shadow-2xl backdrop-blur-sm ${alertBoxClass}`}>
              <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4"><AlertTriangle className={`w-8 h-8 ${alertIconClass}`} /><h3 className="text-2xl font-black text-white uppercase tracking-tighter">Bubble Warning</h3></div>
              <div className="space-y-6">
                  <div className="flex justify-between items-center py-2 border-b border-white/5"><span className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">Risk Status</span><span className={`font-black tracking-widest text-sm ${isHighRisk ? 'text-rose-400' : 'text-emerald-400'}`}>{isHighRisk ? 'ELEVATED' : 'STABLE'}</span></div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5"><span className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">Valuation Verdict</span><span className={`font-black tracking-widest text-sm ${isHighRisk ? 'text-rose-400' : 'text-emerald-400'}`}>{structuredData.bubbleAudit?.valuationVerdict?.toUpperCase() || 'UNRATED'}</span></div>
                  
                  {structuredData.bubbleAudit?.speculativeActivity && (
                     <div className="flex justify-between items-center py-2"><span className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">Speculative Heat</span><span className="font-mono text-xs text-sky-300 font-bold">{structuredData.bubbleAudit.speculativeActivity}</span></div>
                  )}

                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/5"><div className={`h-full transition-all duration-1000 ${isHighRisk ? 'bg-gradient-to-r from-rose-600 to-rose-400' : 'bg-emerald-500'}`} style={{ width: `${structuredData.bubbleProbability}%` }} /></div>
                  
                  {structuredData.bubbleAudit?.fundamentalDivergence && (
                      <div className="pt-4 border-t border-white/5">
                          <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest block mb-2">Divergence Analysis</span>
                          <p className="text-xs text-slate-300 leading-relaxed font-medium bg-black/20 p-3 rounded-lg border border-white/5">
                              {structuredData.bubbleAudit.fundamentalDivergence}
                          </p>
                      </div>
                  )}

                  {structuredData.bubbleAudit?.peerComparison && (
                      <div className="pt-2">
                          <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest block mb-2">Sector Context</span>
                          <p className="text-xs text-slate-400 leading-relaxed font-medium">
                              {structuredData.bubbleAudit.peerComparison}
                          </p>
                      </div>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>

      <RealityChat isOpen={isRealityChatOpen} onClose={() => setIsRealityChatOpen(false)} context={{ symbol: title, riskScore: structuredData?.riskScore || 50, sentiment: structuredData?.marketSentiment || 'Neutral' }} />

      {isWhistleOpen && structuredData?.whistleblower && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsWhistleOpen(false)} />
            <div className={`relative w-full max-w-4xl rounded-3xl border shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] ${wbBg}`}>
               <div className="p-8 border-b border-white/10 flex justify-between items-start">
                  <div className="flex items-center gap-5">
                     <div className={`p-4 rounded-2xl ${isWbWarning ? 'bg-rose-500/20 border border-rose-500/30' : 'bg-emerald-500/20 border border-emerald-500/20'}`}>
                        <WhistleIcon className={`w-10 h-10 ${wbColor}`} />
                     </div>
                     <div>
                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Forensic Deep-Dive</h2>
                     </div>
                  </div>
                  <button onClick={() => setIsWhistleOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all">
                     <X className="w-7 h-7" />
                  </button>
               </div>
               <div className="p-8 space-y-8 overflow-y-auto no-scrollbar bg-slate-950/20">
                     
                     {/* Risk Scale */}
                     <div className="bg-black/20 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
                        <div className="flex justify-between items-center mb-4">
                           <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Integrity Assessment Scale</h4>
                           <div className={`text-2xl font-black ${wbColor} drop-shadow-md`}>
                              {structuredData.whistleblower.integrityScore} <span className="text-sm text-slate-500 font-bold">/ 100</span>
                           </div>
                        </div>
                        
                        <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden shadow-inner border border-white/5">
                           {/* Gradient Bar */}
                           <div className="absolute inset-0 bg-gradient-to-r from-rose-600 via-amber-500 to-emerald-500 opacity-90" />
                           {/* Scanlines overlay for effect */}
                           <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhZWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==')] opacity-20"></div>
                           
                           {/* Marker */}
                           <div 
                              className="absolute top-0 bottom-0 w-1.5 bg-white shadow-[0_0_15px_rgba(255,255,255,1)] z-10 transition-all duration-1000 transform -translate-x-1/2"
                              style={{ left: `${structuredData.whistleblower.integrityScore}%` }}
                           />
                        </div>
                        
                        <div className="flex justify-between mt-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                           <span className="text-rose-500">High Risk</span>
                           <span className="text-amber-500">Caution</span>
                           <span className="text-emerald-500">Clean</span>
                        </div>
                     </div>

                     <p className="mt-6 text-slate-300 text-sm leading-relaxed italic border-l-2 border-sky-500/30 pl-4">
                        "{structuredData.whistleblower.forensicVerdict}"
                     </p>
                     
                     {structuredData.whistleblower.anomalies && structuredData.whistleblower.anomalies.length > 0 && (
                        <div>
                             <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-rose-500" /> 
                                Detected Anomalies & Red Flags
                             </h4>
                             <ul className="space-y-3">
                                {structuredData.whistleblower.anomalies.map((anomaly, idx) => (
                                    <li key={idx} className="flex items-start gap-3 bg-rose-900/10 border border-rose-500/10 p-4 rounded-xl text-sm text-slate-300">
                                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0"></span>
                                        <span className="leading-relaxed">{anomaly}</span>
                                    </li>
                                ))}
                             </ul>
                        </div>
                     )}

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white/5 p-6 rounded-xl border border-white/5">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Insider Activity</h4>
                            <p className="text-xs text-slate-300 leading-relaxed">{structuredData.whistleblower.insiderActivity}</p>
                        </div>
                        <div className="bg-white/5 p-6 rounded-xl border border-white/5">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Accounting Quality</h4>
                            <p className="text-xs text-slate-300 leading-relaxed">{structuredData.whistleblower.accountingFlags}</p>
                        </div>
                     </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default AnalysisView;