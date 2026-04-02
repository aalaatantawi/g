import React from 'react';

interface Props { message: string; }

const LoadingOverlay: React.FC<Props> = ({ message }) => {
  return (
    <div className="apple-card p-16 text-center flex flex-col items-center justify-center min-h-[400px] bg-white relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#f5f5f7]/50 to-transparent pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col items-center">
        {/* Animated rings */}
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 border-4 border-[#f5f5f7] rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-[#E6192B] rounded-full animate-spin" style={{ animationDuration: '1.5s' }}></div>
          <div className="absolute inset-2 border-4 border-transparent border-b-[#d4af37] rounded-full animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <i className="fas fa-brain text-[#1C1C1E] text-xl animate-pulse"></i>
          </div>
        </div>
        
        <h3 className="text-2xl font-bold mb-3 tracking-tight text-[#1C1C1E]">Analyzing Clinical Data</h3>
        <p className="font-semibold text-[#86868b] uppercase tracking-widest text-[11px] animate-pulse">
          {message || "PROCESSING PROTOCOL..."}
        </p>
      </div>
    </div>
  );
};

export default LoadingOverlay;