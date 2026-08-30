import { Track, PlayerState } from '../types';
import { synthService } from './synth';
import { isAndroidMediaBridgeAvailable } from './platformDetect';
import { safeGetItem, safeSetItem } from './safeStorage';
import { 
  isAndroidVolumeBridgeAvailable, 
  getNativeSystemVolume, 
  setNativeSystemVolume, 
  subscribeNativeVolumeChanges 
} from './androidVolumeBridge';

class SpinampAudioEngine {
  private audioCtx: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private synthSourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private preampGainNode: GainNode | null = null;
  private filterNodes: BiquadFilterNode[] = [];
  private bassBoostNode: BiquadFilterNode | null = null;
  private volumeGainNode: GainNode | null = null;

  // Effects & Speed
  private userPlaybackRate: number = typeof window !== 'undefined' ? parseFloat(safeGetItem('spinamp_playback_rate') || '1.0') : 1.0;
  private bassBoostDb: number = typeof window !== 'undefined' ? parseFloat(safeGetItem('spinamp_bass_boost') || '0') : 0;

  // Track sources
  private currentTrack: Track | null = null;
  private isSynthPlaying: boolean = false;
  private currentFileUrl: string | null = null;
  private lastSetFile: File | null = null;

  private expectedPauseRef: boolean = false;
  private wakeLockSentinel: any = null;
  private consecutivePlayFailures: number = 0;
  private lastUnexpectedPauseLogTime: number = 0;
  private pendingAutoResume: boolean = false;
  private lastAutoResumeAttemptTime: number = 0;
  private autoResumeRetryTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastPlayFailureTrackId: string | null = null;

  // React Callbacks for UI updates
  private stateChangeCallbacks: ((state: PlayerState) => void)[] = [];
  private trackEndedCallbacks: (() => void)[] = [];
  private prevTrackCallbacks: (() => void)[] = [];
  private nextTrackCallbacks: (() => void)[] = [];
  private durationDetectedCallbacks: ((duration: number) => void)[] = [];

  // Internal players state
  private playerState: PlayerState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: typeof window !== 'undefined' ? parseFloat(safeGetItem('spinamp_player_volume') || '0.3') : 0.3,
    isMuted: typeof window !== 'undefined' ? safeGetItem('spinamp_player_is_muted') === 'true' : false,
    shuffle: typeof window !== 'undefined' ? safeGetItem('spinamp_player_shuffle') === 'true' : false,
    repeat: typeof window !== 'undefined' ? (safeGetItem('spinamp_player_repeat') as 'none' | 'all' | 'one') || 'none' : 'none',
  };
  
  private lastBroadcastedTime: number = -1;
  private lastBroadcastedPlaying: boolean = false;
  private lastBroadcastedVolume: number = -1;
  private lastBroadcastedMuted: boolean = false;
  private lastBroadcastedShuffle: boolean = false;
  private lastBroadcastedRepeat: 'none' | 'all' | 'one' | null = null;
  private lastBroadcastedDuration: number = -1;

  private trackingIntervalId: any = null;
  private spinTimer: any = null;
  private visMode: string = 'spectrum';
  private cdSkipIntervalId: any = null;
  private cdSkipTimeoutId: any = null;

  // Frequencies corresponding to Spinamp's 10-band EQ
  private eqFrequencies = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

  private pendingEqBands: Map<number, number> = new Map();
  private pendingPreamp: number | null = null;

  public setVisualizerMode(mode: string) {
    this.visMode = mode;
  }

  public getVisualizerMode(): string {
    return this.visMode;
  }

  public subscribePrevTrack(callback: () => void) {
    this.prevTrackCallbacks.push(callback);
    return () => {
      this.prevTrackCallbacks = this.prevTrackCallbacks.filter((c) => c !== callback);
    };
  }

  public subscribeNextTrack(callback: () => void) {
    this.nextTrackCallbacks.push(callback);
    return () => {
      this.nextTrackCallbacks = this.nextTrackCallbacks.filter((c) => c !== callback);
    };
  }

  private triggerPrevTrack() {
    this.prevTrackCallbacks.forEach((cb) => cb());
  }

  private triggerNextTrack() {
    this.nextTrackCallbacks.forEach((cb) => cb());
  }

  constructor() {
    // Lazy Audio element setup
    if (typeof window !== 'undefined') {
      const nativeVolume = getNativeSystemVolume();
      if (nativeVolume !== null) {
        this.playerState.volume = nativeVolume / 100;
      }

      subscribeNativeVolumeChanges((percent) => {
        this.playerState.volume = percent / 100;
        if (this.volumeGainNode && this.audioCtx) {
          this.volumeGainNode.gain.setTargetAtTime(
            this.playerState.isMuted ? 0 : this.playerState.volume,
            this.audioCtx.currentTime,
            0.02
          );
        }
        safeSetItem('spinamp_player_volume', this.playerState.volume.toString());
        this.broadcastState(); // so the in-app slider UI updates to match
      });

      this.audioElement = new Audio();
      this.audioElement.crossOrigin = 'anonymous';
      (this.audioElement as any).playsInline = true;
      (this.audioElement as any).webkitPlaysInline = true;

      // Attach audio element event listeners
      this.audioElement.addEventListener('play', () => this.onPlayStateChange(true));
      this.audioElement.addEventListener('pause', () => {
        if (!this.expectedPauseRef) {
          const now = Date.now();
          if (now - this.lastUnexpectedPauseLogTime > 2000) {
            console.warn(
              '[Spinamp Diagnostic] Audio element paused UNEXPECTEDLY at',
              new Date().toISOString(),
              'currentTime:', this.audioElement?.currentTime,
              'app foreground:', (window as any).AndroidMediaBridge ? 'native bridge present' : 'no bridge',
              'document.hidden:', document.hidden
            );
            this.lastUnexpectedPauseLogTime = now;
          }

          // Auto-resume if interrupted by screen-off, OS focus loss, or backgrounding
          if (this.playerState.isPlaying && this.audioElement && this.audioElement.paused && !this.audioElement.error && !this.expectedPauseRef) {
            this.pendingAutoResume = true;

            // Clear any previously pending retry timer to prevent duplicate triggers
            if (this.autoResumeRetryTimeout) {
              clearTimeout(this.autoResumeRetryTimeout);
              this.autoResumeRetryTimeout = null;
            }

            // Retry if backoff window (600ms) has passed, or schedule a single retry
            const timeSinceLastAttempt = now - this.lastAutoResumeAttemptTime;
            if (timeSinceLastAttempt >= 600) {
              this.lastAutoResumeAttemptTime = now;
              this.requestWakeLock();
              this.audioElement.play().then(() => {
                this.pendingAutoResume = false;
              }).catch((err) => {
                if (Date.now() - this.lastUnexpectedPauseLogTime <= 2000) {
                  console.warn('Background auto-resume attempt failed:', err);
                }
              });
            } else {
              const remainingDelay = Math.max(100, 600 - timeSinceLastAttempt);
              this.autoResumeRetryTimeout = setTimeout(() => {
                this.autoResumeRetryTimeout = null;
                if (
                  this.pendingAutoResume &&
                  this.playerState.isPlaying &&
                  this.audioElement &&
                  this.audioElement.paused &&
                  !this.expectedPauseRef &&
                  !this.audioElement.error
                ) {
                  this.lastAutoResumeAttemptTime = Date.now();
                  this.requestWakeLock();
                  this.audioElement.play().then(() => {
                    this.pendingAutoResume = false;
                  }).catch((err) => {
                    if (Date.now() - this.lastUnexpectedPauseLogTime <= 2000) {
                      console.warn('Deferred background auto-resume failed:', err);
                    }
                  });
                }
              }, remainingDelay);
            }
            return; // Maintain isPlaying = true so audio continues seamlessly in screen-off mode
          }
        }
        if (this.autoResumeRetryTimeout) {
          clearTimeout(this.autoResumeRetryTimeout);
          this.autoResumeRetryTimeout = null;
        }
        this.pendingAutoResume = false;
        this.onPlayStateChange(false);
      });
      this.audioElement.addEventListener('ended', () => this.onTrackEnded());
      this.audioElement.addEventListener('error', (e) => {
        const err = this.audioElement?.error;
        console.warn('[Spinamp] Audio element media load error:', err?.code, err?.message, e);
        this.stopTrackingTime();
        this.playerState.isPlaying = false;
        this.broadcastState();
      });

      // Global visibility / pageshow / focus listener to ensure playback survives screen dark / sleep
      const handleBackgroundResume = () => {
        if (this.playerState.isPlaying || this.pendingAutoResume) {
          if (this.autoResumeRetryTimeout) {
            clearTimeout(this.autoResumeRetryTimeout);
            this.autoResumeRetryTimeout = null;
          }
          this.ensureContext();
          this.requestWakeLock();
          if (this.audioElement && this.audioElement.paused && !this.expectedPauseRef) {
            this.lastAutoResumeAttemptTime = Date.now();
            this.audioElement.play().then(() => {
              this.pendingAutoResume = false;
            }).catch(() => {});
          }
        }
      };

      window.addEventListener('visibilitychange', handleBackgroundResume);
      window.addEventListener('pageshow', handleBackgroundResume);
      window.addEventListener('focus', handleBackgroundResume);
      window.addEventListener('spinamp-visibility-changed', handleBackgroundResume);
      
      const handleDurationChange = () => {
        if (this.audioElement && !this.isSynthPlaying) {
          const duration = this.audioElement.duration || 0;
          this.playerState.duration = duration;
          this.broadcastState();
          
          if (duration > 0 && Number.isFinite(duration)) {
            this.durationDetectedCallbacks.forEach((cb) => cb(duration));
          }
        }
      };

      this.audioElement.addEventListener('durationchange', handleDurationChange);
      this.audioElement.addEventListener('loadedmetadata', handleDurationChange);

      this.setupMediaSessionHandlers();

      // Keyboard media key overrides/fallbacks
      window.addEventListener('keydown', (e) => {
        if (e.key === 'MediaPlayPause') {
          if (this.playerState.isPlaying) {
            this.pause();
          } else {
            this.play();
          }
          e.preventDefault();
        } else if (e.key === 'MediaTrackNext') {
          this.triggerNextTrack();
          e.preventDefault();
        } else if (e.key === 'MediaTrackPrevious') {
          this.triggerPrevTrack();
          e.preventDefault();
        }
      });
    }
  }

  private initAudioContext() {
    if (this.audioCtx) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        console.warn("AudioContext is not supported in this browser");
        return;
      }
      this.audioCtx = new AudioContextClass();
      this.audioCtx.onstatechange = () => {
        if (this.audioCtx?.state === 'suspended' && this.playerState.isPlaying) {
          this.audioCtx.resume().catch(() => {});
        }
      };
    } catch (e) {
      console.warn("Failed to construct AudioContext:", e);
      this.audioCtx = null;
      return;
    }

    if (!this.audioCtx) return;

    try {
      // Create Nodes
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 256; // High frequency resolution for 90s style visualizer

      this.preampGainNode = this.audioCtx.createGain();
      this.preampGainNode.gain.value = 1.0; // pre-amp defaults to flat (1.0)

      // Create 10 Equalizer band filters
      this.filterNodes = this.eqFrequencies.map((freq, index) => {
        const filter = this.audioCtx!.createBiquadFilter();
        // First is low Shelf, last is high shelf, others are peaking
        if (index === 0) {
          filter.type = 'lowshelf';
        } else if (index === this.eqFrequencies.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
        }
        filter.frequency.value = freq;
        filter.Q.value = 1.0; // moderate bandwidth filter
        filter.gain.value = 0.0; // default to flat (0dB)
        return filter;
      });

      // Apply pending EQ bands
      this.pendingEqBands.forEach((dbGain, bandIndex) => {
        if (this.filterNodes[bandIndex]) {
          this.filterNodes[bandIndex].gain.setTargetAtTime(
            Math.max(-12, Math.min(12, dbGain)), 
            this.audioCtx!.currentTime,
            0.015
          );
        }
      });
      this.pendingEqBands.clear();
      
      // Apply pending preamp
      if (this.pendingPreamp !== null && this.preampGainNode) {
        const preampGain = Math.pow(10, this.pendingPreamp / 20);
        this.preampGainNode.gain.setTargetAtTime(preampGain, this.audioCtx!.currentTime, 0.015);
        this.pendingPreamp = null;
      }

      this.volumeGainNode = this.audioCtx.createGain();
      this.volumeGainNode.gain.value = this.playerState.volume;

      // Create Bass Boost low shelf filter
      this.bassBoostNode = this.audioCtx.createBiquadFilter();
      this.bassBoostNode.type = 'lowshelf';
      this.bassBoostNode.frequency.value = 80; // Punchy sub-bass cutoff
      this.bassBoostNode.gain.value = this.bassBoostDb;

      // Connect standard audio element
      if (this.audioElement && !this.sourceNode) {
        try {
          this.sourceNode = this.audioCtx.createMediaElementSource(this.audioElement);
          this.sourceNode.connect(this.preampGainNode);
        } catch (err) {
          console.warn("MediaElementAudioSourceNode creation skipped or already attached:", err);
        }
      }

      // Direct connect filters in series: Preamp -> Filter0..9 -> BassBoost -> Gain -> Analyser -> Destination
      let lastNode: AudioNode = this.preampGainNode;
      this.filterNodes.forEach((filter) => {
        lastNode.connect(filter);
        lastNode = filter;
      });

      lastNode.connect(this.bassBoostNode);
      this.bassBoostNode.connect(this.volumeGainNode);
      this.volumeGainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioCtx.destination);

      // Initialize Synth service
      const synthDest = synthService.init(this.audioCtx);
      if (synthDest && synthDest.stream) {
        this.synthSourceNode = this.audioCtx.createMediaStreamSource(synthDest.stream);
        // Connect Synth stream into the main EQ/gain chain
        this.synthSourceNode.connect(this.preampGainNode);
      }
    } catch (e) {
      console.warn("Failed setting up AudioContext chain or nodes:", e);
    }
  }

  public subscribeState(callback: (state: PlayerState) => void) {
    this.stateChangeCallbacks.push(callback);
    callback({ ...this.playerState });
    return () => {
      this.stateChangeCallbacks = this.stateChangeCallbacks.filter((c) => c !== callback);
    };
  }

  public subscribeTrackEnded(callback: () => void) {
    this.trackEndedCallbacks.push(callback);
    return () => {
      this.trackEndedCallbacks = this.trackEndedCallbacks.filter((c) => c !== callback);
    };
  }

  public subscribeDurationDetected(callback: (duration: number) => void) {
    this.durationDetectedCallbacks.push(callback);
    return () => {
      this.durationDetectedCallbacks = this.durationDetectedCallbacks.filter((c) => c !== callback);
    };
  }

  private broadcastState() {
    const timeChanged = this.playerState.currentTime !== this.lastBroadcastedTime;
    const playingChanged = this.playerState.isPlaying !== this.lastBroadcastedPlaying;
    const volumeChanged = this.playerState.volume !== this.lastBroadcastedVolume;
    const mutedChanged = this.playerState.isMuted !== this.lastBroadcastedMuted;
    const shuffleChanged = this.playerState.shuffle !== this.lastBroadcastedShuffle;
    const repeatChanged = this.playerState.repeat !== this.lastBroadcastedRepeat;
    const durationChanged = this.playerState.duration !== this.lastBroadcastedDuration;

    // When paused and no fields have moved, skip the broadcast
    if (!this.playerState.isPlaying && !timeChanged && !playingChanged && !volumeChanged && !mutedChanged && !shuffleChanged && !repeatChanged && !durationChanged) {
      return;
    }

    this.lastBroadcastedTime = this.playerState.currentTime;
    this.lastBroadcastedPlaying = this.playerState.isPlaying;
    this.lastBroadcastedVolume = this.playerState.volume;
    this.lastBroadcastedMuted = this.playerState.isMuted;
    this.lastBroadcastedShuffle = this.playerState.shuffle;
    this.lastBroadcastedRepeat = this.playerState.repeat;
    this.lastBroadcastedDuration = this.playerState.duration;

    this.stateChangeCallbacks.forEach((cb) => cb({ ...this.playerState }));
    this.updateMediaSession();
  }

  private async requestWakeLock() {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        if (!this.wakeLockSentinel && this.playerState.isPlaying) {
          this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
          this.wakeLockSentinel.addEventListener('release', () => {
            this.wakeLockSentinel = null;
            if (this.playerState.isPlaying) {
              setTimeout(() => this.requestWakeLock(), 300);
            }
          });
        }
      } catch {
        // Battery saver or background tab might reject wake lock request
      }
    }
  }

  private releaseWakeLock() {
    if (this.wakeLockSentinel) {
      try {
        this.wakeLockSentinel.release();
      } catch {}
      this.wakeLockSentinel = null;
    }
  }

  private onPlayStateChange(isPlaying: boolean) {
    this.playerState.isPlaying = isPlaying;
    if (isPlaying) {
      this.startTrackingTime();
      this.requestWakeLock();
    } else {
      this.stopTrackingTime();
      this.releaseWakeLock();
    }
    this.broadcastState();
  }

  private onTrackEnded() {
    this.stopTrackingTime();
    this.playerState.currentTime = 0;
    if (this.trackEndedCallbacks.length === 0) {
      this.playerState.isPlaying = false;
    }
    this.broadcastState();
    this.trackEndedCallbacks.forEach((cb) => cb());
  }

  private startTrackingTime() {
    this.stopTrackingTime();
    this.trackingIntervalId = setInterval(() => {
      if (this.isSynthPlaying) {
        // Procedural synth has infinite/no duration or simulated updates
        this.playerState.currentTime += 0.25;
        this.broadcastState();
      } else if (this.audioElement) {
        const newTime = this.audioElement.currentTime;
        // Only broadcast if time actually changed (prevents updates during pause)
        if (Math.abs(newTime - this.playerState.currentTime) > 0.01) {
          this.playerState.currentTime = newTime;
          this.broadcastState();
        }
      }
    }, 250);
  }

  private stopTrackingTime() {
    if (this.trackingIntervalId) {
      clearInterval(this.trackingIntervalId);
      this.trackingIntervalId = null;
    }
  }

  // --- AUDIO API CONTROLS ---

  public getAnalyser(): AnalyserNode | null {
    this.ensureContext();
    return this.analyserNode;
  }

  private ensureContext() {
    try {
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = null;
        this.initAudioContext();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch((err) => {
          console.warn('Failed to resume AudioContext:', err);
        });
      }
    } catch (e) {
      console.warn('ensureContext error caught:', e);
    }
  }

  public setTrack(track: Track) {
    const isSameFile = this.currentTrack?.id === track.id && (
      track.file 
        ? track.file === this.lastSetFile 
        : !this.lastSetFile
    );
    
    if (isSameFile) {
      this.currentTrack = track;
      this.updateMediaSessionMetadata(track);
      this.updateMediaSession();
      return;
    }

    this.expectedPauseRef = true;
    this.stop();

    // Defer previous file URL revocation to prevent aborting active audio decoders
    if (this.currentFileUrl) {
      const oldUrl = this.currentFileUrl;
      this.currentFileUrl = null;
      setTimeout(() => {
        try { URL.revokeObjectURL(oldUrl); } catch (_) {}
      }, 1500);
    }

    this.lastSetFile = track.file || null;

    this.currentTrack = track;
    this.isSynthPlaying = track.id === 'synth';

    if (this.isSynthPlaying) {
      this.playerState.currentTime = 0;
      this.playerState.duration = 600; // Simulated 10 mins synth jam
      this.broadcastState();
    } else if (track.file && ((track.file as any) instanceof File || (track.file as any) instanceof Blob)) {
      try {
        this.currentFileUrl = URL.createObjectURL(track.file);
        if (this.audioElement) {
          this.audioElement.src = this.currentFileUrl;
          this.audioElement.load();
        }
      } catch (err) {
        console.error('Failed to create Object URL for track file:', err);
      }
    } else if (track.url) {
      if (this.audioElement) {
        this.audioElement.src = track.url;
        this.audioElement.load();
      }
    }
    
    setTimeout(() => {
      this.expectedPauseRef = false;
    }, 150);

    this.updateMediaSessionMetadata(track);
    this.updateMediaSession(); // ensure native bridge gets the initial state immediately
  }

  public cleanup() {
    this.stop();
    if (this.currentFileUrl) {
      URL.revokeObjectURL(this.currentFileUrl);
      this.currentFileUrl = null;
    }
  }

  private setPlaybackRateSafe(rate: number) {
    if (!this.audioElement) return;
    try {
      // W3C HTMLMediaElement standard playbackRate safe range is usually [0.0625, 16.0]
      const clamped = Math.max(0.0625, Math.min(16.0, rate));
      this.audioElement.playbackRate = clamped;
    } catch (err) {
      console.warn('Unable to set playbackRate safely:', err);
    }
  }

  public setUserPlaybackRate(rate: number) {
    const clamped = Math.max(0.25, Math.min(3.0, rate));
    this.userPlaybackRate = clamped;
    safeSetItem('spinamp_playback_rate', clamped.toString());
    this.setPlaybackRateSafe(clamped);
    this.updateMediaSession();
  }

  public getUserPlaybackRate(): number {
    return this.userPlaybackRate;
  }

  public setBassBoost(db: number) {
    const clamped = Math.max(0, Math.min(12, db));
    this.bassBoostDb = clamped;
    safeSetItem('spinamp_bass_boost', clamped.toString());
    if (this.bassBoostNode && this.audioCtx) {
      this.bassBoostNode.gain.setTargetAtTime(clamped, this.audioCtx.currentTime, 0.015);
    }
  }

  public getBassBoost(): number {
    return this.bassBoostDb;
  }

  public getPlaybackRate(): number {
    if (this.isSynthPlaying) return 1.0;
    if (this.audioElement) {
      return this.audioElement.playbackRate;
    }
    return this.userPlaybackRate;
  }

  public getVolumeSettings() {
    return {
      volume: this.playerState.volume,
      isMuted: this.playerState.isMuted,
      effectiveVolume: this.playerState.isMuted ? 0 : this.playerState.volume
    };
  }

  public play(): Promise<void> {
    this.expectedPauseRef = false;
    this.ensureContext();
    if (this.autoResumeRetryTimeout) {
      clearTimeout(this.autoResumeRetryTimeout);
      this.autoResumeRetryTimeout = null;
    }
    if (!this.currentTrack) return Promise.resolve();

    if (this.isSynthPlaying) {
      synthService.start();
      this.playerState.isPlaying = true;
      this.startTrackingTime();
      this.broadcastState();
      return Promise.resolve();
    } else if (this.audioElement) {
      const isEasterEggMode = this.visMode === 'cassette' || this.visMode === 'turntable';
      if (!isEasterEggMode) {
        // Standard normal instant play behavior
        if (this.spinTimer) {
          clearInterval(this.spinTimer);
          this.spinTimer = null;
        }
        this.setPlaybackRateSafe(this.userPlaybackRate);
        if (this.volumeGainNode && this.audioCtx) {
          this.volumeGainNode.gain.setTargetAtTime(
            this.playerState.isMuted ? 0 : this.playerState.volume,
            this.audioCtx.currentTime,
            0.02
          );
        }
        try {
          return this.audioElement.play().then(() => {
            this.consecutivePlayFailures = 0;
          }).catch((err) => {
            console.warn('Playback failed, need user interaction first: ', err);
            if (this.lastPlayFailureTrackId === this.currentTrack?.id) {
              this.consecutivePlayFailures++;
            } else {
              this.consecutivePlayFailures = 1;
              this.lastPlayFailureTrackId = this.currentTrack?.id || null;
            }
            this.playerState.isPlaying = false;
            this.broadcastState();
          });
        } catch (err) {
          console.warn('Synchronous play call failed:', err);
          this.playerState.isPlaying = false;
          this.broadcastState();
          return Promise.resolve();
        }
      }

      // Clear any ongoing spin transitions
      const currentRate = this.spinTimer ? this.audioElement.playbackRate : 0.0625;
      if (this.spinTimer) {
        clearInterval(this.spinTimer);
        this.spinTimer = null;
      }

      // Explicitly disable preservesPitch to get realistic tape / vinyl spin-down/up pitch shifts
      if ('preservesPitch' in this.audioElement) {
        this.audioElement.preservesPitch = false;
      } else if ('mozPreservesPitch' in this.audioElement) {
        (this.audioElement as any).mozPreservesPitch = false;
      } else if ('webkitPreservesPitch' in this.audioElement) {
        (this.audioElement as any).webkitPreservesPitch = false;
      }
      
      const targetRate = this.userPlaybackRate;
      
      // Start/resume play immediately at the low speed
      this.setPlaybackRateSafe(currentRate);
      
      try {
        return this.audioElement.play().then(() => {
          // Spin up to full speed
          const duration = 650; // ms for the spin up
          const interval = 20; // step every 20ms
          const steps = duration / interval;
          let stepCount = 0;
          const startRate = currentRate;
          const startVolume = 0.2; // slight swell up
          const targetVolume = this.playerState.volume;

          this.spinTimer = setInterval(() => {
            stepCount++;
            const progress = Math.min(1.0, stepCount / steps); // 0 to 1
            
            // Smooth easing-out curve for spin up
            const easedProgress = Math.sin(progress * Math.PI / 2);
            const nextRate = startRate + (targetRate - startRate) * easedProgress;

            if (this.audioElement) {
              this.setPlaybackRateSafe(nextRate);
              
              // Swell volume back to target
              if (this.volumeGainNode && this.audioCtx) {
                const currentVolumeScalar = startVolume + (targetVolume - startVolume) * progress;
                this.volumeGainNode.gain.setTargetAtTime(
                  this.playerState.isMuted ? 0 : currentVolumeScalar,
                  this.audioCtx.currentTime,
                  0.02
                );
              }
            }

            if (stepCount >= steps || nextRate >= 0.99) {
              clearInterval(this.spinTimer);
              this.spinTimer = null;
              this.setPlaybackRateSafe(this.userPlaybackRate);
              if (this.volumeGainNode && this.audioCtx) {
                this.volumeGainNode.gain.setTargetAtTime(
                  this.playerState.isMuted ? 0 : this.playerState.volume,
                  this.audioCtx.currentTime,
                  0.02
                );
              }
            }
          }, interval);
          this.consecutivePlayFailures = 0;
        }).catch((err) => {
          console.warn('Playback failed, need user interaction first: ', err);
          if (this.lastPlayFailureTrackId === this.currentTrack?.id) {
            this.consecutivePlayFailures++;
          } else {
            this.consecutivePlayFailures = 1;
            this.lastPlayFailureTrackId = this.currentTrack?.id || null;
          }
          this.playerState.isPlaying = false;
          this.broadcastState();
          return Promise.resolve();
        });
      } catch (err) {
        console.warn('Synchronous play call failed:', err);
        this.playerState.isPlaying = false;
        this.broadcastState();
        return Promise.resolve();
      }
    }
    return Promise.resolve();
  }

  public pause() {
    this.pendingAutoResume = false;
    if (this.autoResumeRetryTimeout) {
      clearTimeout(this.autoResumeRetryTimeout);
      this.autoResumeRetryTimeout = null;
    }
    if (this.cdSkipIntervalId) {
      clearInterval(this.cdSkipIntervalId);
      this.cdSkipIntervalId = null;
    }
    if (this.cdSkipTimeoutId) {
      clearTimeout(this.cdSkipTimeoutId);
      this.cdSkipTimeoutId = null;
    }

    if (this.isSynthPlaying) {
      synthService.stop();
      this.playerState.isPlaying = false;
      this.stopTrackingTime();
      this.broadcastState();
    } else if (this.audioElement) {
      const isEasterEggMode = this.visMode === 'cassette' || this.visMode === 'turntable';
      if (!isEasterEggMode) {
        // Standard normal instant pause behavior
        if (this.spinTimer) {
          clearInterval(this.spinTimer);
          this.spinTimer = null;
        }
        this.expectedPauseRef = true;
        this.audioElement.pause();
        setTimeout(() => { this.expectedPauseRef = false; }, 100);
        this.setPlaybackRateSafe(this.userPlaybackRate);
        if (this.volumeGainNode && this.audioCtx) {
          this.volumeGainNode.gain.setTargetAtTime(
            this.playerState.isMuted ? 0 : this.playerState.volume,
            this.audioCtx.currentTime,
            0.02
          );
        }
        return;
      }

      // Clear any ongoing spin transitions
      if (this.spinTimer) {
        clearInterval(this.spinTimer);
        this.spinTimer = null;
      }

      // If the audio is already paused/not playing, do nothing
      if (this.audioElement.paused) return;

      // Start spinning down to a stop
      const duration = 850; // ms for the spin down
      const interval = 20; // step every 20ms
      const steps = duration / interval;
      let stepCount = 0;
      const startRate = this.audioElement.playbackRate;
      const startVolume = this.playerState.volume;

      // Explicitly disable preservesPitch to get realistic tape / vinyl spin-down/up pitch shifts
      if ('preservesPitch' in this.audioElement) {
        this.audioElement.preservesPitch = false;
      } else if ('mozPreservesPitch' in this.audioElement) {
        (this.audioElement as any).mozPreservesPitch = false;
      } else if ('webkitPreservesPitch' in this.audioElement) {
        (this.audioElement as any).webkitPreservesPitch = false;
      }

      this.spinTimer = setInterval(() => {
        stepCount++;
        const progress = Math.min(1.0, stepCount / steps); // 0 to 1
        
        // Easing out curve: decelerates faster at the end
        const easedProgress = progress * progress;
        const nextRate = Math.max(0.0625, startRate * (1 - easedProgress));

        if (this.audioElement) {
          this.setPlaybackRateSafe(nextRate);
          
          // Apply matching subtle gain/volume dip during slowdown
          if (this.volumeGainNode && this.audioCtx) {
            const currentVolumeScalar = startVolume * (1 - progress);
            this.volumeGainNode.gain.setTargetAtTime(
              this.playerState.isMuted ? 0 : currentVolumeScalar,
              this.audioCtx.currentTime,
              0.02
            );
          }
        }

        if (stepCount >= steps || nextRate <= 0.08) {
          clearInterval(this.spinTimer);
          this.spinTimer = null;
          
          if (this.audioElement) {
            this.expectedPauseRef = true;
            this.audioElement.pause();
            setTimeout(() => { this.expectedPauseRef = false; }, 100);
            this.setPlaybackRateSafe(this.userPlaybackRate); // Reset rate for next playback
          }
          // Restore volume state to the player State's original setting
          if (this.volumeGainNode && this.audioCtx) {
            this.volumeGainNode.gain.setTargetAtTime(
              this.playerState.isMuted ? 0 : this.playerState.volume,
              this.audioCtx.currentTime,
              0.02
            );
          }
        }
      }, interval);
    }
  }

  public stop() {
    this.pendingAutoResume = false;
    if (this.autoResumeRetryTimeout) {
      clearTimeout(this.autoResumeRetryTimeout);
      this.autoResumeRetryTimeout = null;
    }
    this.stopTrackingTime();
    if (this.spinTimer) {
      clearInterval(this.spinTimer);
      this.spinTimer = null;
    }
    if (this.cdSkipIntervalId) {
      clearInterval(this.cdSkipIntervalId);
      this.cdSkipIntervalId = null;
    }
    if (this.cdSkipTimeoutId) {
      clearTimeout(this.cdSkipTimeoutId);
      this.cdSkipTimeoutId = null;
    }
    if (this.isSynthPlaying) {
      synthService.stop();
      this.playerState.isPlaying = false;
      this.playerState.currentTime = 0;
      this.broadcastState();
    } else if (this.audioElement) {
      this.expectedPauseRef = true;
      this.audioElement.pause();
      setTimeout(() => { this.expectedPauseRef = false; }, 100);
      this.setPlaybackRateSafe(this.userPlaybackRate);
      this.audioElement.currentTime = 0;
      this.playerState.currentTime = 0;
      this.playerState.isPlaying = false;
      if (this.volumeGainNode && this.audioCtx) {
        this.volumeGainNode.gain.setTargetAtTime(
          this.playerState.isMuted ? 0 : this.playerState.volume,
          this.audioCtx.currentTime,
          0.02
        );
      }
      this.broadcastState();
    }

    if (isAndroidMediaBridgeAvailable()) {
      try {
        (window as any).AndroidMediaBridge.stopPlaybackService();
      } catch (err) {
        console.warn('Error stopping Android playback service:', err);
      }
    }
  }

  public seek(seconds: number) {
    this.triggerCdSkipSound();

    if (this.isSynthPlaying) {
      this.playerState.currentTime = seconds;
      this.broadcastState();
    } else if (this.audioElement) {
      this.audioElement.currentTime = seconds;
      this.playerState.currentTime = seconds;
      this.broadcastState();
    }
  }

  private triggerCdSkipSound() {
    if (typeof window === 'undefined') return;
    try {
      this.ensureContext();
      const ctx = this.audioCtx;
      if (!ctx || ctx.state === 'suspended') return;

      // Reset the silence timeout
      if (this.cdSkipTimeoutId) {
        clearTimeout(this.cdSkipTimeoutId);
      }

      // If the skipping oscillation/loop isn't running, start it
      if (!this.cdSkipIntervalId) {
        const playCdSkipTick = () => {
          const now = ctx.currentTime;
          const vol = this.playerState.volume;
          const isPowerMuted = this.playerState.isMuted;
          if (vol <= 0 || isPowerMuted) return;

          // 1. Digital laser read click (Very high pitch, very short)
          const clickOsc = ctx.createOscillator();
          const clickGain = ctx.createGain();
          const clickFilter = ctx.createBiquadFilter();

          clickOsc.type = 'sawtooth';
          clickOsc.frequency.setValueAtTime(6500, now);
          clickFilter.type = 'highpass';
          clickFilter.frequency.setValueAtTime(5000, now);

          clickGain.gain.setValueAtTime(0.04 * vol, now);
          clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

          clickOsc.connect(clickFilter);
          clickFilter.connect(clickGain);
          clickGain.connect(ctx.destination);

          clickOsc.start(now);
          clickOsc.stop(now + 0.02);

          // 2. Fragment audio stutter pulse (Chippy sine wave, medium pitch)
          const beepOsc = ctx.createOscillator();
          const beepGain = ctx.createGain();
          const beepFilter = ctx.createBiquadFilter();

          // Alternating slightly between a classic mid-frequency tone to simulate a skipping CD frame
          const baseFreq = 900 + (Math.random() * 200);
          beepOsc.type = 'triangle';
          beepOsc.frequency.setValueAtTime(baseFreq, now);
          beepOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, now + 0.05);

          beepFilter.type = 'bandpass';
          beepFilter.frequency.setValueAtTime(1200, now);
          beepFilter.Q.setValueAtTime(3.0, now);

          beepGain.gain.setValueAtTime(0.12 * vol, now);
          beepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

          beepOsc.connect(beepFilter);
          beepFilter.connect(beepGain);
          beepGain.connect(ctx.destination);

          beepOsc.start(now);
          beepOsc.stop(now + 0.07);
        };

        // Trigger first skip sound instantly
        playCdSkipTick();

        // Stutter at 11.5 FPS (approximately 85ms intervals), typical for rapid digital CD skipping buffers
        this.cdSkipIntervalId = setInterval(playCdSkipTick, 85);
      }

      // Automute / cleanup the loop when dragging or seeking is idle for 260ms
      this.cdSkipTimeoutId = setTimeout(() => {
        if (this.cdSkipIntervalId) {
          clearInterval(this.cdSkipIntervalId);
          this.cdSkipIntervalId = null;
        }
      }, 260);
    } catch (e) {
      console.warn('CD skipping sound trigger failed:', e);
    }
  }

  public getCurrentVolume(): number {
    return this.playerState.volume;
  }

  public setVolume(volume: number, syncToSystemVolume: boolean = true) {
    this.ensureContext();
    const clampedInput = Math.max(0, Math.min(1, volume));
    this.playerState.volume = clampedInput;
    if (typeof window !== 'undefined') {
      safeSetItem('spinamp_player_volume', clampedInput.toString());
    }
    
    // ADD: keep the real system volume in sync with the in-app slider
    if (syncToSystemVolume && isAndroidVolumeBridgeAvailable()) {
      setNativeSystemVolume(this.playerState.volume * 100);
    }
    
    if (this.volumeGainNode) {
      this.volumeGainNode.gain.setTargetAtTime(
        this.playerState.isMuted ? 0 : clampedInput,
        this.audioCtx!.currentTime,
        0.02
      );
    }
    this.broadcastState();
  }

  public setMute(isMuted: boolean) {
    this.ensureContext();
    this.playerState.isMuted = isMuted;
    if (typeof window !== 'undefined') {
      safeSetItem('spinamp_player_is_muted', isMuted.toString());
    }

    if (this.volumeGainNode) {
      this.volumeGainNode.gain.setTargetAtTime(
        isMuted ? 0 : this.playerState.volume,
        this.audioCtx!.currentTime,
        0.02
      );
    }
    this.broadcastState();
  }

  public setShuffle(shuffle: boolean) {
    this.playerState.shuffle = shuffle;
    if (typeof window !== 'undefined') {
      safeSetItem('spinamp_player_shuffle', shuffle.toString());
    }
    this.broadcastState();
  }

  public setRepeat(repeat: 'none' | 'all' | 'one') {
    this.playerState.repeat = repeat;
    if (typeof window !== 'undefined') {
      safeSetItem('spinamp_player_repeat', repeat);
    }
    if (this.audioElement) {
      this.audioElement.loop = repeat === 'one';
    }
    this.broadcastState();
  }

  // --- EQUALIZER FUNCTIONS ---

  public updateEqBand(bandIndex: number, dbGain: number) {
    if (!this.audioCtx || this.filterNodes.length === 0) {
      this.pendingEqBands.set(bandIndex, dbGain);  // ← queue for later
      return;
    }
    if (this.filterNodes[bandIndex]) {
      const clampedDb = Math.max(-12, Math.min(12, dbGain));
      this.filterNodes[bandIndex].gain.setTargetAtTime(
        clampedDb, 
        this.audioCtx.currentTime,
        0.015
      );
    }
  }

  public updatePreamp(dbGain: number) {
    if (!this.preampGainNode) {
      this.pendingPreamp = dbGain;  // ← queue for later
      return;
    }
    const clampedDb = Math.max(-12, Math.min(12, dbGain));
    // Preamp works by applying a master multiplier to preamp node
    // Gain scale mapping: dB to absolute linear gain coefficient
    const linearGain = Math.pow(10, clampedDb / 20);
    this.preampGainNode.gain.setTargetAtTime(linearGain, this.audioCtx!.currentTime, 0.015);
  }

  public triggerLlamaAss() {
    if (typeof window !== 'undefined') {
      // 1. Play beautiful procedural retro synthetic whip & laser chiptune sounds!
      try {
        this.ensureContext();
        const ctx = this.audioCtx;
        if (ctx) {
          const now = ctx.currentTime;
          
          // --- THE WHIP SOUND EFFECT ---
          // A noise generator for the whip-crack whoosh
          const bufferSize = ctx.sampleRate * 0.25; // 250ms
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noiseNode = ctx.createBufferSource();
          noiseNode.buffer = buffer;

          const noiseFilter = ctx.createBiquadFilter();
          noiseFilter.type = 'bandpass';
          noiseFilter.frequency.setValueAtTime(3000, now);
          noiseFilter.frequency.linearRampToValueAtTime(800, now + 0.15);
          noiseFilter.Q.setValueAtTime(4, now);

          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0, now);
          noiseGain.gain.linearRampToValueAtTime(0.3, now + 0.01);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

          noiseNode.connect(noiseFilter);
          noiseFilter.connect(noiseGain);
          noiseGain.connect(ctx.destination);
          
          // An oscillator to represent the snappy frequency slide (Whippish chiptune ZAP!)
          const oscNode = ctx.createOscillator();
          oscNode.type = 'sawtooth';
          oscNode.frequency.setValueAtTime(2200, now);
          oscNode.frequency.exponentialRampToValueAtTime(150, now + 0.18);

          const oscFilter = ctx.createBiquadFilter();
          oscFilter.type = 'lowpass';
          oscFilter.frequency.setValueAtTime(3000, now);
          oscFilter.frequency.exponentialRampToValueAtTime(500, now + 0.18);

          const oscGain = ctx.createGain();
          oscGain.gain.setValueAtTime(0, now);
          oscGain.gain.linearRampToValueAtTime(0.25, now + 0.01);
          oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

          oscNode.connect(oscFilter);
          oscFilter.connect(oscGain);
          oscGain.connect(ctx.destination);

          // Second chiptune echo beep
          const chimeNode = ctx.createOscillator();
          chimeNode.type = 'square';
          chimeNode.frequency.setValueAtTime(880, now + 0.22);
          chimeNode.frequency.setValueAtTime(1320, now + 0.32);

          const chimeGain = ctx.createGain();
          chimeGain.gain.setValueAtTime(0, now);
          chimeGain.gain.setValueAtTime(0.08, now + 0.22);
          chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

          chimeNode.connect(chimeGain);
          chimeGain.connect(ctx.destination);

          // Start synth components
          noiseNode.start(now);
          oscNode.start(now);
          chimeNode.start(now);

          noiseNode.stop(now + 0.26);
          oscNode.stop(now + 0.22);
          chimeNode.stop(now + 0.52);
        }
      } catch (err) {
        console.warn('Procedural synth sound failed:', err);
      }

      // 2. Play Speech Synthesis Voice: "SpinAmp... It really whips the llama's ass!"
      try {
        if ('speechSynthesis' in window) {
          // Cancel any ongoing speech so it does not queue up
          window.speechSynthesis.cancel();

          const phrase = "SpinAmp. It really whips the lamest app!";
          const utterance = new SpeechSynthesisUtterance(phrase);
          utterance.lang = 'en-US'; // Force En-US language to prevent German system-default accent fallbacks
          utterance.rate = 1.05; // slightly faster, cool retro pacing
          utterance.pitch = 1.25; // cute, geeky chiptune computer pitch
          utterance.volume = 1.0;

          const voices = window.speechSynthesis.getVoices();
          
          // Filter to strictly English-variant voices
          const enVoices = voices.filter(v => {
            const l = v.lang.toLowerCase();
            return l.startsWith('en') || l.includes('en-');
          });

          if (enVoices.length > 0) {
            // Rank preferred standard English voices (preferring US, then UK)
            const preferredVoice = 
              enVoices.find(v => v.lang.toLowerCase() === 'en-us' && v.name.toLowerCase().includes('google')) ||
              enVoices.find(v => v.lang.toLowerCase() === 'en-us' && v.name.toLowerCase().includes('samantha')) ||
              enVoices.find(v => v.lang.toLowerCase() === 'en-us') ||
              enVoices.find(v => v.lang.toLowerCase().startsWith('en-us')) ||
              enVoices.find(v => v.lang.toLowerCase().startsWith('en-gb')) ||
              enVoices[0];
            
            utterance.voice = preferredVoice;
          }

          // Trigger speech with a tiny delay to line up with the synthesized whip snap sound
          setTimeout(() => {
            window.speechSynthesis.speak(utterance);
          }, 180);
        }
      } catch (speakErr) {
        console.warn('Speech synthesis failed:', speakErr);
      }
    }
  }

  public triggerSFX(type: string) {
    if (typeof window === 'undefined') return;
    try {
      this.ensureContext();
      const ctx = this.audioCtx;
      if (!ctx) return;

      const now = ctx.currentTime;

      if (type === 'laser') {
        // Sweep oscillator from high to low frequency
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1600, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.22);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.26);
      } else if (type === 'coin') {
        // Retro 8-bit double-note powerup/gain coin sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        
        // Note 1
        osc.frequency.setValueAtTime(950, now);
        // Note 2 trigger slightly offset
        osc.frequency.setValueAtTime(1450, now + 0.07);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.setValueAtTime(0.12, now + 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.23);
      } else if (type === 'zap') {
        // High frequency triangle scan
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(3200, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.09);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.11);
      } else if (type === 'snare') {
        // White noise snare burst
        const bufferSize = ctx.sampleRate * 0.18; // 180ms
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1100, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.18);
      } else if (type === 'boom') {
        // Deep sine sweep (similar to 808 sub kick drop)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(25, now + 0.35);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (err) {
      console.warn('SFX synthesis failed:', err);
    }
  }

  private setupMediaSessionHandlers() {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      // On Android, the native PlaybackService's MediaSession already handles 
      // play/pause/stop/next/previous reliably (including when the screen is 
      // off, which this Web API cannot guarantee since it depends on the 
      // WebView's JS execution not being throttled). Registering these same 
      // action handlers here would create a second, competing MediaSession 
      // that causes unpredictable behavior — so skip them on Android.
      const skipTransportHandlers = isAndroidMediaBridgeAvailable();

      if (!skipTransportHandlers) {
        navigator.mediaSession.setActionHandler('play', () => {
          this.play();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          this.pause();
        });
        navigator.mediaSession.setActionHandler('stop', () => {
          this.stop();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          this.triggerPrevTrack();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          this.triggerNextTrack();
        });
      }

      // Seek handlers are independent of the play/pause/next/prev conflict — 
      // keep these registered on all platforms, Android included, since 
      // PlaybackService doesn't implement seek functionality.
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        this.seek(Math.max(0, this.playerState.currentTime - offset));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        this.seek(Math.min(this.playerState.duration, this.playerState.currentTime + offset));
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          this.seek(details.seekTime);
        }
      });
    } catch (err) {
      console.warn('Error setting up Media Session actions:', err);
    }
  }

  private updateMediaSessionMetadata(track: Track) {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      // Build artwork array from track's actual cover art
      const artworkList: MediaImage[] = [];

      if (track.coverUrl) {
        // Use the actual album art extracted from ID3/FLAC tags (blob: URL)
        // Android WebView supports blob: URLs in MediaSession artwork (API 29+)
        artworkList.push(
          { src: track.coverUrl, sizes: '256x256', type: 'image/jpeg' },
          { src: track.coverUrl, sizes: '512x512', type: 'image/jpeg' }
        );
      } else {
        // Fallback: use the app logo (loaded from assets, always available offline)
        artworkList.push(
          { src: '/spinamp_logo.jpg', sizes: '1024x1024', type: 'image/jpeg' }
        );
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist || 'Unknown Artist',
        album: track.album || '',
        artwork: artworkList,
      });
    } catch (err) {
      console.warn('Error setting Media Session Metadata:', err);
    }
  }

  public refreshMediaSessionMetadata() {
    if (this.currentTrack) {
      this.updateMediaSessionMetadata(this.currentTrack);
    }
  }

  private updateMediaSession() {
    // Web MediaSession API updates — guarded by its own availability check, 
    // as before
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = this.playerState.isPlaying ? 'playing' : 'paused';

        if ('setPositionState' in navigator.mediaSession) {
          const duration = this.playerState.duration;
          const position = this.playerState.currentTime;
          const rate = this.getPlaybackRate();

          if (Number.isFinite(duration) && duration >= 0 &&
              Number.isFinite(position) && position >= 0 && position <= duration &&
              Number.isFinite(rate) && rate > 0) {
            navigator.mediaSession.setPositionState({
              duration: duration,
              playbackRate: rate,
              position: position
            });
          }
        }
      } catch (err) {
        console.warn('Error updating Media Session state:', err);
      }
    }

    // Native Android bridge call — COMPLETELY INDEPENDENT of whether the Web 
    // MediaSession API exists or works. This must run every time this 
    // function is called, regardless of the block above.
    if (isAndroidMediaBridgeAvailable()) {
      try {
        const track = this.currentTrack;
        const durationMs = Number.isFinite(this.playerState.duration) ? Math.round(this.playerState.duration * 1000) : 0;
        const positionMs = Number.isFinite(this.playerState.currentTime) ? Math.round(this.playerState.currentTime * 1000) : 0;

        (window as any).AndroidMediaBridge.updatePlaybackState(
          this.playerState.isPlaying,
          track?.title || 'Spinamp',
          track?.artist || '',
          positionMs,
          durationMs
        );
      } catch (err) {
        console.warn('Error updating Android media bridge:', err);
      }
    }
  }

  public isCurrentlyPlaying(): boolean {
    return this.playerState.isPlaying;
  }
}

export const spinampAudio = new SpinampAudioEngine();

if (typeof window !== 'undefined') {
  (window as any).onNativeMediaAction = (action: string) => {
    switch (action) {
      case 'PLAY':
        spinampAudio.play();
        break;
      case 'PAUSE':
        spinampAudio.pause();
        break;
      case 'TOGGLE':
        if (spinampAudio.isCurrentlyPlaying()) {
          spinampAudio.pause();
        } else {
          spinampAudio.play();
        }
        break;
      case 'STOP':
        spinampAudio.stop();
        break;
      case 'NEXT':
        window.dispatchEvent(new CustomEvent('spinamp-native-next-track'));
        break;
      case 'PREVIOUS':
        window.dispatchEvent(new CustomEvent('spinamp-native-prev-track'));
        break;
    }
  };

  const VOLUME_STEP_SIZE = 0.02; // 2% per hardware button press

  (window as any).onNativeVolumeStep = (direction: 1 | -1) => {
    const newVolume = Math.max(0, Math.min(1, 
      spinampAudio.getCurrentVolume() + (direction * VOLUME_STEP_SIZE)
    ));
    spinampAudio.setVolume(newVolume, false); // false = don't sync to system volume
  };
}

export function restoreEqFromStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const isOn = safeGetItem('spinamp_eq_is_on') !== 'false';
    const preamp = parseFloat(safeGetItem('spinamp_eq_preamp') || '0');
    const savedBands = safeGetItem('spinamp_eq_bands');
    const bands: number[] = savedBands 
      ? JSON.parse(savedBands) 
      : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    const bassBoost = safeGetItem('spinamp_bass_boost');
    if (bassBoost !== null) {
      spinampAudio.setBassBoost(parseFloat(bassBoost));
    }

    const speed = safeGetItem('spinamp_playback_rate');
    if (speed !== null) {
      spinampAudio.setUserPlaybackRate(parseFloat(speed));
    }

    spinampAudio.updatePreamp(isOn ? preamp : 0);
    bands.forEach((val, idx) => {
      spinampAudio.updateEqBand(idx, isOn ? val : 0);
    });
  } catch (err) {
    console.warn('Failed to restore EQ settings from storage:', err);
  }
}
