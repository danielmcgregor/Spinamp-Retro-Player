import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Moon, Clock, Trash2, X, Sparkles } from 'lucide-react';
import { Track, PlayerState, SkinType, VisualizerMode, ScreenAppearance, FontPreset } from './types';
import { defaultTracks } from './data/defaultTracks';
import { PALETTE_BANK } from './data/palettes';
import { spinampAudio, restoreEqFromStorage } from './utils/audioContext';
import { AndroidShell } from './components/AndroidShell';
import { BentoSkin } from './components/BentoSkin';
import { ClassicSkin } from './components/ClassicSkin';
import { FullScreenVisualizer } from './components/FullScreenVisualizer';
import { analyzeTrackBPM } from './utils/bpmDetector';
import { GimpColorPicker } from './components/GimpColorPicker';
import { readAudioMetadata } from './utils/metadataParser';
import { isAndroidWebView } from './utils/platformDetect';
import { SleepTimerModal } from './components/SleepTimerModal';
import { WelcomeSplash } from './components/WelcomeSplash';
import { CustomSkinModal } from './components/CustomSkinModal';
import { isAndroidFileBridgeAvailable, reopenFilesViaAndroidBridge } from './utils/androidFileBridge';

export default function App() {
  // Main state
  const [skin, setSkin] = useState<SkinType>(() => {
    return (localStorage.getItem('spinamp_skin_type') as SkinType) || 'bento';
  });
  const [skinColor, setSkinColor] = useState<string>(() => localStorage.getItem('spinamp_skin_color') || 'vespa-gold');
  const [screenAppearance, setScreenAppearance] = useState<ScreenAppearance>(() => {
    return (localStorage.getItem('spinamp_screen_appearance') as ScreenAppearance) || 'default';
  });
  const [screenFont, setScreenFont] = useState<FontPreset>(() => {
    return (localStorage.getItem('spinamp_screen_font') as FontPreset) || 'mono';
  });

  // Custom retro skin customization state
  const [customSkin, setCustomSkin] = useState(() => {
    try {
      const saved = localStorage.getItem('spinamp_custom_skin');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          texture: 'none',
          glow: 'subtle',
          bezel: 'bento',
          ...parsed
        };
      }
      return {
        name: 'My Custom Skin',
        bg: '#12131c',
        bgAlt: '#1a1b26',
        panel: '#0d0d14',
        border: '#ff9000',
        accent: '#ff9000',
        text: '#ff9000',
        texture: 'none',
        glow: 'subtle',
        bezel: 'bento'
      };
    } catch {
      return {
        name: 'My Custom Skin',
        bg: '#12131c',
        bgAlt: '#1a1b26',
        panel: '#0d0d14',
        border: '#ff9000',
        accent: '#ff9000',
        text: '#ff9000',
        texture: 'none',
        glow: 'subtle',
        bezel: 'bento'
      };
    }
  });
  const [isCustomSkinModalOpen, setIsCustomSkinModalOpen] = useState(false);
  const [oldColors, setOldColors] = useState<{ bg: string; panel: string; accent: string; border: string; text: string } | null>(null);

  const handleOpenCustomSkinCreator = useCallback(() => {
    setOldColors({
      bg: customSkinRef.current.bg,
      panel: customSkinRef.current.panel,
      accent: customSkinRef.current.accent,
      border: customSkinRef.current.border,
      text: customSkinRef.current.text
    });
    setIsCustomSkinModalOpen(true);
  }, []);

  const handleRandomSkin = useCallback(() => {
    const randPalette = PALETTE_BANK[Math.floor(Math.random() * PALETTE_BANK.length)];
    const textures = ['none', 'brushed', 'carbon', 'scanlines', 'hexagrid'];
    const glows = ['off', 'subtle', 'vibrant'];
    const bezels = ['retro', 'bento', 'modern'];
    
    const randomTexture = textures[Math.floor(Math.random() * textures.length)];
    const randomGlow = glows[Math.floor(Math.random() * glows.length)];
    const randomBezel = bezels[Math.floor(Math.random() * bezels.length)];

    const sciFiBrandPrefixes = ['Xenon', 'Pulse', 'Cipher', 'Flux', 'Aero', 'Prism', 'Apex', 'Vector', 'Nexus', 'Volt', 'Cosmo', 'Hyper', 'Sonic'];
    const sciFiBrandSuffixes = ['Deck', 'Core', 'Vibe', 'Hi-Fi', 'Unit', 'Terminal', 'Module', 'Chassis', 'Grid', 'Rack', 'Synth'];
    const randPrefix = sciFiBrandPrefixes[Math.floor(Math.random() * sciFiBrandPrefixes.length)];
    const randSuffix = sciFiBrandSuffixes[Math.floor(Math.random() * sciFiBrandSuffixes.length)];
    const generatedName = `${randPrefix} ${randSuffix} 🧪`;

    setCustomSkin({
      name: generatedName,
      bg: randPalette.bg,
      bgAlt: randPalette.bg,
      panel: randPalette.panel,
      border: randPalette.border,
      accent: randPalette.accent,
      text: randPalette.text,
      texture: randomTexture,
      glow: randomGlow,
      bezel: randomBezel
    });
  }, []);

  // Sync screen presets to local storage
  useEffect(() => {
    localStorage.setItem('spinamp_screen_appearance', screenAppearance);
    
    // Auto-harmonize the visualizer color theme when screen effects are switched
    if (screenAppearance === 'lcd' || screenAppearance === 'e-ink') {
      setVisTheme('mono');
    } else if (screenAppearance === 'cyberpunk') {
      setVisTheme('cyberpunk');
    } else if (screenAppearance === 'oled') {
      setVisTheme('aqua');
    } else if (screenAppearance === 'default') {
      setVisTheme('amber');
    }
  }, [screenAppearance]);

  useEffect(() => {
    localStorage.setItem('spinamp_screen_font', screenFont);
  }, [screenFont]);

  const [tracks, setTracks] = useState<Track[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spinamp_playlist_meta');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Track[];
          if (parsed && parsed.length > 0) {
            return parsed;
          }
        } catch (e) {
          console.error("Error parsing spinamp_playlist_meta", e);
        }
      }
    }
    return defaultTracks;
  });
  const [currentTrack, setCurrentTrack] = useState<Track | null>(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('spinamp_last_track_id');
      if (savedId) {
        const savedMeta = localStorage.getItem('spinamp_playlist_meta');
        let allTracks = defaultTracks;
        if (savedMeta) {
          try {
            const parsed = JSON.parse(savedMeta) as Track[];
            if (parsed && parsed.length > 0) {
              allTracks = parsed;
            }
          } catch (e) {}
        }
        const found = allTracks.find((t) => t.id === savedId);
        if (found) return found;
      }
    }
    return defaultTracks[0] || null;
  });
  const [reimportTrackId, setReimportTrackId] = useState<string | null>(null);
  const reimportInputRef = useRef<HTMLInputElement>(null);
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>(() => {
    return (localStorage.getItem('spinamp_vis_mode') as VisualizerMode) || 'spectrum';
  });
  const [visTheme, setVisTheme] = useState<string>(() => localStorage.getItem('spinamp_vis_theme') || 'neon');
  const [visSensitivity, setVisSensitivity] = useState<number>(() => parseFloat(localStorage.getItem('spinamp_vis_sensitivity') || '1.2'));
  const [playHistory, setPlayHistory] = useState<string[]>([]);
  const [isPowerOn, setIsPowerOn] = useState(true);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isFullscreenVisualizer, setIsFullscreenVisualizer] = useState(false);
  const [timeDisplayMode, setTimeDisplayMode] = useState<'elapsed' | 'remaining'>(() => {
    return (localStorage.getItem('spinamp_time_display_mode') as 'elapsed' | 'remaining') || 'elapsed';
  });


  // BPM Detection State Database
  const [bpmDatabase, setBpmDatabase] = useState<Record<string, number>>({});
  const bpmDatabaseRef = useRef<Record<string, number>>(bpmDatabase);
  useEffect(() => {
    bpmDatabaseRef.current = bpmDatabase;
  }, [bpmDatabase]);
  const [isBpmDetecting, setIsBpmDetecting] = useState<boolean>(false);

  // Loading Files State
  const [loadingFilesMessage, setLoadingFilesMessage] = useState<string | null>(null);

  // Sync state changes to localStorage
  useEffect(() => {
    localStorage.setItem('spinamp_skin_type', skin);
  }, [skin]);

  useEffect(() => {
    localStorage.setItem('spinamp_vis_mode', visualizerMode);
  }, [visualizerMode]);

  useEffect(() => {
    localStorage.setItem('spinamp_time_display_mode', timeDisplayMode);
  }, [timeDisplayMode]);

  const currentTrackRef = useRef<Track | null>(null);
  useEffect(() => {
    currentTrackRef.current = currentTrack;
    if (currentTrack) {
      localStorage.setItem('spinamp_last_track_id', currentTrack.id);
    }
  }, [currentTrack]);

  const tracksRef = useRef<Track[]>(tracks);
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  const isPowerOnRef = useRef<boolean>(isPowerOn);
  useEffect(() => {
    isPowerOnRef.current = isPowerOn;
  }, [isPowerOn]);

  const customSkinRef = useRef(customSkin);
  useEffect(() => {
    customSkinRef.current = customSkin;
  }, [customSkin]);

  const skinColorRef = useRef<string>(skinColor);
  useEffect(() => {
    skinColorRef.current = skinColor;
  }, [skinColor]);



  const playlistSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Cancel any pending save
    if (playlistSaveTimerRef.current) {
      clearTimeout(playlistSaveTimerRef.current);
    }
    
    // Schedule save after 800ms of inactivity
    playlistSaveTimerRef.current = setTimeout(() => {
      const persistableTracks = tracksRef.current.map(({ file, ...rest }) => rest);
      localStorage.setItem('spinamp_playlist_meta', JSON.stringify(persistableTracks));
      playlistSaveTimerRef.current = null;
    }, 800);
    
    return () => {
      if (playlistSaveTimerRef.current) {
        clearTimeout(playlistSaveTimerRef.current);
      }
    };
  }, [tracks]);

  const handleSkinColorChange = useCallback((newColor: string) => {
    setSkinColor(newColor);
    localStorage.setItem('spinamp_skin_color', newColor);
    
    // Auto-harmonize the screen effect based on selected color skin
    if (newColor === 'classic-steel') {
      setScreenAppearance('default');
    } else if (newColor === 'midnight-violet') {
      setScreenAppearance('default');
    } else if (newColor === 'cobalt-blue') {
      setScreenAppearance('oled');
    } else if (newColor === 'toxic-spill') {
      setScreenAppearance('lcd');
    } else if (newColor === 'vespa-gold') {
      setScreenAppearance('default');
    } else if (newColor === 'crimson-ruby') {
      setScreenAppearance('default');
    } else if (newColor === 'walnut-hifi') {
      setScreenAppearance('default');
    } else if (newColor === 'neon-synth') {
      setScreenAppearance('cyberpunk');
    } else if (newColor === 'hazard-industrial') {
      setScreenAppearance('default');
    }
    
    // Auto-sync visualizer theme color for cohesive aesthetic cohesion
    const mapping: Record<string, string> = {
      'classic-steel': 'neon',
      'midnight-violet': 'custom',
      'cobalt-blue': 'aqua',
      'toxic-spill': 'mono',
      'vespa-gold': 'amber',
      'crimson-ruby': 'crimson',
      'walnut-hifi': 'amber',
      'neon-synth': 'cyberpunk',
      'hazard-industrial': 'amber'
    };
    const correspondingVisTheme = mapping[newColor];
    if (correspondingVisTheme) {
      setVisTheme(correspondingVisTheme);
      localStorage.setItem('spinamp_vis_theme', correspondingVisTheme);
    }
  }, []);

  const handleScreenAppearanceChange = useCallback((newAppearance: ScreenAppearance) => {
    setScreenAppearance(newAppearance);

    // Auto-harmonize the color skin based on selected screen effect
    if (newAppearance === 'lcd') {
      if (skinColorRef.current !== 'toxic-spill') {
        setSkinColor('toxic-spill');
        localStorage.setItem('spinamp_skin_color', 'toxic-spill');
      }
    } else if (newAppearance === 'oled') {
      if (skinColorRef.current !== 'cobalt-blue') {
        setSkinColor('cobalt-blue');
        localStorage.setItem('spinamp_skin_color', 'cobalt-blue');
      }
    } else if (newAppearance === 'e-ink') {
      if (skinColorRef.current !== 'classic-steel' && skinColorRef.current !== 'vespa-gold') {
        setSkinColor('classic-steel');
        localStorage.setItem('spinamp_skin_color', 'classic-steel');
      }
    } else if (newAppearance === 'cyberpunk') {
      if (skinColorRef.current !== 'midnight-violet') {
        setSkinColor('midnight-violet');
        localStorage.setItem('spinamp_skin_color', 'midnight-violet');
      }
    } else if (newAppearance === 'default') {
      if (skinColorRef.current !== 'vespa-gold') {
        setSkinColor('vespa-gold');
        localStorage.setItem('spinamp_skin_color', 'vespa-gold');
      }
    }
  }, []);



  const handleToggleTimeDisplayMode = useCallback(() => {
    setTimeDisplayMode((prev) => (prev === 'elapsed' ? 'remaining' : 'elapsed'));
  }, []);

  // Listen to physical client orientation too if they rotate physical devices
  useEffect(() => {
    const mediaQuery = window.matchMedia('(orientation: landscape)');
    const handleQuery = (e: MediaQueryListEvent | MediaQueryList) => {
      // Only default if on a real mobile device viewport, or set initially
      if (window.innerWidth < 768) {
        setIsLandscape(e.matches);
      }
    };
    handleQuery(mediaQuery);
    mediaQuery.addEventListener('change', handleQuery);
    return () => mediaQuery.removeEventListener('change', handleQuery);
  }, []);

  const handleToggleOrientation = useCallback(() => {
    setIsLandscape((prev) => !prev);
  }, []);

  // Sleep Timer State and Popup Controller
  const [sleepTimeLeft, setSleepTimeLeft] = useState<number | null>(null);
  const sleepTimerActiveRef = useRef(false);
  const [isSleepModalOpen, setIsSleepModalOpen] = useState(false);
  const [manualMinutesInput, setManualMinutesInput] = useState('30');

  const handleToggleSleepTimer = useCallback(() => {
    if (!isPowerOnRef.current) return;
    setIsSleepModalOpen(true);
  }, []);

  // Sync player state directly from audio engine
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.3,
    isMuted: false,
    shuffle: false,
    repeat: 'none',
  });

  // Keep player state and handlers in refs to bypass React's closure stale states
  const playerStateRef = useRef(playerState);
  useEffect(() => {
    playerStateRef.current = playerState;
  }, [playerState]);

  const handlePrevTrackRef = useRef<() => void>(() => {});
  const handleNextTrackRef = useRef<() => void>(() => {});
  const handlePlayRef = useRef<() => void>(() => {});
  const handlePauseRef = useRef<() => void>(() => {});
  const handleStopRef = useRef<() => void>(() => {});
  const handleVolumeChangeRef = useRef<(volume: number) => void>(() => {});
  const isReopeningFilesRef = useRef(false);
  const pendingPlayAfterReopenRef = useRef(false);

  // 1. Initial hydration and setup
  useEffect(() => {
    restoreEqFromStorage();
    // Sync skin switcher event from Android Shell navigation bar
    const handleSkinEvent = () => {
      setSkin((prev) => (prev === 'bento' ? 'classic' : 'bento'));
    };
    window.addEventListener('spinamp_skin_transition', handleSkinEvent);

    const handleBeforeUnload = () => {
      if (playlistSaveTimerRef.current) {
        clearTimeout(playlistSaveTimerRef.current);
        const persistableTracks = tracksRef.current.map(({ file, ...rest }) => rest);
        localStorage.setItem('spinamp_playlist_meta', JSON.stringify(persistableTracks));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Sync state from spinampAudio engine
    const unsubscribeState = spinampAudio.subscribeState((nextState) => {
      setPlayerState(nextState);
    });

    // Hydrate tracks ratings and counts from localStorage
    const cachedStats = localStorage.getItem('spinamp_retro_stats');
    if (cachedStats) {
      try {
        const parsed = JSON.parse(cachedStats);
        setTracks((prev) =>
          prev.map((t) => {
            if (parsed[t.id]) {
              return {
                ...t,
                rating: parsed[t.id].rating ?? t.rating,
                playCount: parsed[t.id].playCount ?? t.playCount,
              };
            }
            return t;
          })
        );
      } catch (e) {
        console.warn('Could not parse cached stats', e);
      }
    }

    // Set initial track to audio engine initially (don't play yet)
    const savedTrackId = localStorage.getItem('spinamp_last_track_id');
    const savedMeta = localStorage.getItem('spinamp_playlist_meta');
    let allTracks = defaultTracks;
    if (savedMeta) {
      try {
        const parsed = JSON.parse(savedMeta) as Track[];
        if (parsed && parsed.length > 0) {
          allTracks = parsed;
        }
      } catch (e) {}
    }
    const initialTrack = savedTrackId ? (allTracks.find(t => t.id === savedTrackId) || allTracks[0]) : allTracks[0];
    if (initialTrack) {
      spinampAudio.setTrack(initialTrack);
    }

    // Subscribe to track ended event to handle auto-advance
    const unsubscribeEnded = spinampAudio.subscribeTrackEnded(() => {
      handleNextTrackRef.current();
    });

    // Subscribe to previoustrack and nexttrack events from Media Session / wired remotes
    const unsubscribePrev = spinampAudio.subscribePrevTrack(() => {
      handlePrevTrackRef.current();
    });
    const unsubscribeNext = spinampAudio.subscribeNextTrack(() => {
      handleNextTrackRef.current();
    });

    // Subscribe to duration change / loadedmetadata to update current track duration in track state
    const unsubscribeDuration = spinampAudio.subscribeDurationDetected((realDuration) => {
      const activeTrack = currentTrackRef.current;
      if (activeTrack && realDuration > 0 && Number.isFinite(realDuration)) {
        setTracks((prev) =>
          prev.map((t) => (t.id === activeTrack.id ? { ...t, duration: realDuration } : t))
        );
      }
      spinampAudio.refreshMediaSessionMetadata();
    });

    return () => {
      window.removeEventListener('spinamp_skin_transition', handleSkinEvent);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unsubscribeState();
      unsubscribeEnded();
      unsubscribePrev();
      unsubscribeNext();
      unsubscribeDuration();

      if (typeof (spinampAudio as any).cleanup === 'function') {
        (spinampAudio as any).cleanup();
      }

      tracksRef.current.forEach((track) => {
        if (track.coverUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(track.coverUrl);
        }
      });
    };
  }, []);

  // Automatic re-linking of Android files via the bridge on startup
  useEffect(() => {
    
    if (!isAndroidFileBridgeAvailable()) {
      return;
    }

    const tracksNeedingReopen = tracksRef.current.filter(
      (t) => !t.file && t.androidUri
    );
    
    if (tracksNeedingReopen.length === 0) {
      return;
    }

    isReopeningFilesRef.current = true;
    setLoadingFilesMessage(`Reconnecting ${tracksNeedingReopen.length} file${tracksNeedingReopen.length > 1 ? 's' : ''}...`);

    const uris = tracksNeedingReopen.map((t) => t.androidUri!);

    reopenFilesViaAndroidBridge(uris).then(({ reopened, failedUris }) => {

      // Build a lookup from originalUri -> reopened File
      const fileByUri = new Map(reopened.map((r) => [r.originalUri, r.file]));

      if (reopened.length > 0) {
        setTracks((prev) =>
          prev.map((t) => {
            const reopenedFile = t.androidUri ? fileByUri.get(t.androidUri) : undefined;
            return reopenedFile ? { ...t, file: reopenedFile } : t;
          })
        );

        // Refresh currentTrack if it's one of the tracks that just got its file reopened
        setCurrentTrack((prev) => {
          if (!prev || !prev.androidUri) return prev;
          const reopenedFile = fileByUri.get(prev.androidUri);
          if (reopenedFile) {
            const updatedTrack = { ...prev, file: reopenedFile };
            spinampAudio.setTrack(updatedTrack);
            return updatedTrack;
          }
          return prev;
        });
      }

      isReopeningFilesRef.current = false;
      if (pendingPlayAfterReopenRef.current) {
        pendingPlayAfterReopenRef.current = false;
        setTimeout(() => {
          handlePlayRef.current();
        }, 50);
      }

      if (reopened.length > 0 || failedUris.length > 0) {
        const parts = [];
        if (reopened.length > 0) parts.push(`${reopened.length} reconnected`);
        if (failedUris.length > 0) parts.push(`${failedUris.length} need re-import`);
        setLoadingFilesMessage(parts.join(', '));
        setTimeout(() => setLoadingFilesMessage(null), 3000);
      } else {
        setLoadingFilesMessage(null);
      }

      // failedUris tracks remain with file: undefined and keep showing the 
      // existing "File not loaded" + RE-IMPORT UI — no change needed there, 
      // that fallback already works correctly.
    });
  }, []);

  // Listen for native media actions forwarded via CustomEvents
  useEffect(() => {
    const handleNativeNext = () => handleNextTrackRef.current();
    const handleNativePrev = () => handlePrevTrackRef.current();
    window.addEventListener('spinamp-native-next-track', handleNativeNext);
    window.addEventListener('spinamp-native-prev-track', handleNativePrev);
    return () => {
      window.removeEventListener('spinamp-native-next-track', handleNativeNext);
      window.removeEventListener('spinamp-native-prev-track', handleNativePrev);
    };
  }, []);

  // Retro Spinamp Global Keyboard Shortcuts (Z=Prev, X=Play, C=Pause, V=Stop, B=Next, Space=Play/Pause Toggle, Arrows=Volume)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in form fields to prevent breaking searches or ratings
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl) {
        const tagName = activeEl.tagName.toUpperCase();
        if (
          tagName === 'INPUT' ||
          tagName === 'TEXTAREA' ||
          tagName === 'SELECT' ||
          activeEl.isContentEditable
        ) {
          return;
        }
      }

      const key = e.key.toLowerCase();
      switch (key) {
        case 'z': // Previous track
          e.preventDefault();
          handlePrevTrackRef.current();
          break;
        case 'x': // Play
          e.preventDefault();
          handlePlayRef.current();
          break;
        case 'c': // Pause
          e.preventDefault();
          handlePauseRef.current();
          break;
        case 'v': // Stop
          e.preventDefault();
          handleStopRef.current();
          break;
        case 'b': // Next Track
          e.preventDefault();
          handleNextTrackRef.current();
          break;
        case ' ': // Space to toggle play/pause
          e.preventDefault();
          if (playerStateRef.current.isPlaying) {
            handlePauseRef.current();
          } else {
            handlePlayRef.current();
          }
          break;
        case 'audiovolumeup':
        case 'arrowup': // Volume Up (5% increment)
          e.preventDefault();
          handleVolumeChangeRef.current(Math.min(1.0, playerStateRef.current.volume + 0.05));
          break;
        case 'audiovolumedown':
        case 'arrowdown': // Volume Down (5% decrement)
          e.preventDefault();
          handleVolumeChangeRef.current(Math.max(0.0, playerStateRef.current.volume - 0.05));
          break;
        case 'audiovolumemute':
          e.preventDefault();
          spinampAudio.setMute(!playerStateRef.current.isMuted);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Sync active visualizer mode to the audio engine for specific transitions
  useEffect(() => {
    spinampAudio.setVisualizerMode(visualizerMode);
  }, [visualizerMode]);

  // Audio analysis BPM identification effect
  const currentTrackId = currentTrack?.id ?? null;
  useEffect(() => {
    if (!currentTrackId || !isPowerOn) {
      setIsBpmDetecting(false);
      return;
    }
    
    if (bpmDatabaseRef.current[currentTrackId]) return; // BPM is already cached

    // Use currentTrackRef.current inside the async operation instead of currentTrack
    const trackForAnalysis = currentTrackRef.current;
    if (!trackForAnalysis || trackForAnalysis.id !== currentTrackId) return;

    setIsBpmDetecting(true);
    let isCancelled = false;

    // Small delay so the UI shows "DETECTOR..." or "DET..." state during the analysis sequence
    const timerId = setTimeout(async () => {
      try {
        const detected = await analyzeTrackBPM(trackForAnalysis, spinampAudio.getAnalyser()?.context);
        if (!isCancelled) {
          setBpmDatabase((prev) => ({ ...prev, [currentTrackId]: detected }));
        }
      } catch (err) {
        console.warn('Real BPM detection failed, applying fallback:', err);
      } finally {
        if (!isCancelled) {
          setIsBpmDetecting(false);
        }
      }
    }, 900);

    return () => {
      isCancelled = true;
      clearTimeout(timerId);
      setIsBpmDetecting(false);
    };
  }, [currentTrackId, isPowerOn]);

  // Sleep Timer interval countdown ticker (decrements every 1s and stops playback at 0)
  useEffect(() => {
    // Only start a NEW interval when the timer transitions from inactive to active
    const isActive = sleepTimeLeft !== null;
    
    if (isActive && !sleepTimerActiveRef.current) {
      sleepTimerActiveRef.current = true;
      
      const intervalId = setInterval(() => {
        setSleepTimeLeft((prev) => {
          if (prev === null || prev <= 1) {
            handleStop();
            sleepTimerActiveRef.current = false;
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => {
        clearInterval(intervalId);
        sleepTimerActiveRef.current = false;
      };
    }
    
    if (!isActive) {
      sleepTimerActiveRef.current = false;
    }
  }, [sleepTimeLeft === null]);

  // Save ratings and play counts locally
  const saveStatsToStorage = useCallback((updatedTracks: Track[]) => {
    const stats: Record<string, { rating: number; playCount: number }> = {};
    updatedTracks.forEach((t) => {
      stats[t.id] = { rating: t.rating, playCount: t.playCount };
    });
    localStorage.setItem('spinamp_retro_stats', JSON.stringify(stats));
  }, []);

  // --- AUDIO ACTIONS ---

  const handleReimportTrack = useCallback((trackId: string) => {
    setReimportTrackId(trackId);
    setTimeout(() => {
      reimportInputRef.current?.click();
    }, 10);
  }, []);

  const handlePlay = useCallback(() => {
    const activeTrack = currentTrackRef.current;
    
    const activePlayerState = playerStateRef.current;

    if (activeTrack && activeTrack.id.startsWith('local_') && !activeTrack.file) {
      if (isReopeningFilesRef.current) {
        pendingPlayAfterReopenRef.current = true;
        return;
      }
      handleReimportTrack(activeTrack.id);
      return;
    }

    if (!isPowerOnRef.current) {
      setIsPowerOn(true);
    }
    // Increment play count upon playback start
    if (activeTrack && !activePlayerState.isPlaying) {
      setTracks((prev) => {
        const next = prev.map((t) =>
          t.id === activeTrack.id ? { ...t, playCount: t.playCount + 1 } : t
        );
        saveStatsToStorage(next);
        return next;
      });

      // Add to playlist played history list
      setPlayHistory((prev) => {
        const next = [activeTrack.id, ...prev.filter((id) => id !== activeTrack.id)];
        return next.slice(0, 50); // limit 50 entries
      });
    }

    if (activeTrack) {
      spinampAudio.setTrack(activeTrack);
    }

    spinampAudio.play();
  }, [saveStatsToStorage, handleReimportTrack]);

  const handlePause = useCallback(() => {
    spinampAudio.pause();
  }, []);

  const handleStop = useCallback(() => {
    spinampAudio.stop();
  }, []);

  const handleSeek = useCallback((seconds: number) => {
    spinampAudio.seek(seconds);
  }, []);

  const handleVolumeChange = useCallback((volume: number) => {
    spinampAudio.setVolume(volume);
  }, []);

  const handleMuteToggle = useCallback(() => {
    spinampAudio.setMute(!playerStateRef.current.isMuted);
  }, []);

  const handleShuffleToggle = useCallback(() => {
    spinampAudio.setShuffle(!playerStateRef.current.shuffle);
  }, []);

  const handleRepeatToggle = useCallback(() => {
    const modes: ('none' | 'all' | 'one')[] = ['none', 'all', 'one'];
    const nextIdx = (modes.indexOf(playerStateRef.current.repeat) + 1) % modes.length;
    spinampAudio.setRepeat(modes[nextIdx]!);
  }, []);

  const handleSelectTrack = useCallback((track: Track) => {
    setCurrentTrack(track);
    spinampAudio.setTrack(track);
    
    // Auto start play only if loaded
    const isNotLoaded = track.id.startsWith('local_') && !track.file;
    if (!isNotLoaded) {
      setTimeout(() => {
        handlePlayRef.current();
      }, 100);
    }
  }, []);

  const handlePrevTrack = useCallback(() => {
    const currentTracks = tracksRef.current;
    const activeTrack = currentTrackRef.current;
    if (currentTracks.length === 0) return;
    let nextIdx = 0;
    if (activeTrack) {
      const idx = currentTracks.findIndex((t) => t.id === activeTrack.id);
      nextIdx = idx - 1 < 0 ? currentTracks.length - 1 : idx - 1;
    }
    handleSelectTrack(currentTracks[nextIdx]!);
  }, [handleSelectTrack]);

  const handleNextTrack = useCallback(() => {
    const currentTracks = tracksRef.current;
    const activeTrack = currentTrackRef.current;
    const activePlayerState = playerStateRef.current;

    if (currentTracks.length === 0) return;
    
    // If repeat is 'one' OR if we only have 1 track and repeat is 'all', keep playing current
    if ((activePlayerState.repeat === 'one' || (activePlayerState.repeat === 'all' && currentTracks.length === 1)) && activeTrack) {
      spinampAudio.seek(0);
      spinampAudio.play();
      return;
    }

    let nextIdx = 0;
    if (activePlayerState.shuffle) {
      nextIdx = Math.floor(Math.random() * currentTracks.length);
    } else if (activeTrack) {
      const idx = currentTracks.findIndex((t) => t.id === activeTrack.id);
      nextIdx = (idx + 1) % currentTracks.length;
      
      // If none repeat and we hit end of list, stop playback
      if (idx === currentTracks.length - 1 && activePlayerState.repeat === 'none') {
        handleStopRef.current();
        return;
      }
    }
    handleSelectTrack(currentTracks[nextIdx]!);
  }, [handleSelectTrack]);
  handlePrevTrackRef.current = handlePrevTrack;
  handleNextTrackRef.current = handleNextTrack;
  handlePlayRef.current = handlePlay;
  handlePauseRef.current = handlePause;
  handleStopRef.current = handleStop;
  handleVolumeChangeRef.current = handleVolumeChange;

  // --- PLAYLIST MODIFICATIONS ---

  const handleAddFiles = useCallback(async (files: FileList | File[]) => {
    const currentTracks = tracksRef.current;
    const activeTrack = currentTrackRef.current;

    // Filter to only include audio files
    const audioFiles = Array.from(files).filter((file) => {
      if (!file) return false;
      const isAudioMime = file.type && (file.type.startsWith("audio/") || file.type.startsWith("video/ogg") || file.type.startsWith("video/webm"));
      const hasAudioExtension = /\.(mp3|wav|wave|ogg|m4a|flac|aac|opus|webm|weba|wma|aiff|aif|caf|amr|mid|midi|ac3|mpga|mp2|mp4|m4b|m4p|m4r|ape|wv|mpc|ra|rm|dsf|dff)$/i.test(file.name);
      return isAudioMime || hasAudioExtension;
    });

    if (audioFiles.length === 0) return;

    // Filter out files that already exist in the playlist (same name + size)
    const existingFileSignatures = new Set(
      currentTracks
        .filter((t) => t.file)
        .map((t) => `${t.file!.name}:${t.file!.size}`)
    );

    const newFiles = audioFiles.filter((file) => {
      const signature = `${file.name}:${file.size}`;
      return !existingFileSignatures.has(signature);
    });

    const skippedCount = audioFiles.length - newFiles.length;

    if (newFiles.length === 0) {
      if (skippedCount > 0) {
        setLoadingFilesMessage(`Skipped ${skippedCount} duplicate file${skippedCount > 1 ? 's' : ''}`);
        setTimeout(() => setLoadingFilesMessage(null), 2500);
      }
      return;
    }

    const totalCount = newFiles.length;
    if (totalCount > 5) {
      setLoadingFilesMessage(`Found ${totalCount} audio files, importing...`);
      await new Promise(resolve => setTimeout(resolve, 300)); // brief pause so the message is visible before per-file updates begin
    }

    const newTracksList: Track[] = [...currentTracks];
    const initialLength = currentTracks.length;

    const CONCURRENCY = 4;
    const results: (any | null)[] = new Array(newFiles.length).fill(null);
    
    // Process in batches of CONCURRENCY
    for (let i = 0; i < newFiles.length; i += CONCURRENCY) {
      const batch = newFiles.slice(i, i + CONCURRENCY);
      setLoadingFilesMessage(`Processing ${i + 1}–${Math.min(i + CONCURRENCY, newFiles.length)} of ${newFiles.length}...`);
      
      const batchResults = await Promise.allSettled(
        batch.map(file => readAudioMetadata(file))
      );
      
      batchResults.forEach((result, idx) => {
        results[i + idx] = result.status === 'fulfilled' ? result.value : null;
      });
    }

    // Now build the newTracksList from the results array
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i]!;
      const metadata = results[i];
      if (!metadata) continue; // Skip failed/null metadata parses

      try {
        // Match existing local tracks that are not loaded
        const matchingIdx = newTracksList.findIndex(
          (t) =>
              t.id.startsWith('local_') &&
              t.file === undefined &&
              (t.title === file.name ||
                t.title === file.name.replace(/\.[^/.]+$/, "") ||
                t.title === metadata.title)
        );

        if (matchingIdx !== -1) {
          // Re-link the file in-place
          newTracksList[matchingIdx] = {
            ...newTracksList[matchingIdx]!,
            file: file,
            androidUri: (file as any).androidUri || newTracksList[matchingIdx]!.androidUri,
            duration: metadata.duration,
            coverUrl: metadata.coverUrl || newTracksList[matchingIdx]!.coverUrl
          };
          
          // Sync currentTrack if it is the restored track
          if (activeTrack?.id === newTracksList[matchingIdx]!.id) {
            const restored = newTracksList[matchingIdx]!;
            setCurrentTrack(restored);
            spinampAudio.setTrack(restored);
          }
        } else {
          const uniqueRandom = Math.random().toString(36).slice(2, 9) || Math.floor(Math.random() * 100000).toString();
          const t: Track = {
            id: `local_${Date.now()}_${i}_${uniqueRandom}`,
            title: metadata.title,
            artist: metadata.artist,
            album: metadata.album,
            duration: metadata.duration,
            file: file,
            androidUri: (file as any).androidUri,
            playCount: 0,
            rating: 3,
            genre: 'User Upload',
            coverUrl: metadata.coverUrl
          };
          newTracksList.push(t);
        }
      } catch (err) {
        console.error("Error reading audio metadata: ", err);
      }
    }

    setLoadingFilesMessage(null);
    setTracks(newTracksList);
    saveStatsToStorage(newTracksList);

    if (skippedCount > 0) {
      setLoadingFilesMessage(`Skipped ${skippedCount} duplicate file${skippedCount > 1 ? 's' : ''}`);
      setTimeout(() => setLoadingFilesMessage(null), 2500);
    }

    // If no song is loaded yet, select first uploaded track from the batch loaded
    if (newTracksList.length > 0 && !activeTrack) {
      const fallbackTrack = newTracksList[initialLength] || newTracksList[0];
      if (fallbackTrack) {
        handleSelectTrack(fallbackTrack);
      }
    }
  }, []);

  const handleAddFilesRef = useRef(handleAddFiles);
  useEffect(() => {
    handleAddFilesRef.current = handleAddFiles;
  }, [handleAddFiles]);

  const handleReimportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !reimportTrackId) return;
    
    const file = files[0]!;
    setLoadingFilesMessage(`Re-linking file: ${file.name}`);
    try {
      const metadata = await readAudioMetadata(file);
      
      setTracks((prev) => {
        const updated = prev.map((t) => {
          if (t.id === reimportTrackId) {
            if (t.coverUrl?.startsWith('blob:') && t.coverUrl !== metadata.coverUrl) {
              URL.revokeObjectURL(t.coverUrl);
            }
            return {
              ...t,
              file: file,
              androidUri: (file as any).androidUri || t.androidUri,
              duration: metadata.duration,
              coverUrl: metadata.coverUrl || t.coverUrl,
            };
          }
          return t;
        });

        const updatedTrack = updated.find((t) => t.id === reimportTrackId);
        if (updatedTrack && currentTrackRef.current?.id === reimportTrackId) {
          setCurrentTrack(updatedTrack);
          spinampAudio.setTrack(updatedTrack);
        }

        return updated;
      });
    } catch (err) {
      console.error("Error reading re-imported file: ", err);
      setTracks((prev) => {
        const updated = prev.map((t) => {
          if (t.id === reimportTrackId) {
            return {
              ...t,
              file: file,
              androidUri: (file as any).androidUri || t.androidUri,
            };
          }
          return t;
        });

        const updatedTrack = updated.find((t) => t.id === reimportTrackId);
        if (updatedTrack && currentTrackRef.current?.id === reimportTrackId) {
          setCurrentTrack(updatedTrack);
          spinampAudio.setTrack(updatedTrack);
        }

        return updated;
      });
    } finally {
      setLoadingFilesMessage(null);
    }
    
    setReimportTrackId(null);
    if (reimportInputRef.current) reimportInputRef.current.value = '';
  };

  const getReimportAccept = () => {
    if (!reimportTrackId) return "audio/*";
    const track = tracks.find((t) => t.id === reimportTrackId);
    if (!track) return "audio/*";
    const match = track.title.match(/\.([a-zA-Z0-9]+)$/);
    if (match && match[0]) {
      return match[0].toLowerCase();
    }
    return "audio/*";
  };

  // File System Access API fallback handler
  const handleFileSystemAccessPick = async (type: 'file' | 'folder') => {
    if (isAndroidWebView()) {
      /* skip, use regular input instead */
      return;
    }
    try {
      if (type === 'file') {
        if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
          const fileHandles = await (window as any).showOpenFilePicker({
            multiple: true,
            types: [
              {
                description: 'Audio Files',
                accept: {
                  'audio/*': ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.opus', '.webm', '.mp4', '.mka']
                }
              }
            ]
          });
          const files: File[] = [];
          for (const handle of fileHandles) {
            try {
              const file = await handle.getFile();
              files.push(file);
            } catch (fileErr) {
              console.error("Error reading file from handle:", fileErr);
            }
          }
          if (files.length > 0) {
            handleAddFilesRef.current(files);
          }
        } else {
          throw new Error("File System Access API (showOpenFilePicker) not supported on this browser.");
        }
      } else {
        if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
          const dirHandle = await (window as any).showDirectoryPicker();
          const files: File[] = [];
          
          async function traverseDirectory(handle: any, currentPath: string = '') {
            for await (const entry of handle.values()) {
              if (entry.kind === 'file') {
                try {
                  const file = await entry.getFile();
                  // Preserve relative path for folders
                  Object.defineProperty(file, 'webkitRelativePath', {
                    value: currentPath ? `${currentPath}/${file.name}` : file.name,
                    writable: false,
                    configurable: true
                  });
                  files.push(file);
                } catch (fileErr) {
                  console.error("Error reading file from dir handle:", fileErr);
                }
              } else if (entry.kind === 'directory') {
                await traverseDirectory(entry, currentPath ? `${currentPath}/${entry.name}` : entry.name);
              }
            }
          }
          
          await traverseDirectory(dirHandle, dirHandle.name);
          if (files.length > 0) {
            handleAddFilesRef.current(files);
          }
        } else {
          throw new Error("File System Access API (showDirectoryPicker) not supported on this browser.");
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("File System Access API picker was cancelled by user.");
        return;
      }
      console.warn("File System Access API fallback failed:", err);
      throw err;
    }
  };

  // Register modern picker fallback on the window object
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).triggerFileSystemAccessPick = handleFileSystemAccessPick;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).triggerFileSystemAccessPick;
      }
    };
  }, []);

  // Register Web App PWA launchQueue consumer for handling files opened from the system explorer
  useEffect(() => {
    if ('launchQueue' in window && !isAndroidWebView()) {
      (window as any).launchQueue.setConsumer(async (launchParams: any) => {
        if (launchParams.files && launchParams.files.length) {
          const filesArray: File[] = [];
          for (const fileHandle of launchParams.files) {
            try {
              const file = await fileHandle.getFile();
              filesArray.push(file);
            } catch (err) {
              console.error("Error retrieving file from launchQueue handle:", err);
            }
          }
          if (filesArray.length > 0) {
            handleAddFilesRef.current(filesArray);
          }
        }
      });
    }
  }, []);

  const handleRemoveTrack = useCallback((id: string) => {
    const currentTracks = tracksRef.current;
    const activeTrack = currentTrackRef.current;

    const track = currentTracks.find((t) => t.id === id);
    if (track?.coverUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(track.coverUrl);
    }
    const updated = currentTracks.filter((t) => t.id !== id);
    setTracks(updated);
    saveStatsToStorage(updated);

    if (activeTrack?.id === id) {
      handleStop();
      const fallback = updated.length > 0 ? updated[0] : null;
      setCurrentTrack(fallback || null);
      if (fallback) {
        spinampAudio.setTrack(fallback);
      }
    }
  }, []);

  const handleClearPlaylist = useCallback(() => {
    const currentTracks = tracksRef.current;
    currentTracks.forEach((track) => {
      if (track.coverUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(track.coverUrl);
      }
    });
    setTracks([]);
    saveStatsToStorage([]);
    handleStop();
    setCurrentTrack(null);
  }, []);

  const handleRateTrack = useCallback((id: string, stars: number) => {
    const currentTracks = tracksRef.current;
    const updated = currentTracks.map((t) =>
      t.id === id ? { ...t, rating: stars } : t
    );
    setTracks(updated);
    saveStatsToStorage(updated);
  }, []);

  const handleReorderTracks = useCallback((nextTracks: Track[]) => {
    setTracks(nextTracks);
    saveStatsToStorage(nextTracks);
  }, []);

  const handleAutoTriggerLlamaOnPowerOn = useCallback(() => {
    setIsPowerOn(true);
    const hasLaunched = localStorage.getItem('spinamp_has_launched_before') === 'true';
    if (!hasLaunched) {
      spinampAudio.triggerLlamaAss();
      localStorage.setItem('spinamp_has_launched_before', 'true');
    }
  }, []);

  const handleResetToDefaults = useCallback(() => {
    tracksRef.current.forEach((track) => {
      if (track.coverUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(track.coverUrl);
      }
    });

    // 1. Clear all localStorage keys used by the application
    localStorage.removeItem('spinamp_skin_color');
    localStorage.removeItem('spinamp_vis_theme');
    localStorage.removeItem('spinamp_vis_sensitivity');
    localStorage.removeItem('spinamp_screen_appearance');
    localStorage.removeItem('spinamp_screen_font');
    localStorage.removeItem('spinamp_retro_stats');
    localStorage.removeItem('spinamp_has_launched_before');
    localStorage.removeItem('spinamp_playlist_meta');

    // 2. Roll back state variables to default factory settings
    setSkinColor('vespa-gold');
    setSkin('bento');
    setScreenAppearance('default');
    setScreenFont('mono');
    setTracks(defaultTracks);
    setCurrentTrack(defaultTracks[0] || null);
    setVisualizerMode('spectrum');
    setVisTheme('amber');
    setVisSensitivity(1.2);
    setPlayHistory([]);

    setBpmDatabase({});
    setIsBpmDetecting(false);
    setSleepTimeLeft(null);
    setIsFullscreenVisualizer(false);
    setTimeDisplayMode('elapsed');

    // 3. Clear/set audio context defaults
    spinampAudio.setVolume(0.3);
    spinampAudio.stop();
    if (defaultTracks[0]) {
      spinampAudio.setTrack(defaultTracks[0]);
    }
    
    // 4. Do not power off player, keep it on
    setIsPowerOn(true);
  }, []);

  const handleTriggerLlama = useCallback(() => {
    spinampAudio.triggerLlamaAss();
  }, []);

  const handleSleepClose = useCallback(() => {
    setIsSleepModalOpen(false);
  }, []);

  const handleSleepStart = useCallback((minutes: number) => {
    setSleepTimeLeft(minutes * 60);
    setIsSleepModalOpen(false);
  }, []);

  const handleSleepDisable = useCallback(() => {
    setSleepTimeLeft(null);
    setIsSleepModalOpen(false);
  }, []);

  const handleSleepManualInputChange = useCallback((val: string) => {
    setManualMinutesInput(val);
  }, []);

  const handleToggleVisualizerMode = useCallback(() => {
    const modes: VisualizerMode[] = [
      'spectrum', 'oscilloscope', 'fire', 'rainbow', 'matrix-rain', 
      'starfield-warp', 'aurora', 'falling-stars', 'vfd', 'vu-meters', 
      'moloko-plus', 'spinning-cd', 'turntable', 'minidisk', 'cassette', 
      'guitar-hero', 'artwork', 'vegas-strip', 'skytree', 'lava-lamp', 'synthwave-grid', 'plasma-globe', 'random', 'off'
    ];
    setVisualizerMode((prev) => {
      const nextIdx = (modes.indexOf(prev) + 1) % modes.length;
      return modes[nextIdx]!;
    });
  }, []);

  return (
    <AndroidShell
      isLandscape={isLandscape}
      onToggleOrientation={handleToggleOrientation}
      volume={playerState.volume}
      onVolumeChange={handleVolumeChange}
      onLaunchSpinamp={handleAutoTriggerLlamaOnPowerOn}
      skinColor={skinColor}
      onSkinColorChange={handleSkinColorChange}
      appearance={screenAppearance}
      onChangeAppearance={handleScreenAppearanceChange}
    >
      {!isPowerOn ? (
        <WelcomeSplash
          onPowerOn={handleAutoTriggerLlamaOnPowerOn}
          onResetToDefaults={handleResetToDefaults}
        />
      ) : isFullscreenVisualizer ? (
        <FullScreenVisualizer
          mode={visualizerMode}
          isPlaying={playerState.isPlaying}
          currentTrack={currentTrack}
          currentTime={playerState.currentTime}
          duration={playerState.duration}
          playerState={playerState}
          playHistory={playHistory}
          tracks={tracks}
          onClose={() => setIsFullscreenVisualizer(false)}
          onToggleVisualizerMode={handleToggleVisualizerMode}
          onSelectVisualizerMode={setVisualizerMode}
          onPlay={handlePlay}
          onPause={handlePause}
          onStop={handleStop}
          onPrev={handlePrevTrack}
          onNext={handleNextTrack}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onMuteToggle={handleMuteToggle}
          onShuffleToggle={handleShuffleToggle}
          onRepeatToggle={handleRepeatToggle}
          timeDisplayMode={timeDisplayMode}
          onToggleTimeDisplayMode={handleToggleTimeDisplayMode}
        />
      ) : (
        <div id="active-applet-drawer" className={`flex-1 flex flex-col min-h-0 min-w-0 screen-${screenAppearance} font-preset-${screenFont}`}>
          {skin === 'bento' ? (
            <BentoSkin
              isLandscape={isLandscape}
              tracks={tracks}
              currentTrack={currentTrack}
              isPlaying={playerState.isPlaying}
              currentTime={playerState.currentTime}
              duration={playerState.duration}
              volume={playerState.volume}
              isMuted={playerState.isMuted}
              shuffle={playerState.shuffle}
              repeat={playerState.repeat}
              visualizerMode={visualizerMode}
              visTheme={visTheme}
              setVisTheme={setVisTheme}
              visSensitivity={visSensitivity}
              setVisSensitivity={setVisSensitivity}
              playHistory={playHistory}
              onPlay={handlePlay}
              onPause={handlePause}
              onStop={handleStop}
              onPrev={handlePrevTrack}
              onNext={handleNextTrack}
              onSeek={handleSeek}
              onVolumeChange={handleVolumeChange}
              onMuteToggle={handleMuteToggle}
              onShuffleToggle={handleShuffleToggle}
              onRepeatToggle={handleRepeatToggle}
              onSelectTrack={handleSelectTrack}
              onAddFiles={handleAddFiles}
              onRemoveTrack={handleRemoveTrack}
              onRateTrack={handleRateTrack}
              onReorderTracks={handleReorderTracks}
              onTriggerLlama={handleTriggerLlama}
              onToggleVisualizerMode={handleToggleVisualizerMode}
              onSelectVisualizerMode={setVisualizerMode}
              onToggleFullscreenVisualizer={() => setIsFullscreenVisualizer(true)}
              onClearPlaylist={handleClearPlaylist}
              timeDisplayMode={timeDisplayMode}
              onToggleTimeDisplayMode={handleToggleTimeDisplayMode}
              skinColor={skinColor}
              onSkinColorChange={handleSkinColorChange}
              sleepTimeLeft={sleepTimeLeft}
              onToggleSleepTimer={handleToggleSleepTimer}
              trackBPM={currentTrack ? bpmDatabase[currentTrack.id] : null}
              isBpmDetecting={isBpmDetecting}
              onResetToDefaults={handleResetToDefaults}
              appearance={screenAppearance}
              onChangeAppearance={handleScreenAppearanceChange}
              fontPreset={screenFont}
              onChangeFontPreset={setScreenFont}
              onOpenCustomSkinCreator={handleOpenCustomSkinCreator}
              loadingFilesMessage={loadingFilesMessage || undefined}
              onReimportTrack={handleReimportTrack}
            />
          ) : (
            <ClassicSkin
              isLandscape={isLandscape}
              tracks={tracks}
              currentTrack={currentTrack}
              isPlaying={playerState.isPlaying}
              currentTime={playerState.currentTime}
              duration={playerState.duration}
              volume={playerState.volume}
              isMuted={playerState.isMuted}
              shuffle={playerState.shuffle}
              repeat={playerState.repeat}
              visualizerMode={visualizerMode}
              visTheme={visTheme}
              setVisTheme={setVisTheme}
              visSensitivity={visSensitivity}
              setVisSensitivity={setVisSensitivity}
              playHistory={playHistory}
              onPlay={handlePlay}
              onPause={handlePause}
              onStop={handleStop}
              onPrev={handlePrevTrack}
              onNext={handleNextTrack}
              onSeek={handleSeek}
              onVolumeChange={handleVolumeChange}
              onMuteToggle={handleMuteToggle}
              onShuffleToggle={handleShuffleToggle}
              onRepeatToggle={handleRepeatToggle}
              onSelectTrack={handleSelectTrack}
              onAddFiles={handleAddFiles}
              onRemoveTrack={handleRemoveTrack}
              onReorderTracks={handleReorderTracks}
              onToggleVisualizerMode={handleToggleVisualizerMode}
              onSelectVisualizerMode={setVisualizerMode}
              onToggleFullscreenVisualizer={() => setIsFullscreenVisualizer(true)}
              onClearPlaylist={handleClearPlaylist}
              timeDisplayMode={timeDisplayMode}
              onToggleTimeDisplayMode={handleToggleTimeDisplayMode}
              sleepTimeLeft={sleepTimeLeft}
              onToggleSleepTimer={handleToggleSleepTimer}
              trackBPM={currentTrack ? bpmDatabase[currentTrack.id] : null}
              isBpmDetecting={isBpmDetecting}
              appearance={screenAppearance}
              onChangeAppearance={handleScreenAppearanceChange}
              fontPreset={screenFont}
              onChangeFontPreset={setScreenFont}
              loadingFilesMessage={loadingFilesMessage || undefined}
              onReimportTrack={handleReimportTrack}
            />
          )}
        </div>
      )}



      {/* Retro Sci-fi Manual Sleep Timer Configuration Modal */}
      <SleepTimerModal
        isOpen={isSleepModalOpen}
        sleepTimeLeft={sleepTimeLeft}
        manualMinutesInput={manualMinutesInput}
        onClose={handleSleepClose}
        onStart={handleSleepStart}
        onDisable={handleSleepDisable}
        onManualInputChange={handleSleepManualInputChange}
      />
                  {/* Retro Sci-fi Custom Skin Creator Modal */}
      <CustomSkinModal
        isOpen={isCustomSkinModalOpen}
        customSkin={customSkin}
        oldColors={oldColors}
        onClose={() => setIsCustomSkinModalOpen(false)}
        onApply={() => {
          localStorage.setItem('spinamp_custom_skin', JSON.stringify(customSkin));
          setScreenAppearance('custom');
          setIsCustomSkinModalOpen(false);
        }}
        onSkinChange={setCustomSkin}
        onRandomSkin={handleRandomSkin}
      />

      {/* Custom Theme CSS style injections when active */}
      {screenAppearance === 'custom' && customSkin && (
        <style dangerouslySetInnerHTML={{ __html: `
          .screen-custom {
            --skin-bg: ${customSkin.bg} !important;
            --skin-bg-alt: ${customSkin.bgAlt || customSkin.bg} !important;
            --skin-panel: ${customSkin.panel || customSkin.bg} !important;
            --skin-card: ${customSkin.bg} !important;
            --skin-border: ${customSkin.border} !important;
            --skin-accent: ${customSkin.accent} !important;
            --skin-accent-hover: ${customSkin.accent} !important;
            --skin-accent-shadow: rgba(255, 120, 0, 0.2) !important;
            --skin-text: ${customSkin.text} !important;
            --skin-text-muted: ${customSkin.text}bf !important;
            color: ${customSkin.text} !important;
          }

          /* Tactile Bezel/Border Styles */
          ${customSkin.bezel === 'retro' ? `
            .screen-custom, 
            .screen-custom #spinamp-bento-skin-main,
            .screen-custom #spinamp-bento-skin-main-landscape,
            .screen-custom #classic-skin-panel,
            .screen-custom #spinamp-classic-chassis-wrapper,
            .screen-custom button, 
            .screen-custom div, 
            .screen-custom input, 
            .screen-custom select {
              border-radius: 0px !important;
            }
          ` : customSkin.bezel === 'modern' ? `
            .screen-custom #spinamp-bento-skin-main,
            .screen-custom #spinamp-bento-skin-main-landscape,
            .screen-custom #classic-skin-panel,
            .screen-custom #spinamp-classic-chassis-wrapper {
              border-radius: 16px !important;
            }
            .screen-custom button, 
            .screen-custom input, 
            .screen-custom select {
              border-radius: 6px !important;
            }
          ` : ''}

          /* Tactile Glow Enhancements */
          ${customSkin.glow === 'vibrant' ? `
            .screen-custom .text-amber-500,
            .screen-custom .text-orange-400,
            .screen-custom .text-[var(--skin-accent)] {
              filter: drop-shadow(0 0 5px ${customSkin.accent}) !important;
              text-shadow: 0 0 4px ${customSkin.accent}cc !important;
            }
            .screen-custom .bg-amber-500,
            .screen-custom .bg-[var(--skin-accent)] {
              box-shadow: 0 0 10px ${customSkin.accent}cc, inset 0 1px 0 rgba(255,255,255,0.2) !important;
            }
            .screen-custom button:hover {
              box-shadow: 0 0 6px ${customSkin.accent}99 !important;
            }
          ` : customSkin.glow === 'subtle' ? `
            .screen-custom .text-amber-500,
            .screen-custom .text-[var(--skin-accent)] {
              filter: drop-shadow(0 0 2px ${customSkin.accent}80) !important;
            }
          ` : `
            .screen-custom .text-amber-500,
            .screen-custom .text-[var(--skin-accent)],
            .screen-custom .bg-amber-500,
            .screen-custom .bg-[var(--skin-accent)] {
              box-shadow: none !important;
              filter: none !important;
              text-shadow: none !important;
            }
          `}

          /* Tactile Chassis Textures / Patterns */
          ${customSkin.texture === 'brushed' ? `
            .screen-custom #spinamp-bento-skin-main,
            .screen-custom #spinamp-bento-skin-main-landscape,
            .screen-custom #classic-skin-panel,
            .screen-custom #spinamp-classic-chassis-wrapper {
              background-image: radial-gradient(circle at 50% 15%, rgba(255, 255, 255, 0.08), transparent 60%),
                                linear-gradient(135deg, rgba(255, 255, 255, 0.03) 25%, transparent 25%),
                                linear-gradient(to bottom, rgba(255, 255, 255, 0.02), rgba(0, 0, 0, 0.15)) !important;
              background-blend-mode: overlay, normal !important;
              box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1), 0 12px 24px rgba(0,0,0,0.5) !important;
            }
          ` : customSkin.texture === 'carbon' ? `
            .screen-custom #spinamp-bento-skin-main,
            .screen-custom #spinamp-bento-skin-main-landscape,
            .screen-custom #classic-skin-panel,
            .screen-custom #spinamp-classic-chassis-wrapper {
              background-color: ${customSkin.bg} !important;
              background-image: linear-gradient(45deg, rgba(0, 0, 0, 0.25) 25%, transparent 25%, transparent 75%, rgba(0, 0, 0, 0.25) 75%),
                                linear-gradient(45deg, rgba(0, 0, 0, 0.25) 25%, transparent 25%, transparent 75%, rgba(0, 0, 0, 0.25) 75%) !important;
              background-size: 6px 6px !important;
              background-position: 0 0, 3px 3px !important;
            }
          ` : customSkin.texture === 'scanlines' ? `
            .screen-custom #spinamp-bento-skin-main,
            .screen-custom #spinamp-bento-skin-main-landscape,
            .screen-custom #classic-skin-panel,
            .screen-custom #spinamp-classic-chassis-wrapper {
              background-image: linear-gradient(rgba(0, 0, 0, 0.15) 50%, rgba(255, 255, 255, 0.02) 50%) !important;
              background-size: 100% 4px !important;
            }
          ` : customSkin.texture === 'hexagrid' ? `
            .screen-custom #spinamp-bento-skin-main,
            .screen-custom #spinamp-bento-skin-main-landscape,
            .screen-custom #classic-skin-panel,
            .screen-custom #spinamp-classic-chassis-wrapper {
              background-image: radial-gradient(${customSkin.accent}0a 1px, transparent 1px) !important;
              background-size: 8px 8px !important;
            }
          ` : ''}
        `}} />
      )}
      <input
        id="reimport-file-input"
        aria-label="Reimport file"
        ref={reimportInputRef}
        type="file"
        accept={getReimportAccept()}
        className="sr-only"
        onChange={handleReimportFileChange}
        title={reimportTrackId ? `Select file for: ${tracks.find(t => t.id === reimportTrackId)?.title || ''}` : undefined}
      />
    </AndroidShell>
  );
}
