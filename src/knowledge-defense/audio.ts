import type { GameStatus, ShotEffect } from './engine';

type OscillatorKind = OscillatorType;

const MELODY = [523.25, 659.25, 783.99, 987.77, 880, 783.99, 659.25, 587.33];
const BASS = [130.81, 146.83, 164.81, 196];

export class KnowledgeDefenseAudio {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private enabled = true;
  private lastStatus: GameStatus = 'ready';

  get isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!this.context || !this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(enabled ? 0.86 : 0.0001, this.context.currentTime, 0.04);
    if (enabled) {
      void this.context.resume();
      this.startMusicTimer();
    }
  }

  async ensureStarted(): Promise<void> {
    this.createGraph();
    if (!this.context) return;
    if (this.context.state !== 'running') {
      await this.context.resume();
    }
    if (this.enabled) {
      this.startMusicTimer();
    }
  }

  tick(status: GameStatus): void {
    if (status !== this.lastStatus) {
      if (status === 'won') this.playResult(true);
      if (status === 'lost') this.playResult(false);
      this.lastStatus = status;
    }
  }

  playAnswer(correct: boolean): void {
    const context = this.activeContext();
    if (!context) return;
    const now = context.currentTime;
    if (correct) {
      this.tone(659.25, 0.08, 0.16, 'triangle', now);
      this.tone(987.77, 0.1, 0.13, 'sine', now + 0.08);
    } else {
      this.tone(246.94, 0.1, 0.13, 'triangle', now);
      this.tone(196, 0.12, 0.12, 'sine', now + 0.08);
    }
  }

  playBuild(upgrade: boolean): void {
    const context = this.activeContext();
    if (!context) return;
    const now = context.currentTime;
    this.tone(upgrade ? 783.99 : 523.25, 0.1, 0.13, 'triangle', now);
    this.tone(upgrade ? 1046.5 : 659.25, 0.14, 0.11, 'sine', now + 0.07);
    this.noiseBurst(now, 0.07, upgrade ? '#spark' : '#wood');
  }

  playFocusPulse(): void {
    const context = this.activeContext();
    if (!context) return;
    const now = context.currentTime;
    this.tone(392, 0.16, 0.22, 'sawtooth', now);
    this.tone(587.33, 0.18, 0.2, 'triangle', now + 0.08);
    this.tone(880, 0.2, 0.18, 'sine', now + 0.17);
    this.noiseBurst(now + 0.04, 0.22, '#pulse');
  }

  playShot(effect: ShotEffect): void {
    const context = this.activeContext();
    if (!context) return;
    const now = context.currentTime;
    if (effect.kind === 'slow') {
      this.tone(740, 0.05, 0.08, 'sine', now);
      this.tone(1244.51, 0.08, 0.06, 'triangle', now + 0.04);
      this.noiseBurst(now, 0.08, '#ice');
      return;
    }
    if (effect.kind === 'splash') {
      this.tone(174.61, 0.12, 0.16, 'sine', now);
      this.noiseBurst(now, 0.16, '#boom');
      return;
    }
    this.tone(880, 0.045, 0.09, 'square', now);
  }

  dispose(): void {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    void this.context?.close();
    this.context = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
  }

  private createGraph(): void {
    if (this.context) return;
    this.context = new AudioContext();
    this.masterGain = this.context.createGain();
    this.musicGain = this.context.createGain();
    this.sfxGain = this.context.createGain();
    this.masterGain.gain.value = this.enabled ? 0.86 : 0.0001;
    this.musicGain.gain.value = 0.24;
    this.sfxGain.gain.value = 0.5;
    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);
  }

  private startMusicTimer(): void {
    if (this.musicTimer || !this.activeContext()) return;
    this.musicTimer = setInterval(() => this.playMusicStep(), 260);
  }

  private playMusicStep(): void {
    const context = this.activeContext();
    if (!context) return;
    const now = context.currentTime;
    const melody = MELODY[this.step % MELODY.length];
    const bass = BASS[Math.floor(this.step / 4) % BASS.length];
    this.musicTone(melody, 0.17, 0.08, this.step % 2 === 0 ? 'triangle' : 'sine', now);
    if (this.step % 4 === 0) {
      this.musicTone(bass, 0.46, 0.06, 'sine', now);
    }
    if (this.step % 8 === 6) {
      this.musicTone(melody * 1.5, 0.13, 0.045, 'triangle', now + 0.09);
    }
    this.step += 1;
  }

  private musicTone(frequency: number, duration: number, volume: number, type: OscillatorKind, start: number): void {
    if (!this.context || !this.musicGain) return;
    this.envelopedOscillator(frequency, duration, volume, type, start, this.musicGain);
  }

  private tone(frequency: number, duration: number, volume: number, type: OscillatorKind, start: number): void {
    if (!this.context || !this.sfxGain) return;
    this.envelopedOscillator(frequency, duration, volume, type, start, this.sfxGain);
  }

  private envelopedOscillator(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorKind,
    start: number,
    destination: AudioNode,
  ): void {
    if (!this.context) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  private noiseBurst(start: number, duration: number, flavor: string): void {
    if (!this.context || !this.sfxGain) return;
    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      const decay = 1 - index / data.length;
      data[index] = (Math.random() * 2 - 1) * decay * flavorAmount(flavor, index);
    }
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = buffer;
    filter.type = flavor === '#ice' ? 'highpass' : 'bandpass';
    filter.frequency.value = flavor === '#boom' ? 180 : flavor === '#pulse' ? 420 : flavor === '#ice' ? 1800 : 850;
    filter.Q.value = flavor === '#ice' ? 7 : 1.3;
    gain.gain.setValueAtTime(flavor === '#boom' ? 0.22 : 0.12, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(start);
  }

  private playResult(won: boolean): void {
    const context = this.activeContext();
    if (!context) return;
    const now = context.currentTime;
    const notes = won ? [523.25, 659.25, 783.99, 1046.5] : [392, 329.63, 261.63];
    notes.forEach((note, index) => this.tone(note, 0.2, 0.12, won ? 'triangle' : 'sine', now + index * 0.12));
  }

  private activeContext(): AudioContext | null {
    if (!this.enabled || !this.context || this.context.state !== 'running') return null;
    return this.context;
  }
}

function flavorAmount(flavor: string, index: number): number {
  if (flavor === '#ice') return index % 3 === 0 ? 0.8 : 0.35;
  if (flavor === '#spark') return index % 5 === 0 ? 1 : 0.2;
  return 0.72;
}
