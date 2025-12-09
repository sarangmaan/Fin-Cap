import React, { useState, useEffect } from 'react';
import { PortfolioItem } from '../types';
import { stocks } from '../data/stocks';
import { Plus, Trash2, PieChart, TrendingUp, RefreshCcw, Wallet, BrainCircuit } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';

interface PortfolioViewProps {
  items: PortfolioItem[];
  onUpdate: (items: PortfolioItem[]) => void;
  onAnalyze: () => void;
}

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#6366f1', '#ec4899'];

const PortfolioView: React.FC<PortfolioViewProps> = ({ items, onUpdate, onAnalyze }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<{ symbol: string; qty: string; cost: string }>({ symbol: '', qty: '', cost: '' });
  const [suggestions, setSuggestions] = useState<typeof stocks>([]);

  // Derived Stats
  const totalValue = items.reduce((acc, item) => acc + (item.currentPrice * item.quantity), 0);
  const totalCost = items.reduce((acc, item) => acc + (item.buyPrice * item.quantity), 0);
  const totalPL = totalValue - totalCost;
  const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

  const handleSymbolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setNewItem({ ...newItem, symbol: val });
    if (val.length > 0) {
      setSuggestions(stocks.filter(s => s.symbol.includes(val) || s.name.toLowerCase().includes(val.toLowerCase())).slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  const addAsset = () => {
    if (!newItem.symbol || !newItem.qty || !newItem.cost) return;
    const stock = stocks.find(s => s.symbol === newItem.symbol);
    const item: PortfolioItem = {
      id: Date.now().toString(),
      symbol: newItem.symbol,
      name: stock ? stock.name : newItem.symbol,
      quantity: parseFloat(newItem.qty),
      buyPrice: parseFloat(newItem.cost),
      currentPrice: parseFloat(newItem.cost) // Default to buy price initially
    };
    onUpdate([...items, item]);
    setNewItem({ symbol: '', qty: '', cost: '' });
    setIsAdding(false);
  };

  const removeAsset = (id: string) => {
    onUpdate(items.filter(i => i.id !== id));
  };

  const refreshPrices = () => {
    // Simulates a price update for demo purposes
    const updated = items.map(item => ({
      ...item,
      currentPrice: item.buyPrice * (1 + (Math.random() * 0.2 - 0.05)) // Random -5% to +15%
    }));
    onUpdate(updated);
  };

  const chartData = items.map(item => ({
    name: item.symbol,
    value: item.quantity * item.currentPrice
  }));

  return (
    <div className="pb-20 animate-fade-in">
       {/* Header */}
       <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-slate-700 pb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">My Portfolio</h2>
            <p className="text-slate-400 text-sm">Track your holdings and get AI risk assessments.</p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
             <button onClick={refreshPrices} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700 text-sm">
                <RefreshCcw className="w-4 h-4" /> Simulate Market Data
             </button>
             <button onClick={onAnalyze} className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-500 transition-colors font-semibold shadow-lg shadow-sky-900/20">
                <BrainCircuit className="w-4 h-4" /> AI Risk Audit
             </button>
          </div>
       </div>

       {/* Stats Cards */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/40 p-6 rounded-xl border border-slate-700 backdrop-blur-sm">
             <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                <Wallet className="w-4 h-4" /> Net Worth
             </div>
             <div className="text-3xl font-bold text-white font-mono">
                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
             </div>
          </div>
          <div className="bg-slate-800/40 p-6 rounded-xl border border-slate-700 backdrop-blur-sm">
             <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Total P/L ($)
             </div>
             <div className={`text-3xl font-bold font-mono ${totalPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalPL >= 0 ? '+' : ''}{totalPL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
             </div>
          </div>
          <div className="bg-slate-800/40 p-6 rounded-xl border border-slate-700 backdrop-blur-sm">
             <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                <PieChart className="w-4 h-4" /> Total P/L (%)
             </div>
             <div className={`text-3xl font-bold font-mono ${totalPLPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalPLPercent >= 0 ? '+' : ''}{totalPLPercent.toFixed(2)}%
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Holdings List */}
          <div className="lg:col-span-2 space-y-4">
             <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-white">Holdings</h3>
                <button onClick={() => setIsAdding(!isAdding)} className="flex items-center gap-1 text-sm text-sky-400 hover:text-sky-300">
                   <Plus className="w-4 h-4" /> Add Asset
                </button>
             </div>

             {isAdding && (
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-600 mb-4 animate-in fade-in slide-in-from-top-2">
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="relative">
                         <label className="text-xs text-slate-400 block mb-1">Symbol</label>
                         <input 
                           type="text" 
                           value={newItem.symbol} 
                           onChange={handleSymbolChange}
                           className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                           placeholder="AAPL"
                         />
                         {suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-slate-800 border border-slate-700 z-50 rounded-b mt-1">
                               {suggestions.map(s => (
                                  <div key={s.symbol} onClick={() => { setNewItem({ ...newItem, symbol: s.symbol }); setSuggestions([]); }} className="px-3 py-2 hover:bg-slate-700 cursor-pointer text-xs">
                                     <span className="font-bold text-sky-400">{s.symbol}</span> <span className="text-slate-400">{s.name}</span>
                                  </div>
                               ))}
                            </div>
                         )}
                      </div>
                      <div>
                         <label className="text-xs text-slate-400 block mb-1">Quantity</label>
                         <input 
                           type="number" 
                           value={newItem.qty} 
                           onChange={e => setNewItem({ ...newItem, qty: e.target.value })}
                           className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                           placeholder="0"
                         />
                      </div>
                      <div>
                         <label className="text-xs text-slate-400 block mb-1">Avg Buy Price</label>
                         <input 
                           type="number" 
                           value={newItem.cost} 
                           onChange={e => setNewItem({ ...newItem, cost: e.target.value })}
                           className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                           placeholder="$0.00"
                         />
                      </div>
                      <button onClick={addAsset} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
                         Save
                      </button>
                   </div>
                </div>
             )}

             <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
                <table className="w-full text-left text-sm">
                   <thead className="bg-slate-900/50 text-slate-400 uppercase text-xs">
                      <tr>
                         <th className="px-6 py-4 font-medium">Asset</th>
                         <th className="px-6 py-4 font-medium text-right">Qty</th>
                         <th className="px-6 py-4 font-medium text-right">Avg Cost</th>
                         <th className="px-6 py-4 font-medium text-right">Price (Sim)</th>
                         <th className="px-6 py-4 font-medium text-right">Value</th>
                         <th className="px-6 py-4 font-medium text-right">P/L</th>
                         <th className="px-6 py-4 font-medium text-right">Action</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-700/50">
                      {items.map((item) => {
                         const val = item.quantity * item.currentPrice;
                         const pl = val - (item.quantity * item.buyPrice);
                         const plPer = (pl / (item.quantity * item.buyPrice)) * 100;
                         return (
                            <tr key={item.id} className="hover:bg-slate-700/30 transition-colors">
                               <td className="px-6 py-4">
                                  <div className="font-bold text-white">{item.symbol}</div>
                                  <div className="text-xs text-slate-500 truncate max-w-[150px]">{item.name}</div>
                               </td>
                               <td className="px-6 py-4 text-right text-slate-300">{item.quantity}</td>
                               <td className="px-6 py-4 text-right text-slate-300">${item.buyPrice.toFixed(2)}</td>
                               <td className="px-6 py-4 text-right text-sky-300 font-mono">${item.currentPrice.toFixed(2)}</td>
                               <td className="px-6 py-4 text-right font-bold text-white">${val.toLocaleString()}</td>
                               <td className="px-6 py-4 text-right">
                                  <div className={`font-bold ${pl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                     {pl >= 0 ? '+' : ''}{pl.toFixed(2)}
                                  </div>
                                  <div className={`text-xs ${pl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                     {plPer.toFixed(2)}%
                                  </div>
                               </td>
                               <td className="px-6 py-4 text-right">
                                  <button onClick={() => removeAsset(item.id)} className="text-slate-500 hover:text-rose-500 transition-colors">
                                     <Trash2 className="w-4 h-4" />
                                  </button>
                               </td>
                            </tr>
                         );
                      })}
                      {items.length === 0 && (
                         <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-slate-500 italic">
                               No assets in portfolio. Click "Add Asset" to start tracking.
                            </td>
                         </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>

          {/* Allocation Chart */}
          <div className="bg-slate-800/40 p-6 rounded-xl border border-slate-700 backdrop-blur-sm h-96">
             <h3 className="text-lg font-bold text-white mb-4">Allocation</h3>
             {items.length > 0 ? (
                <ResponsiveContainer width="100%" height="90%">
                   <RePieChart>
                      <Pie
                         data={chartData}
                         cx="50%"
                         cy="50%"
                         innerRadius={60}
                         outerRadius={80}
                         paddingAngle={5}
                         dataKey="value"
                      >
                         {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#1e293b" strokeWidth={2} />
                         ))}
                      </Pie>
                      <ReTooltip 
                         contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                         itemStyle={{ color: '#fff' }}
                      />
                      <Legend />
                   </RePieChart>
                </ResponsiveContainer>
             ) : (
                <div className="h-full flex items-center justify-center text-slate-600 text-sm">
                   Add assets to see allocation
                </div>
             )}
          </div>
       </div>
    </div>
  );
};

export default PortfolioView;