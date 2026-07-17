const STORAGE_KEY = "branchreel:muted";
/** Per docs/DESIGN.md's juice plan: no SFX may retrigger within 60ms of the last one. */
const RETRIGGER_THROTTLE_MS = 60;

function readStoredMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // localStorage can throw (private browsing, disabled storage) or be
    // absent entirely (non-browser test environments) — default unmuted.
    return false;
  }
}

function writeStoredMuted(muted: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  } catch {
    // Muting still works for the session; it just won't persist.
  }
}

/**
 * WebAudio-synthesized SFX for the choice-and-branch moment — oscillators
 * only, no audio files. The AudioContext is created lazily on first play
 * so page load never trips an autoplay-policy warning, and every method
 * is a safe no-op in environments without `window`/`AudioContext` (tests,
 * SSR) or while muted.
 */
export class SoundEngine {
  private ctx: AudioContext | undefined;
  private muted: boolean;
  private lastTriggerAt = -Infinity;

  constructor() {
    this.muted = readStoredMuted();
  }

  get isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    writeStoredMuted(muted);
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /** Subtle tick on choice-button hover. */
  hover(): void {
    if (this.throttled()) return;
    this.tone({ freq: 660, duration: 0.03, type: "sine", gain: 0.02 });
  }

  /** Slightly brighter tick when a choice is committed. */
  choice(): void {
    if (this.throttled()) return;
    this.tone({ freq: 880, duration: 0.06, type: "triangle", gain: 0.05 });
  }

  /** Rising sweep as the graph-view path lights up after a branch. */
  branchLit(): void {
    if (this.throttled()) return;
    this.sweep({ from: 440, to: 880, duration: 0.15, gain: 0.06 });
  }

  /** Soft triad when a path reaches a terminal node. */
  storyEnd(): void {
    if (this.throttled()) return;
    this.chord({ freqs: [440, 554, 660], duration: 0.4, gain: 0.05 });
  }

  /**
   * Guards every SFX entry point against retriggering within
   * {@link RETRIGGER_THROTTLE_MS} of the last one (e.g. mouse jitter
   * firing repeated hover events), which would otherwise stack
   * overlapping oscillators.
   */
  private throttled(): boolean {
    const now = Date.now();
    if (now - this.lastTriggerAt < RETRIGGER_THROTTLE_MS) return true;
    this.lastTriggerAt = now;
    return false;
  }

  private ensureContext(): AudioContext | undefined {
    if (this.muted) return undefined;
    if (typeof window === "undefined") return undefined;

    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return undefined;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private tone(opts: { freq: number; duration: number; type: OscillatorType; gain: number }): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = opts.type;
    osc.frequency.value = opts.freq;
    this.playEnvelope(ctx, osc, opts.duration, opts.gain);
  }

  private sweep(opts: { from: number; to: number; duration: number; gain: number }): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(opts.from, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(opts.to, ctx.currentTime + opts.duration);
    this.playEnvelope(ctx, osc, opts.duration, opts.gain);
  }

  private chord(opts: { freqs: number[]; duration: number; gain: number }): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    for (const freq of opts.freqs) {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      this.playEnvelope(ctx, osc, opts.duration, opts.gain);
    }
  }

  private playEnvelope(ctx: AudioContext, osc: OscillatorNode, duration: number, gain: number): void {
    const gainNode = ctx.createGain();
    gainNode.gain.value = gain;
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gainNode).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }
}
