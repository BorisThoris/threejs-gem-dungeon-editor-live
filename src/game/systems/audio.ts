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

/**
 * One second of white noise, made once and reused by every burst.
 *
 * Each burst used to allocate a buffer and fill it sample by sample - about
 * fifteen thousand writes for a short hit. The Warden knocks on a wall
 * every few seconds, so that was a synchronous stall on a timer, which is
 * what an intermittent stutter usually turns out to be. The envelope does
 * the fade now, so one flat buffer serves every length.
 */
let noise: AudioBuffer | null = null;

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noise) return noise;
  const frames = ctx.sampleRate;
  noise = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}

function noiseBurst(duration: number, peak = 0.4, filterHz = 1800) {
  const ctx = ensureContext();
  if (!ctx || muted || !master) return;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  // Start somewhere random so repeated hits are not the same sound.
  const offset = Math.random() * 0.5;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = filterHz;
  source.connect(filter);
  envelope(ctx, filter, 0.005, duration, peak);
  source.start(ctx.currentTime, offset, duration + 0.1);
  source.stop(ctx.currentTime + duration + 0.1);
}

const later = (ms: number, fn: () => void) => window.setTimeout(fn, ms);

let bed: {
  gain: GainNode;
  filter: BiquadFilterNode;
  fifth: OscillatorNode;
  stop: () => void;
} | null = null;

/**
 * The dungeon's air: a low drone and a breath of filtered noise, far below
 * the cues, so silence between rooms never sounds like the game has hung.
 * Fades in over a couple of seconds and out over one.
 */
export const ambience = {
  /**
   * How roused the floor is, 0 to 1. The bed tightens with it: the drone
   * comes up and the air moves faster, so a floor being emptied of gems is
   * audibly a worse place to be standing.
   */
  setTension(rouse: number) {
    if (!bed || !context) return;
    const at = context.currentTime + 0.6;
    bed.gain.gain.linearRampToValueAtTime(0.11 + rouse * 0.1, at);
    bed.filter.frequency.linearRampToValueAtTime(320 + rouse * 420, at);
    bed.fifth.frequency.linearRampToValueAtTime(82.4 + rouse * 6, at);
  },
  start() {
    const ctx = ensureContext();
    if (!ctx || !master || bed) return;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.11, ctx.currentTime + 2.5);
    gain.connect(master);

    const drone = ctx.createOscillator();
    drone.type = "sine";
    drone.frequency.value = 55;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.5;
    drone.connect(droneGain).connect(gain);

    const fifth = ctx.createOscillator();
    fifth.type = "triangle";
    fifth.frequency.value = 82.4;
    const fifthGain = ctx.createGain();
    fifthGain.gain.value = 0.12;
    fifth.connect(fifthGain).connect(gain);

    // Looping noise through a slow-wobbling low-pass: air moving somewhere.
    // The shared buffer again, looped: a run starting used to fill a
    // four-second buffer by hand, which is a visible hitch on the first frame
    // of a run.
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer(ctx);
    noiseSource.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 320;
    const wobble = ctx.createOscillator();
    wobble.frequency.value = 0.07;
    const wobbleDepth = ctx.createGain();
    wobbleDepth.gain.value = 140;
    wobble.connect(wobbleDepth).connect(filter.frequency);
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.9;
    noiseSource.connect(filter).connect(noiseGain).connect(gain);

    drone.start();
    fifth.start();
    noiseSource.start();
    wobble.start();
    bed = {
      gain,
      filter,
      fifth,
      stop: () => {
        const at = ctx.currentTime + 1.1;
        drone.stop(at);
        fifth.stop(at);
        noiseSource.stop(at);
        wobble.stop(at);
      },
    };
  },
  stop() {
    if (!bed || !context) return;
    const { gain, stop } = bed;
    bed = null;
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1);
    stop();
  },
};

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
  /**
   * A footstep. Pitch and filter wander a little so a corridor does not
   * sound like a metronome, and the whole thing is one short noise burst -
   * a synthesised footstep that tries to be a real one lands in the uncanny
   * valley, and a soft scuff does not.
   */
  step(strong: boolean) {
    const wobble = 0.85 + Math.random() * 0.4;
    noiseBurst(strong ? 0.085 : 0.07, strong ? 0.16 : 0.11, 420 * wobble);
    tone(70 * wobble, 0.06, "sine", strong ? 0.14 : 0.09, 48 * wobble);
  },
  /** Something dropped into the satchel. */
  take() {
    tone(520, 0.09, "triangle", 0.3);
    later(55, () => tone(700, 0.13, "triangle", 0.25));
  },
  /** A cork, then whatever it was. */
  drink() {
    tone(300, 0.07, "sine", 0.35, 520);
    later(90, () => tone(660, 0.3, "sine", 0.25));
  },
  /** Something you should not have drunk. */
  bitter() {
    tone(150, 0.4, "sawtooth", 0.35, 84);
    noiseBurst(0.3, 0.22, 900);
  },
  /** Iron on stone: the key coming off the floor. */
  key() {
    tone(880, 0.08, "triangle", 0.28);
    later(50, () => tone(1174.7, 0.16, "triangle", 0.24));
    noiseBurst(0.09, 0.1, 3200);
  },
  /** A lock giving way. */
  unlock2() {
    noiseBurst(0.14, 0.24, 1400);
    later(120, () => tone(196, 0.5, "sawtooth", 0.3, 110));
    later(200, () => tone(392, 0.4, "triangle", 0.24));
  },
  /** The shopkeeper puts a name to something. */
  named() {
    tone(587.3, 0.12, "triangle", 0.32);
    later(80, () => tone(880, 0.26, "triangle", 0.28));
  },
  /** Stone grinding: the arena's doors closing and its arms starting. */
  grind() {
    tone(70, 1.1, "sawtooth", 0.32, 46);
    noiseBurst(0.9, 0.24, 420);
    later(500, () => noiseBurst(0.7, 0.16, 300));
  },
  /** The arms stopping and the doors giving. */
  release() {
    tone(96, 0.7, "sine", 0.26, 150);
    later(160, () => tone(196, 0.5, "triangle", 0.2));
  },
  /** A relic taken off its pedestal. */
  relic() {
    [440, 660, 880, 1320].forEach((f, i) => later(i * 70, () => tone(f, 0.5, "sine", 0.3)));
  },
  /** The charm eating a hit: a hit that stops short. */
  charm() {
    tone(660, 0.1, "sine", 0.4);
    later(60, () => tone(330, 0.4, "sine", 0.3));
  },
  /** The Warden heard through a wall: a slow knock, no pitch to speak of. */
  wardenNear() {
    tone(58, 0.5, "sine", 0.45, 42);
    noiseBurst(0.3, 0.1, 260);
  },
  /** The Warden walking into your room. */
  wardenHere() {
    tone(88, 0.9, "sawtooth", 0.35, 44);
    later(120, () => tone(132, 0.7, "sine", 0.25, 66));
    noiseBurst(0.6, 0.2, 500);
  },
  setMuted(next: boolean) {
    muted = next;
    if (master) master.gain.value = next ? 0 : 0.35;
  },
  isMuted: () => muted,
};
