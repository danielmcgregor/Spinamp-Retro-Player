import React from 'react';
import { Moon, X, Trash2 } from 'lucide-react';

interface SleepTimerModalProps {
  isOpen: boolean;
  sleepTimeLeft: number | null;
  manualMinutesInput: string;
  onClose: () => void;
  onStart: (minutes: number) => void;
  onDisable: () => void;
  onManualInputChange: (value: string) => void;
}

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({
  isOpen,
  sleepTimeLeft,
  manualMinutesInput,
  onClose,
  onStart,
  onDisable,
  onManualInputChange,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="absolute inset-0 bg-black/85 flex items-center justify-center p-4 z-[100] animate-[#25272b] transition-all backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-[260px] bg-[#17181c] border border-amber-500/30 rounded-2xl p-4 shadow-[0_10px_35px_rgba(0,0,0,0.85),0_0_12px_rgba(245,158,11,0.15)] text-neutral-200 font-sans cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-neutral-800/80 pb-2.5 mb-3.5">
          <div className="flex items-center gap-2">
            <Moon className="w-3.5 h-3.5 text-amber-500 animate-pulse fill-amber-500/10" />
            <span className="text-[10px] font-mono uppercase tracking-wider font-black text-amber-500">Sleep Configurator</span>
          </div>
          <button 
            onClick={onClose}
            className="text-neutral-500 hover:text-white p-1 hover:bg-neutral-800 rounded-md transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Time Left Display if active */}
        {sleepTimeLeft !== null && (
          <div className="bg-neutral-950 border border-neutral-900 rounded-xl p-2.5 text-center mb-3">
            <span className="text-[9px] text-neutral-500 font-mono tracking-wider block uppercase mb-1">Time Remaining</span>
            <span className="text-base font-mono text-emerald-400 font-bold tracking-widest animate-pulse">
              {Math.floor(sleepTimeLeft / 60)}m {String(sleepTimeLeft % 60).padStart(2, '0')}s
            </span>
            <button
              type="button"
              onClick={onDisable}
              className="mt-2 w-full h-6.5 bg-red-950/20 hover:bg-red-950/45 text-red-400 border border-red-900/40 font-mono text-[9px] font-bold rounded-md flex items-center justify-center gap-1 transition cursor-pointer"
            >
              <Trash2 className="w-2.5 h-2.5" />
              <span>DISABLE TIMER</span>
            </button>
          </div>
        )}

        {/* Manual Form Entry */}
        <form onSubmit={(e) => {
          e.preventDefault();
          const mins = parseInt(manualMinutesInput, 10);
          if (!isNaN(mins) && mins > 0) {
            onStart(mins);
          }
        }} className="space-y-3.5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sleep-timer-minutes-input" className="text-[9px] text-neutral-500 font-mono uppercase tracking-wider block">Duration (Minutes)</label>
            <div className="flex gap-2">
              <input
                id="sleep-timer-minutes-input"
                type="number"
                min="1"
                max="1440"
                required
                value={manualMinutesInput}
                onChange={(e) => onManualInputChange(e.target.value)}
                className="flex-1 w-full bg-black border border-neutral-800 rounded-lg px-2 py-1 text-center font-mono text-base font-bold text-amber-500 focus:outline-none focus:border-amber-500/60 shadow-inner"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[10px] uppercase rounded-lg tracking-wide transition duration-150 active:scale-95 cursor-pointer"
              >
                Start
              </button>
            </div>
          </div>

          {/* Presets Grid */}
          <div className="space-y-1.5">
            <span className="text-[9px] text-neutral-500 font-mono uppercase tracking-wider block">Presets</span>
            <div className="grid grid-cols-4 gap-1.5">
              {[15, 30, 45, 60].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onStart(preset)}
                  className="h-7 bg-neutral-900 hover:bg-[#25272b] border border-[#2f3136] rounded-md font-mono text-[10px] text-neutral-300 hover:text-white transition active:scale-95 cursor-pointer"
                >
                  {preset}m
                </button>
              ))}
            </div>
          </div>

          {/* Close Button line */}
          <div className="border-t border-neutral-800/60 pt-3 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full h-7 bg-[#25272b] hover:bg-[#2c2f33] border border-[#2f3136] rounded-md font-mono text-[9px] font-bold text-neutral-400 tracking-wider transition uppercase cursor-pointer"
            >
              Cancel
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
