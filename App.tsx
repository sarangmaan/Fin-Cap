import React, { useState, useEffect } from 'react';
import { ViewState, AnalysisResult, PortfolioItem } from './types';
import AnalysisView from './components/AnalysisView';
import PortfolioView from './components/PortfolioView';
import BubbleScopeView from './components/BubbleScopeView';
import SearchBar from './components/SearchBar';
import Logo from './components/Logo';
import { BarChart3, AlertTriangle, DollarSign, PieChart, Activity } from 'lucide-react';
import { analyzeMarket, analyzePortfolio, analyzeBubbles } from './services/geminiService';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
  const [query, setQuery] = useState('');
  const [analyzedQuery, setAnalyzedQuery] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Portfolio State
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(() => {
    const saved = localStorage.getItem('fincap_portfolio');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('fincap_portfolio', JSON.stringify(portfolioItems));
  }, [portfolioItems]);

  const handleUpdatePortfolio = (items: PortfolioItem[]) => {
    setPortfolioItems(items);
  };

  const performAnalysis = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setAnalyzedQuery(searchQuery);
    
    // Start with the Loading View (Spinners)
    setView(ViewState.ANALYZING);
    setResult(null);

    try {
      await analyzeMarket(searchQuery, (partialResult) => {
          setResult((prev) => {
             if (partialResult.markdownReport && partialResult.markdownReport.length > 5) {
                 setView(ViewState.REPORT);
             }
             return {
                markdownReport: partialResult.markdownReport || prev?.markdownReport || "",
                structuredData: partialResult.structuredData || prev?.structuredData,
                groundingChunks: partialResult.groundingChunks || prev?.groundingChunks,
                isEstimated: partialResult.isEstimated
             };
          });
      });
      
    } catch (err: any) {
      console.error("Search Analysis Failed:", err);
      let msg = err.message || 'Something went wrong.';
      if (msg.includes('503') || msg.includes('overloaded')) {
          msg = "Server is experiencing high traffic. Please try again in a moment.";
      }
      setError(msg);
      setView(ViewState.ERROR);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      setQuery(q);
      performAnalysis(q);
    }
  }, []);

  const handleAnalyzePortfolio = async () => {
    if (portfolioItems.length === 0) return;
    setLoading(true);
    setError(null);
    setAnalyzedQuery("Portfolio Risk Audit");
    setView(ViewState.ANALYZING);
    setResult(null);
    try {
      await analyzePortfolio(portfolioItems, (partialResult) => {
          setResult((prev) => {
             if (partialResult.markdownReport && partialResult.markdownReport.length > 5) {
                 setView(ViewState.REPORT);
             }
             return {
                markdownReport: partialResult.markdownReport || prev?.markdownReport || "",
                structuredData: partialResult.structuredData || prev?.structuredData,
                groundingChunks: partialResult.groundingChunks || prev?.groundingChunks,
                isEstimated: partialResult.isEstimated
             };
          });
      });
    } catch (err: any) {
      setError(err.message || 'Portfolio analysis failed.');
      setView(ViewState.ERROR);
    } finally {
      setLoading(false);
    }
  };

  const handleBubbleScope = async () => {
      setLoading(true);
      setError(null);
      setAnalyzedQuery("Global Market Bubble Scope");
      setView(ViewState.BUBBLE_SCOPE);
      setResult({ markdownReport: "Initiating Global Market Scan...", isEstimated: false });
      try {
          await analyzeBubbles((partialResult) => {
              setResult((prev) => ({
                  markdownReport: partialResult.markdownReport || prev?.markdownReport || "",
                  structuredData: partialResult.structuredData || prev?.structuredData,
                  groundingChunks: partialResult.groundingChunks || prev?.groundingChunks,
                  isEstimated: partialResult.isEstimated
              }));
          });
      } catch (err: any) {
          setError(err.message || 'Bubble Scope analysis failed.');
          setView(ViewState.ERROR);
      } finally {
          setLoading(false);
      }
  };
  
  const handleRetry = () => {
    setView(ViewState.DASHBOARD);
    setError(null);
    setQuery('');
  };

  const handleNavClick = (viewName: string) => {
      if (viewName === 'Portfolio') setView(ViewState.PORTFOLIO);
      else if (viewName === 'Markets') setView(ViewState.DASHBOARD);
      else if (viewName === 'Bubble Scope') handleBubbleScope();
  };

  return (
    <div 
      className="relative min-h-screen bg-[#0f172a] text-white font-sans selection:bg-sky-500/30 overflow-x-hidden"
      style={{
        background: 'radial-gradient(circle at center, rgba(15, 23, 42, 0) 50%, rgba(6, 182, 212, 0.05) 100%)'
      }}
    >
      
      {/* 
         THE NEON VIGNETTE FRAME (Simulated ::before)
         This element sits on top of everything but lets clicks pass through.
      */}
      <div 
        className="fixed inset-0 z-50 pointer-events-none"
        style={{
          border: '3px solid transparent',
          borderRadius: '28px',
          background: 'linear-gradient(to bottom right, #06b6d4, #3b82f6, #a855f7) border-box',
          mask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
          WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          boxShadow: '0 0 25px rgba(6, 182, 212, 0.3), inset 0 0 15px rgba(59, 130, 246, 0.2)'
        }}
      />

      <div className="relative z-10 flex flex-col min-h-screen pt-4 pb-4 px-6 md:px-8">
        {/* Navigation */}
        <nav className="sticky top-4 z-40 bg-[#0f172a]/80 backdrop-blur-md rounded-2xl border border-white/5 mb-8">
          <div className="px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setView(ViewState.DASHBOARD); handleNavClick('Markets'); }}>
              <div className="relative flex items-center justify-center">
                 <div className="absolute inset-0 bg-sky-500/20 blur-lg rounded-full"></div>
                 <Logo className="w-10 h-10 relative z-10" />
              </div>
              <span className="font-bold text-xl tracking-tight text-white">Fin<span className="text-sky-400">Cap</span></span>
            </div>
            
            <div className="flex items-center gap-2 md:gap-6 text-sm font-medium text-slate-400">
              <button onClick={() => handleNavClick('Markets')} className={`whitespace-nowrap px-3 py-1.5 rounded-full hover:text-white transition-colors cursor-pointer ${view === ViewState.DASHBOARD || view === ViewState.REPORT ? 'text-white font-bold bg-slate-800 border border-slate-700' : ''}`}>Markets</button>
              <button onClick={() => handleNavClick('Portfolio')} className={`whitespace-nowrap px-3 py-1.5 rounded-full hover:text-white transition-colors cursor-pointer ${view === ViewState.PORTFOLIO ? 'text-white font-bold bg-slate-800 border border-slate-700' : ''}`}>Portfolio</button>
              <button onClick={() => handleNavClick('Bubble Scope')} className={`whitespace-nowrap px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1 ${view === ViewState.BUBBLE_SCOPE ? 'bg-rose-950/30 text-rose-400 border border-rose-500/50 font-bold' : 'text-rose-400/80 hover:text-rose-400 hover:bg-rose-950/10'}`}>
                 <Activity className="w-4 h-4" /> Bubble Scope
              </button>
            </div>
          </div>
        </nav>

        <main className="flex-grow w-full max-w-7xl mx-auto">
          
          {/* Search Bar Container */}
          <div className={`mb-12 transition-all duration-500 ${view === ViewState.DASHBOARD ? 'translate-y-0 opacity-100' : ''} overflow-visible`}>
             <div className={`max-w-3xl mx-auto ${view !== ViewState.DASHBOARD ? 'hidden' : 'block'}`}>
                <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                  Predict the Crash. <br/>Find the Opportunity.
                </h1>
                <p className="text-center text-white mb-8 text-lg font-medium drop-shadow-sm">
                  AI-powered financial analysis detecting overvaluation, market bubbles, and hidden risks.
                </p>
             </div>
             
             <div className={`max-w-2xl mx-auto ${view === ViewState.REPORT || view === ViewState.PORTFOLIO || view === ViewState.BUBBLE_SCOPE ? 'scale-90 opacity-0 h-0 overflow-visible pointer-events-none' : 'overflow-visible'}`}>
               <SearchBar 
                  query={query} 
                  setQuery={setQuery} 
                  onSearch={performAnalysis} 
                  loading={loading}
               />

               <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs text-slate-500 pointer-events-auto">
                  <span className="px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700 cursor-pointer hover:border-slate-500 hover:text-slate-200 transition-all hover:shadow-[0_0_10px_rgba(14,165,233,0.1)] active:scale-95 flex items-center gap-2" onClick={() => { setQuery('Top trending stocks and assets today'); performAnalysis('Top trending stocks and assets today'); }}>🔥 Trending</span>
                  <span className="px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700 cursor-pointer hover:border-slate-500 hover:text-slate-200 transition-all hover:shadow-[0_0_10px_rgba(14,165,233,0.1)] active:scale-95 flex items-center gap-2" onClick={() => { setQuery('Is there a bubble in AI stocks?'); performAnalysis('Is there a bubble in AI stocks?'); }}>🤖 AI Bubble</span>
                  <span className="px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700 cursor-pointer hover:border-slate-500 hover:text-slate-200 transition-all hover:shadow-[0_0_10px_rgba(14,165,233,0.1)] active:scale-95 flex items-center gap-2" onClick={() => { setQuery('Analyze Housing Market 2024'); performAnalysis('Analyze Housing Market 2024'); }}>🏠 Housing</span>
                  <span className="px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700 cursor-pointer hover:border-slate-500 hover:text-slate-200 transition-all hover:shadow-[0_0_10px_rgba(14,165,233,0.1)] active:scale-95 flex items-center gap-2" onClick={() => { setQuery('Crypto Market Outlook'); performAnalysis('Crypto Market Outlook'); }}>🪙 Crypto</span>
               </div>
             </div>
          </div>

          {/* Views */}
          {view === ViewState.ANALYZING && (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
               <div className="relative w-24 h-24 mb-8">
                  <div className="absolute inset-0 border-t-4 border-sky-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-3 border-r-4 border-emerald-500 rounded-full animate-spin-reverse"></div>
               </div>
               <h2 className="text-2xl font-bold text-white mb-2">Analyzing Markets...</h2>
               <p className="text-slate-400">Scanning real-time data via Google Search...</p>
            </div>
          )}

          {view === ViewState.ERROR && (
            <div className="max-w-2xl mx-auto text-center py-20 bg-rose-950/10 border border-rose-900/50 rounded-2xl">
              <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Analysis Failed</h2>
              <p className="text-slate-400 mb-6 px-4">{error}</p>
              <button 
                onClick={handleRetry}
                className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg border border-slate-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {view === ViewState.PORTFOLIO && (
            <PortfolioView 
              items={portfolioItems} 
              onUpdate={handleUpdatePortfolio} 
              onAnalyze={handleAnalyzePortfolio} 
            />
          )}

          {view === ViewState.BUBBLE_SCOPE && result && (
              <div>
                   <div className="flex items-center justify-between mb-8">
                     <button 
                      onClick={() => { setView(ViewState.DASHBOARD); handleNavClick('Markets'); }}
                      className="text-sm text-slate-400 hover:text-white flex items-center gap-2 transition-colors"
                     >
                       ← Back to Markets
                     </button>
                     <span className="text-xs text-rose-400 border border-rose-900/50 px-3 py-1 rounded-full bg-rose-950/20">
                        LIVE SYSTEMIC RISK MONITOR
                     </span>
                  </div>
                  <BubbleScopeView data={result} />
              </div>
          )}

          {view === ViewState.REPORT && result && (
            <div>
              <div className="flex items-center justify-between mb-8">
                 <button 
                  onClick={() => { setView(ViewState.DASHBOARD); handleNavClick('Markets'); }}
                  className="text-sm text-slate-400 hover:text-white flex items-center gap-2 transition-colors"
                 >
                   ← New Analysis
                 </button>
                 <span className="text-xs text-slate-500 border border-slate-800 px-3 py-1 rounded-full bg-slate-900">
                    Powered by Gemini 2.5 & Google Search
                 </span>
              </div>
              <AnalysisView data={result} title={analyzedQuery} />
            </div>
          )}

          {view === ViewState.DASHBOARD && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 opacity-80">
               <div className="p-6 bg-slate-800/30 border border-slate-800 rounded-xl hover:border-slate-600 transition-colors group cursor-pointer" onClick={() => performAnalysis('Deep Fundamental Scan of major tech stocks')}>
                  <div className="w-12 h-12 bg-sky-900/30 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                     <BarChart3 className="w-6 h-6 text-sky-400" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-200 mb-2">Deep Fundamental Scan</h3>
                  <p className="text-sm text-slate-400">Automated analysis of P/E, PEG, debt ratios, and cash flow health.</p>
               </div>
               <div className="p-6 bg-slate-800/30 border border-slate-800 rounded-xl hover:border-slate-600 transition-colors group cursor-pointer" onClick={() => performAnalysis('Find fair value estimates for trending stocks')}>
                  <div className="w-12 h-12 bg-emerald-900/30 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                     <DollarSign className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-200 mb-2">Fair Value Estimation</h3>
                  <p className="text-sm text-slate-400">AI-driven valuation models to detect over-hyped assets.</p>
               </div>
               <div className="p-6 bg-slate-800/30 border border-slate-800 rounded-xl hover:border-slate-600 transition-colors group cursor-pointer" onClick={() => handleBubbleScope()}>
                  <div className="w-12 h-12 bg-rose-900/30 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                     <PieChart className="w-6 h-6 text-rose-400" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-200 mb-2">Bubble Detection</h3>
                  <p className="text-sm text-slate-400">Comparative historical analysis to identify unsustainable parabolic moves.</p>
               </div>
            </div>
          )}

        </main>
        
        <footer className="border-t border-slate-800 mt-20 bg-[#0b1120] py-8">
           <div className="max-w-7xl mx-auto px-4 text-center">
              <p className="text-xs text-slate-600 max-w-2xl mx-auto leading-relaxed">
                 <strong>DISCLAIMER:</strong> This application is for informational and educational purposes only. It is powered by Artificial Intelligence and may produce inaccurate results. It does not constitute financial advice, investment recommendations, or an offer to buy or sell any assets. Always conduct your own research or consult a certified financial advisor before making investment decisions.
              </p>
           </div>
        </footer>
      </div>
    </div>
  );
};

export default App;