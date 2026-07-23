/**
 * Procedural Retro Audio Synthesizer for Spinamp Player
 * Generates an 80s/90s style chiptune synthwave track procedurally using Web Audio API.
 * This guarantees audio playback and visualizer responsiveness in all sandboxed environments.
 */

class SynthEngine {
  private audioCtx: AudioContext | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private isRunning: boolean = false;
  private tempo: number = 115;
  private stepDuration: number = 60 / 115 / 4; // Sixteenth note duration
  private currentStep: number = 0;
  private timerId: any = null;
  private nextNoteTime: number = 0.0;

  // Music sequence: C-Minor chord progression (Cm, Ab, Fm, G)
  // Bassline progression (C, Ab, F, G)
  private bassNotes = [36, 36, 36, 36, 44, 44, 44, 44, 41, 41, 41, 41, 43, 43, 43, 43]; // Midi notes
  private leadMelody = [
    60, 63, 67, 72, 70, 67, 63, 65,
    58, 62, 65, 70, 67, 65, 62, 60,
    56, 60, 63, 68, 67, 63, 60, 62,
    59, 62, 65, 71, 74, 71, 67, 63
  ];

  constructor() {}

  public init(context: AudioContext): MediaStreamAudioDestinationNode {
    this.audioCtx = context;
    // Create direct media stream destination to feed back into the main audio visualizer chain
    this.destinationNode = context.createMediaStreamDestination();
    return this.destinationNode;
  }

  public start() {
    if (this.isRunning || !this.audioCtx) return;
    this.isRunning = true;
    this.currentStep = 0;
    this.nextNoteTime = this.audioCtx.currentTime;
    this.scheduler();
  }

  public stop() {
    this.isRunning = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private mtof(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  private triggerSynth(freq: number, time: number, type: 'sawtooth' | 'square' | 'triangle' | 'sine', duration: number, volume: number) {
    if (!this.audioCtx || !this.destinationNode) return;

    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    // Apply filter envelope based on synth sound
    let filter: BiquadFilterNode | null = null;
    if (type === 'sawtooth') {
      filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(3, time);
      filter.frequency.setValueAtTime(150, time);
      filter.frequency.exponentialRampToValueAtTime(1200, time + 0.05);
      filter.frequency.exponentialRampToValueAtTime(300, time + duration);
    }

    // Connect node chain
    if (filter) {
      osc.connect(filter);
      filter.connect(gainNode);
    } else {
      osc.connect(gainNode);
    }
    gainNode.connect(this.destinationNode);

    // Gain envelope
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(volume, time + 0.01);
    gainNode.gain.setValueAtTime(volume, time + duration - 0.03);
    gainNode.gain.linearRampToValueAtTime(0, time + duration);

    osc.start(time);
    osc.stop(time + duration);
  }

  private triggerDrum(type: 'snare' | 'kick' | 'hihat', time: number, volume: number) {
    if (!this.audioCtx || !this.destinationNode) return;

    if (type === 'kick') {
      const osc = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(this.destinationNode);

      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);

      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(volume * 1.5, time + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

      osc.start(time);
      osc.stop(time + 0.2);
    } else if (type === 'hihat') {
      // Noise hihat synthesizer
      const bufferSize = this.audioCtx.sampleRate * 0.05;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7000, time);

      const gainNode = this.audioCtx.createGain();
      
      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.destinationNode);

      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(volume * 0.4, time + 0.002);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

      noise.start(time);
      noise.stop(time + 0.05);
    } else if (type === 'snare') {
      // Noise and Sine tone hybrid snare
      const osc = this.audioCtx.createOscillator();
      const oscGain = this.audioCtx.createGain();
      osc.frequency.setValueAtTime(180, time);
      osc.connect(oscGain);
      oscGain.connect(this.destinationNode);
      oscGain.gain.setValueAtTime(volume * 0.4, time);
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

      const bufferSize = this.audioCtx.sampleRate * 0.12;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, time);

      const noiseGain = this.audioCtx.createGain();
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.destinationNode);

      noiseGain.gain.setValueAtTime(0, time);
      noiseGain.gain.linearRampToValueAtTime(volume * 0.7, time + 0.002);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

      osc.start(time);
      osc.stop(time + 0.1);
      noise.start(time);
      noise.stop(time + 0.15);
    }
  }

  private scheduleNextStep() {
    const time = this.nextNoteTime;

    // 1. Play Bassline (on every 8th note, i.e. alternating steps of sixteenth notes)
    if (this.currentStep % 2 === 0) {
      const bar = Math.floor(this.currentStep / 16) % 4;
      const bassIdx = bar * 4 + (Math.floor(this.currentStep / 2) % 4);
      const bassMidi = this.bassNotes[bassIdx];
      
      // Retro pulsing bass rhythm
      const playBass = (this.currentStep % 4 !== 1); // skip a little beat
      if (playBass) {
        this.triggerSynth(this.mtof(bassMidi), time, 'sawtooth', this.stepDuration * 0.9, 0.18);
      }
    }

    // 2. Play Chiptune Melody
    // Only play on steps that make a cool groovy theme
    const melStep = this.currentStep % 32;
    const playMelody = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 21, 24, 26, 28, 30].includes(melStep);
    
    if (playMelody) {
      const noteMidi = this.leadMelody[melStep];
      // Triangle/square synth leads are very spinamp
      this.triggerSynth(this.mtof(noteMidi), time, 'square', this.stepDuration * 1.1, 0.08);
      
      // Delay effect / Echo chord
      this.triggerSynth(this.mtof(noteMidi), time + this.stepDuration * 1.5, 'sine', this.stepDuration * 0.8, 0.04);
    }

    // 3. Simple retro synth drums
    const drumStep = this.currentStep % 16;
    // Kick on 0, 4, 8, 12 (every quarter note)
    if (drumStep % 4 === 0) {
      this.triggerDrum('kick', time, 0.35);
    }
    // Snare on 4, 12
    if (drumStep === 4 || drumStep === 12) {
      this.triggerDrum('snare', time, 0.28);
    }
    // HiHats on 2, 6, 10, 14 (off-beat) and some extra upbeat
    if (drumStep % 2 === 2 || drumStep === 3 || drumStep === 11) {
      this.triggerDrum('hihat', time, 0.15);
    }

    // Advance clock
    this.nextNoteTime += this.stepDuration;
    this.currentStep = (this.currentStep + 1) % 128;
  }

  private scheduler() {
    if (!this.isRunning || !this.audioCtx) return;
    
    // Look-ahead schedule
    while (this.nextNoteTime < this.audioCtx.currentTime + 0.1) {
      this.scheduleNextStep();
    }
    
    this.timerId = setTimeout(() => this.scheduler(), 25);
  }
}

export const synthService = new SynthEngine();
