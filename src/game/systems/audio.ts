/**
 * Procedural sound effects.
 *
 * A handful of cues, synthesised with the Web Audio API: a few oscillators
 * and an envelope each, so the whole sound design ships no audio files and
 * needs no licences. The context is created lazily and resumed on the first
 * gesture, because browsers refuse to start audio before one.
 */

let context: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!context) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.35;
    master.connect(context.destination);
  }
  if (context.state === "suspended") void context.resume();
  return context;
}

function envelope(
  ctx: AudioContext,
  node: AudioNode,
  attack: number,
  decay: number,
  peak: number
) {
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
  node.connect(gain);
  gain.connect(master!);
}

function tone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  peak = 0.6,
  sweepTo?: number
) {
  const ctx = ensureContext();
  if (!ctx || muted || !master) return;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  if (sweepTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(sweepTo, ctx.currentTime + duration);
  }
  envelope(ctx, osc, 0.008, duration, peak);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.05);
}

function noiseBurst(duration: number, peak = 0.4, filterHz = 1800) {
  const ctx = ensureContext();
  if (!ctx || muted || !master) return;
  const frames = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = filterHz;
  source.connect(filter);
  envelope(ctx, filter, 0.005, duration, peak);
  source.start();
}

const later = (ms: number, fn: () => void) => window.setTimeout(fn, ms);

export const sfx = {
  /** Picking up a gem: a bright two-note chime. */
  gem() {
    tone(880, 0.12, "triangle", 0.5);
    later(70, () => tone(1318.5, 0.22, "triangle", 0.4));
  },
  /** Going through a doorway. */
  door() {
    tone(160, 0.35, "sawtooth", 0.25, 90);
    noiseBurst(0.25, 0.18, 900);
  },
  /** Taking a hit. */
  hurt() {
    tone(220, 0.28, "square", 0.45, 70);
    noiseBurst(0.18, 0.35, 2400);
  },
  /** Spending gems. */
  unlock() {
    tone(392, 0.14, "triangle", 0.4);
    later(90, () => tone(587.3, 0.16, "triangle", 0.4));
    later(190, () => tone(784, 0.3, "triangle", 0.35));
  },
  /** A life bought back. */
  heal() {
    tone(523.3, 0.16, "sine", 0.4);
    later(120, () => tone(784, 0.28, "sine", 0.35));
  },
  /** Reaching the exit. */
  win() {
    [523.3, 659.3, 784, 1046.5].forEach((f, i) =>
      later(i * 130, () => tone(f, 0.4, "triangle", 0.4))
    );
  },
  /** Losing the last life. */
  lose() {
    [392, 329.6, 261.6, 196].forEach((f, i) =>
      later(i * 160, () => tone(f, 0.45, "sawtooth", 0.32))
    );
  },
  /** A puzzle solved. */
  solved() {
    [659.3, 880, 1174.7].forEach((f, i) =>
      later(i * 90, () => tone(f, 0.3, "triangle", 0.38))
    );
  },
  /** A wrong answer. */
  wrong() {
    tone(196, 0.22, "square", 0.3, 150);
  },
  setMuted(next: boolean) {
    muted = next;
    if (master) master.gain.value = next ? 0 : 0.35;
  },
  isMuted: () => muted,
};
