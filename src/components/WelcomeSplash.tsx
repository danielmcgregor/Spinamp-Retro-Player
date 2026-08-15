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
      
      {/* Spinamp App Logo */}
      <div className="w-24 h-24 bg-neutral-900 border border-neutral-700 rounded-3xl flex items-center justify-center p-1 shadow-2xl mb-6 relative hover:scale-105 transition-transform duration-300 overflow-hidden">
        <img
          src="/spinamp_logo.jpg?v=2"
          alt="Spinamp App Icon"
          className="w-full h-full object-cover rounded-2xl"
          referrerPolicy="no-referrer"
        />
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
