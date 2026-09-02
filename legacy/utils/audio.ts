/**
 * Procedural sound effects.
 *
 * assets/sounds/ contains an index file and nothing else - the game has been
 * silent since it was written, and useSoundEffects was never called from
 * anywhere. Rather than ship audio files (and their licensing) for a handful
 * of cues, these are synthesised with the Web Audio API, in the same spirit as
 * the project's procedural textures. Everything here is a few oscillators and
 * an envelope, so the whole sound design costs no bytes of download.
 *
 * Browsers refuse to start audio before a user gesture, so the context is
 * created lazily and resumed on the first interaction.
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
    master.gain.value = 0.35;
    master.connect(context.destination);
  }

  // Autoplay policy: the context starts suspended until a gesture happens.
  if (context.state === "suspended") void context.resume();
  return context;
}

function envelope(
  ctx: AudioContext,
  node: AudioNode,
  attack: number,
  decay: number,
  peak: number
): GainNode {
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
  node.connect(gain);
  gain.connect(master!);
  return gain;
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
    osc.frequency.exponentialRampToValueAtTime(
      sweepTo,
      ctx.currentTime + duration
    );
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
    // Fade the noise out across the buffer so it reads as a hit, not a hiss.
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

export const sfx = {
  /** Picking up a gem: a bright two-note chime. */
  gem() {
    tone(880, 0.12, "triangle", 0.5);
    window.setTimeout(() => tone(1318.5, 0.22, "triangle", 0.4), 70);
  },

  /** Walking through a doorway. */
  door() {
    tone(160, 0.35, "sawtooth", 0.25, 90);
    noiseBurst(0.25, 0.18, 900);
  },

  /** Taking a hit from a hazard: harsh and low. */
  hurt() {
    tone(220, 0.28, "square", 0.45, 70);
    noiseBurst(0.18, 0.35, 2400);
  },

  /** Spending gems on the locked door. */
  unlock() {
    tone(392, 0.14, "triangle", 0.4);
    window.setTimeout(() => tone(587.3, 0.16, "triangle", 0.4), 90);
    window.setTimeout(() => tone(784, 0.3, "triangle", 0.35), 190);
  },

  /** Reaching the end room. */
  win() {
    [523.3, 659.3, 784, 1046.5].forEach((f, i) =>
      window.setTimeout(() => tone(f, 0.4, "triangle", 0.4), i * 130)
    );
  },

  /** Losing the last life. */
  lose() {
    [392, 329.6, 261.6, 196].forEach((f, i) =>
      window.setTimeout(() => tone(f, 0.45, "sawtooth", 0.32), i * 160)
    );
  },

  /** A single footstep. */
  step() {
    noiseBurst(0.07, 0.09, 620);
  },

  setMuted(next: boolean) {
    muted = next;
    if (master) master.gain.value = next ? 0 : 0.35;
  },

  isMuted() {
    return muted;
  },
};

export default sfx;
