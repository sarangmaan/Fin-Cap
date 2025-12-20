import React from 'react';

interface RiskGaugeProps {
  score: number;
  label: string;
  type?: 'risk' | 'bubble';
}

const RiskGauge: React.FC<RiskGaugeProps> = ({ score, label, type = 'risk' }) => {
  // Calculate color based on score
  const getColor = (val: number) => {
    if (val < 30) return 'text-emerald-400 border-emerald-500 shadow-emerald-900/50';
    if (val < 70) return 'text-yellow-400 border-yellow-500 shadow-yellow-900/50';
    return 'text-rose-500 border-rose-500 shadow-rose-900/50';
  };

  const getBgColor = (val: number) => {
      if (val < 30) return 'bg-emerald-500';
      if (val < 70) return 'bg-yellow-500';
      return 'bg-rose-500';
  }

  const themeColor = getColor(score);
  const barColor = getBgColor(score);
  
  // Circumference for SVG circle
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="glass-card p-6 rounded-xl flex flex-col items-center justify-center">
      <div className="relative w-32 h-32 mb-4">
        {/* Background Circle */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth="10"
          />
          {/* Progress Circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`${themeColor.split(' ')[0]} transition-all duration-1000 ease-out`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className={`text-4xl font-black ${themeColor.split(' ')[0]}`}>{score}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">/ 100</span>
        </div>
      </div>
      <h3 className="text-sm font-extrabold text-white uppercase tracking-wider text-center">{label}</h3>
      <div className={`mt-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${barColor} text-slate-900`}>
        {score < 30 ? 'SAFE' : score < 70 ? 'CAUTION' : 'DANGER'}
      </div>
    </div>
  );
};

export default RiskGauge;