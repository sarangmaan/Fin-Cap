import React from 'react';
import { CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, Rocket, AlertOctagon } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

const TableRenderer: React.FC<{ rows: string[] }> = ({ rows }) => {
  // Basic markdown table parser
  // Assumes row 0 is header, row 1 is divider, row 2+ is data
  if (rows.length < 2) return null;

  const headers = rows[0].split('|').filter(c => c.trim() !== '').map(c => c.trim());
  const dataRows = rows.slice(2).map(r => r.split('|').filter(c => c.trim() !== '').map(c => c.trim()));

  return (
    <div className="overflow-x-auto my-8 border border-slate-700 rounded-lg shadow-lg">
      <table className="w-full text-sm text-left text-slate-300 border-collapse">
        <thead className="text-xs text-slate-400 uppercase bg-slate-900/80">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-6 py-4 font-bold tracking-wider border border-slate-700 bg-slate-900">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-slate-800/20">
          {dataRows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-700/30 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="px-6 py-4 whitespace-pre-wrap leading-relaxed border border-slate-700">
                   {/* Handle bolding inside table cells too */}
                   <InlineText text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Helper component for bold text processing
const InlineText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </>
  );
};

const VerdictBadge: React.FC<{ verdict: string }> = ({ verdict }) => {
  const v = verdict.replace(/\[\[\[|\]\]\]/g, '').trim();
  
  let styles = 'bg-slate-700 text-white';
  let icon = <CheckCircle2 className="w-6 h-6" />;

  switch(v.toLowerCase()) {
    case 'strong buy':
      styles = 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] border border-emerald-400';
      icon = <Rocket className="w-6 h-6" />;
      break;
    case 'buy':
      styles = 'bg-emerald-500/90 text-white border border-emerald-500/50';
      icon = <TrendingUp className="w-6 h-6" />;
      break;
    case 'hold':
    case 'caution':
      styles = 'bg-amber-400 text-slate-900 border border-amber-300';
      icon = <AlertTriangle className="w-6 h-6" />;
      break;
    case 'sell':
      styles = 'bg-rose-500 text-white border border-rose-400';
      icon = <TrendingDown className="w-6 h-6" />;
      break;
    case 'strong sell':
      styles = 'bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.5)] border border-rose-500';
      icon = <AlertOctagon className="w-6 h-6" />;
      break;
  }

  return (
    <div className="my-6">
      <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-xl font-bold text-xl uppercase tracking-widest shadow-lg transform transition-all hover:scale-105 ${styles}`}>
        {icon}
        {v}
      </div>
    </div>
  );
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const lines = content.split('\n');
  const elements: { type: 'text' | 'table' | 'verdict'; content: string | string[] }[] = [];
  let tableBuffer: string[] = [];

  // Group lines into tables or text blocks
  lines.forEach((line) => {
    if (line.trim().startsWith('|')) {
      tableBuffer.push(line);
    } else {
      if (tableBuffer.length > 0) {
        elements.push({ type: 'table', content: [...tableBuffer] });
        tableBuffer = [];
      }
      
      // Check for Verdict pattern: [[[Verdict]]]
      if (line.trim().startsWith('[[[') && line.trim().endsWith(']]]')) {
         elements.push({ type: 'verdict', content: line });
      } else {
         elements.push({ type: 'text', content: line });
      }
    }
  });
  // Flush remaining table
  if (tableBuffer.length > 0) {
    elements.push({ type: 'table', content: [...tableBuffer] });
  }

  return (
    <div className="space-y-4 text-slate-300 leading-relaxed">
      {elements.map((el, index) => {
        if (el.type === 'table') {
          return <TableRenderer key={index} rows={el.content as string[]} />;
        }
        
        if (el.type === 'verdict') {
           return <VerdictBadge key={index} verdict={el.content as string} />;
        }

        const line = el.content as string;
        
        // Headers
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-xl font-bold text-sky-400 mt-8 mb-3">{line.replace('### ', '')}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-2xl font-bold text-white mt-10 mb-4 border-b border-slate-700 pb-2">{line.replace('## ', '')}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400 mb-6">{line.replace('# ', '')}</h1>;
        }

        // Lists
        if (line.trim().startsWith('- ')) {
          return (
            <div key={index} className="flex items-start ml-4 my-1">
              <span className="text-emerald-500 mr-2 min-w-[10px]">•</span>
              <span><InlineText text={line.replace('- ', '')} /></span>
            </div>
          );
        }
        
        // Numbered Lists
         if (/^\d+\.\s/.test(line.trim())) {
             return (
                 <div key={index} className="flex items-start ml-4 my-1">
                     <span className="text-sky-500 mr-2 font-mono">{line.trim().split('.')[0]}.</span>
                     <span><InlineText text={line.replace(/^\d+\.\s/, '')} /></span>
                 </div>
             )
         }

        // Empty lines
        if (line.trim() === '') {
          return <div key={index} className="h-2"></div>;
        }

        // Paragraphs
        return <p key={index}><InlineText text={line} /></p>;
      })}
    </div>
  );
};

export default MarkdownRenderer;