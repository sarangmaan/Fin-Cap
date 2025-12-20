import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { stocks } from '../data/stocks';

interface SearchBarProps {
  query: string;
  setQuery: (query: string) => void;
  onSearch: (query: string) => void;
  loading: boolean;
  className?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ query, setQuery, onSearch, loading, className }) => {
  const [suggestions, setSuggestions] = useState<typeof stocks>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  };

  useLayoutEffect(() => {
    if (showSuggestions) {
      updateDropdownPosition();
      window.addEventListener('resize', updateDropdownPosition);
      window.addEventListener('scroll', updateDropdownPosition, true);
    }
    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [showSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (value.length > 0) {
      const lowerQuery = value.toLowerCase();
      const filtered = stocks
        .filter(stock => 
          stock.symbol.toLowerCase().includes(lowerQuery) || 
          stock.name.toLowerCase().includes(lowerQuery)
        )
        .sort((a, b) => a.symbol.localeCompare(b.symbol));
      setSuggestions(filtered.slice(0, 8));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (stock: typeof stocks[0]) => {
    const newQuery = `${stock.symbol} - ${stock.name}`;
    setQuery(newQuery);
    setShowSuggestions(false);
    onSearch(newQuery);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className} overflow-visible`}>
      {/* Glowing Gradient Border Wrapper */}
      <div className="p-[4px] rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 shadow-[0_0_30px_-5px_rgba(34,211,238,0.6)]">
        <form onSubmit={handleSubmit} className="relative flex z-50 bg-[#1e293b] rounded-[10px]">
          <input 
            ref={inputRef}
            type="text" 
            value={query}
            onChange={handleInputChange}
            onFocus={() => { if(query.length > 0) setShowSuggestions(true); }}
            placeholder="Analyze a stock (e.g., TSLA), sector (e.g., AI), or market..."
            className="w-full bg-transparent text-white placeholder-slate-400 border-none rounded-[10px] py-4 pl-6 pr-14 focus:outline-none focus:ring-0 text-lg transition-all"
            disabled={loading}
          />
          <button 
            type="submit"
            disabled={loading}
            className="absolute right-2 top-2 bottom-2 bg-sky-600 hover:bg-sky-500 text-white p-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search className="w-6 h-6" />
          </button>
        </form>
      </div>

      {/* PORTALED DROPDOWN */}
      {showSuggestions && suggestions.length > 0 && createPortal(
        <div 
          className="fixed bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden max-h-96 overflow-y-auto ring-1 ring-sky-500/20 isolate pointer-events-auto"
          style={{ 
            top: `${dropdownPos.top + 12}px`, 
            left: `${dropdownPos.left}px`, 
            width: `${dropdownPos.width}px`,
            zIndex: 9999,
            isolation: 'isolate'
          }}
        >
          {suggestions.map((stock) => (
            <div 
              key={stock.symbol}
              className="px-6 py-4 hover:bg-slate-800 cursor-pointer flex justify-between items-center transition-all border-b border-slate-800 last:border-0 group/item relative overflow-hidden active:bg-slate-700 pointer-events-auto"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelectSuggestion(stock);
              }}
            >
              <div className="flex flex-col items-start gap-1 relative z-10 pointer-events-none">
                <span className="font-black text-sky-400 text-lg group-hover/item:text-white group-hover/item:translate-x-1 transition-all">
                  {stock.symbol}
                </span>
                <span className="text-sm text-slate-400 font-bold group-hover/item:text-slate-200">{stock.name}</span>
              </div>
              <div className="flex items-center gap-2 relative z-10 pointer-events-none">
                <span className="text-[10px] font-mono font-black text-slate-300 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full uppercase tracking-widest group-hover/item:bg-sky-900/50 group-hover/item:border-sky-500/50">
                  {stock.exchange}
                </span>
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

export default SearchBar;