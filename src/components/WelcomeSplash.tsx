import React from 'react';

interface WelcomeSplashProps {
  onPowerOn: () => void;
  onResetToDefaults: () => void;
}

export const WelcomeSplash: React.FC<WelcomeSplashProps> = ({
  onPowerOn,
  onResetToDefaults,
}) => {
  return (
    /* Welcome Splash Screen prior to turning on the virtual Spinamp app */
    <div id="welcome-splash" className="flex-1 flex flex-col justify-center items-center bg-[#090a0f] text-center p-6 select-none font-sans">
      
      {/* Neon Retro glowing logo - Stylized ball of lightning */}
      <div className="w-24 h-24 bg-neutral-900 border-2 border-amber-500 rounded-3xl flex items-center justify-center p-3 shadow-2xl mb-6 relative hover:scale-105 transition-transform duration-300">
        {/* Pulsing neon circular energy ball containing central lightning bolt */}
        <svg viewBox="0 0 100 100" className="w-16 h-16 drop-shadow-[0_0_10px_rgba(245,158,11,0.85)] animate-[spin_20s_linear_infinite]" id="lightning-ball-logo-welcome">
          {/* Glowing concentric containment rings */}
          <circle cx="50" cy="50" r="42" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 6" className="opacity-40 animate-pulse" />
          <circle cx="50" cy="50" r="35" fill="none" stroke="#fbbf24" strokeWidth="1.5" className="opacity-60" />
          <circle cx="50" cy="50" r="28" fill="none" stroke="#fef08a" strokeWidth="1" strokeDasharray="16 6" className="opacity-80" />
          
          {/* Inner glowing core electric path */}
          <path d="M52 18 L34 52 L54 52 L44 82 L68 44 L46 44 Z" fill="#f59e0b" />
          
          {/* High frequency crackling arcs */}
          <path d="M22 45 Q 36 47 50 50" fill="none" stroke="#ffffff" strokeWidth="1" className="opacity-70 animate-pulse" />
          <path d="M78 55 Q 64 53 50 50" fill="none" stroke="#ffffff" strokeWidth="1" className="opacity-70 animate-pulse" />
          <path d="M45 25 Q 48 38 50 50" fill="none" stroke="#fef08a" strokeWidth="0.8" className="opacity-60" />
          <path d="M55 75 Q 52 62 50 50" fill="none" stroke="#fef08a" strokeWidth="0.8" className="opacity-60" />
          
          <circle cx="50" cy="50" r="4" fill="#ffffff" />
        </svg>
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#00ff44] border-2 border-[#090a0f] rounded-full animate-pulse" title="System online" />
      </div>

      <h2 className="text-xl font-bold tracking-tight text-white mb-1.5 uppercase tracking-wide">
        Spinamp Mobile v666.5
      </h2>
      <p className="text-[11px] text-neutral-500 max-w-xs mb-8">
        Recreating the iconic media player experience, optimized with real Web Audio synthesizers, classic visualizer logic, and dual dynamic skin mapping.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-[200px]">
        <button
          id="splash-poweron-btn"
          onClick={onPowerOn}
          className="w-full border-2 border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white font-bold h-11 rounded-xl transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2 text-xs"
        >
          <span>POWER ON PLAYER</span>
        </button>
        <button
          id="splash-reset-btn"
          onClick={onResetToDefaults}
          className="w-full border border-neutral-800 hover:border-rose-500/50 bg-[#16171b] hover:bg-rose-500/10 text-neutral-400 hover:text-rose-400 text-[10px] font-semibold h-8 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
          title="Reset player to factory defaults"
        >
          <span>RESTORE FACTORY DEFAULTS</span>
        </button>
      </div>
    </div>
  );
};
