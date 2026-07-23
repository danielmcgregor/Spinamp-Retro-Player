import React, { useState, useEffect, useRef } from 'react';
import { Volume2 } from 'lucide-react';

interface AndroidShellProps {
  children: React.ReactNode;
  onLaunchSpinamp?: () => void;
  appName?: string;
  isLandscape?: boolean;
  onToggleOrientation?: () => void;
  volume?: number;
  onVolumeChange?: (v: number) => void;
  skinColor?: string;
  onSkinColorChange?: (color: string) => void;
  appearance?: string;
  onChangeAppearance?: (app: any) => void;
}

export const AndroidShell: React.FC<AndroidShellProps> = ({
  children,
  isLandscape = false,
  onToggleOrientation,
  volume = 0.8,
  onVolumeChange,
  skinColor = 'classic-steel',
  onSkinColorChange,
  appearance,
  onChangeAppearance
}) => {
  const [showVolumeToast, setShowVolumeToast] = useState(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state volume HUD trigger
  useEffect(() => {
    setShowVolumeToast(true);

    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setShowVolumeToast(false);
    }, 1500);

    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [volume]);

  // Handle hotkeys (Shift + Up/Down for fine-tuning volume)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      const step = 0.05;
      if (e.key === 'ArrowUp' && e.shiftKey) {
        e.preventDefault();
        onVolumeChange?.(Math.min(1.0, volume + step));
      } else if (e.key === 'ArrowDown' && e.shiftKey) {
        e.preventDefault();
        onVolumeChange?.(Math.max(0.0, volume - step));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume, onVolumeChange]);

  const themeClass = {
    'classic-steel': 'theme-steel',
    'midnight-violet': 'theme-violet',
    'cobalt-blue': 'theme-cobalt',
    'toxic-spill': 'theme-toxic',
    'vespa-gold': 'theme-vespa',
    'crimson-ruby': 'theme-crimson',
    'walnut-hifi': 'theme-walnut',
    'neon-synth': 'theme-synth',
    'hazard-industrial': 'theme-hazard'
  }[skinColor] || '';

  return (
    <div id="player-wrapper" className={`w-full min-h-screen bg-black text-neutral-100 font-sans selection:bg-amber-500/30 select-none transition-all duration-500 ${themeClass} flex flex-col`}>
      {/* Volume notification Toast Overlay */}
      {showVolumeToast && (
        <div 
          id="volume-toast-overlay"
          className="fixed right-4 top-4 flex items-center gap-3 p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 shadow-2xl z-50 text-white transition-all duration-300 animate-fade-in"
        >
          <Volume2 className="w-4 h-4 text-amber-500" />
          <div className="flex flex-col">
            <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-400 leading-none mb-1">Volume</span>
            <span className="text-xs font-mono font-bold text-amber-500 leading-none">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Active app children - fully responsive & edge-to-edge */}
      <div id="active-applet-drawer" className="flex-1 flex flex-col relative min-h-screen w-full">
        {children}
      </div>
    </div>
  );
};
