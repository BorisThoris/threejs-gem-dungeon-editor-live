/**
 * Procedural sound effects.
 *
 * A handful of cues, synthesised with the Web Audio API: a few oscillators
 * and an envelope each, so the whole sound design ships no audio files and
 * needs no licences. The context is created lazily and resumed on the first
 * gesture, because browsers refuse to start audio before one.
 */

import { createRoomReflections, type RoomAcoustics } from "./roomAcoustics";
import type { LandmarkId } from "../worldbuilding/landmarks";

let context: AudioContext | null = null;
let master: GainNode | null = null;
let reflections: ReturnType<typeof createRoomReflections> | null = null;
let roomAcoustics: RoomAcoustics | null = null;
let muted = false;
/**
 * How loud, 0 to 1, on top of the mute.
 *
 * The master gain was the literal 0.35 in three places - the one place it
 * is set up and the two ends of the mute - so a volume slider had three
 * owners before it had one. `masterGain()` is that one owner now.
 */
let volume = 0.8;
/** The mix's own ceiling, which the player's volume scales. */
const MIX_CEILING = 0.44;
const masterGain = (): number => (muted ? 0 : MIX_CEILING * volume);

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
    master.gain.value = masterGain();
    master.connect(context.destination);
    reflections = createRoomReflections(context, master);
    reflections.configure(roomAcoustics);
  }
  if (context.state === "suspended") void context.resume();
  return context;
}

/**
 * Where a sound is, from -1 hard left to +1 hard right.
 *
 * The one thing a first-person camera cannot show is what is behind you,
 * and in a game whose only verb against the Warden is evasion, "it is near"
 * is half the sentence. A cue with a side to it says which door not to take.
 * Only the cues that come from somewhere are panned; the ones that are
 * about the player - a footstep, a gem, a potion - stay in the middle,
 * because a sound with no source that wanders across the stereo field is
 * just a sound that seems broken.
 */
function envelope(
  ctx: AudioContext,
  node: AudioNode,
  attack: number,
  decay: number,
  peak: number,
  pan = 0,
  reflect = false
) {
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
  node.connect(gain);
  if (reflect && reflections) gain.connect(reflections.input);
  if (pan === 0 || !ctx.createStereoPanner) {
    gain.connect(master!);
    return;
  }
  const panner = ctx.createStereoPanner();
  // Never fully to one side: a cue that vanishes from one ear reads as a
  // dropout rather than as a direction.
  panner.pan.value = Math.max(-0.85, Math.min(0.85, pan));
  gain.connect(panner);
  panner.connect(master!);
}

function tone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  peak = 0.6,
  sweepTo?: number,
  pan = 0,
  reflect = false
) {
  const ctx = ensureContext();
  if (!ctx || muted || !master) return;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  if (sweepTo !== undefined) {
    /**
     * Never to zero or below.
     *
     * `exponentialRampToValueAtTime` throws on a target of zero or a
     * negative one, and this argument sits in the position a reader
     * reasonably expects a pan in - the cue above it takes one, and half
     * the cues in this file end with a number between -1 and 1. Two new
     * cues were written with a pan there and both threw, which in a bus
     * that dispatches to a set of handlers took every listener after the
     * audio one down with them. A frequency floor an octave below the
     * lowest note here costs nothing and turns a crash into a cue that
     * sweeps somewhere slightly wrong.
     */
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, sweepTo),
      ctx.currentTime + duration
    );
  }
  envelope(ctx, osc, 0.008, duration, peak, pan, reflect);
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

function noiseBurst(duration: number, peak = 0.4, filterHz = 1800, pan = 0, reflect = false) {
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
  envelope(ctx, filter, 0.005, duration, peak, pan, reflect);
  source.start(ctx.currentTime, offset, duration + 0.1);
  source.stop(ctx.currentTime + duration + 0.1);
}

const later = (ms: number, fn: () => void) => window.setTimeout(fn, ms);

/** When the last chitter played, for the throttle in `sfx.skitter`. */
let lastSkitter = 0;
/** And the last patter of feet, for `sfx.scurry`: its own clock, see there. */
let lastScurry = 0;

/**
 * A creature's held sound: built once, written in place every frame,
 * stopped when the creature goes.
 *
 * The Warden's stalk was the only one of these, and the only creature
 * with a continuous voice. The others - a roost wheeling round the ceiling
 * for five seconds, the Harrier flying at you, the moth at your lantern,
 * the wisp ahead of you - all moved in silence, which is a problem in a
 * first-person game whose threats come from behind: the bats could be up
 * and the Harrier could be halfway across the room with nothing to say
 * so. The registry is what makes a second held voice cheap to add: each
 * is a builder that wires a few nodes into a level and a panner, and the
 * two per-frame writes the whole game makes to it go through `heldSet`.
 *
 * The three things a frame can write besides level and side: the filter
 * (how open it is), the tremolo's rate (how fast the wings beat) and a
 * pitch (how far the Sentry has got). A voice leaves null what it has
 * none of.
 */
interface Held {
  gain: GainNode;
  panner: StereoPannerNode;
  filter: BiquadFilterNode | null;
  lfo: OscillatorNode | null;
  pitch: OscillatorNode | null;
  sources: AudioScheduledSourceNode[];
}

type HeldParts = Omit<Held, "gain" | "panner">;
type HeldBuilder = (ctx: AudioContext, into: GainNode) => HeldParts;

/** What a frame writes to a held voice. Only the level is required. */
interface HeldWrite {
  level: number;
  filterHz?: number;
  lfoHz?: number;
  pitchHz?: number;
}

const held = new Map<string, Held>();

/** Loop the shared noise through a filter and a tremolo, into the level. */
function heldNoise(
  ctx: AudioContext,
  into: AudioNode,
  filterType: BiquadFilterType,
  filterHz: number,
  filterQ: number,
  tremoloHz: number | null
): { filter: BiquadFilterNode; source: AudioBufferSourceNode; lfo: OscillatorNode | null } {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterHz;
  filter.Q.value = filterQ;
  let lfo: OscillatorNode | null = null;
  if (tremoloHz !== null) {
    // The beat: a gain the LFO swings, sitting between the filter and the
    // level. The swing stops just short of the gain's own value, because
    // a beat deeper than that goes negative, which inverts phase and
    // audibly fills in the gap the beat is meant to leave.
    const beat = ctx.createGain();
    beat.gain.value = 0.5;
    lfo = ctx.createOscillator();
    lfo.frequency.value = tremoloHz;
    const depth = ctx.createGain();
    depth.gain.value = 0.45;
    lfo.connect(depth).connect(beat.gain);
    source.connect(filter).connect(beat).connect(into);
    lfo.start();
  } else {
    source.connect(filter).connect(into);
  }
  source.start();
  return { filter, source, lfo };
}

function heldStart(ctx: AudioContext, build: HeldBuilder): Held {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const panner = ctx.createStereoPanner();
  const parts = build(ctx, gain);
  gain.connect(panner);
  panner.connect(master!);
  return { gain, panner, ...parts };
}

/**
 * Write a held voice's level and side, starting it if it is not running.
 * Silent at nought, which is also how a creature that has gone stops it
 * without knowing whether it was ever heard.
 */
function heldSet(name: string, build: HeldBuilder, closeness: number, pan: number, write: HeldWrite) {
  const ctx = ensureContext();
  if (!ctx || !master) return;
  if (closeness <= 0) {
    heldStop(name);
    return;
  }
  let voice = held.get(name);
  if (!voice) {
    voice = heldStart(ctx, build);
    held.set(name, voice);
  }
  voice.gain.gain.value = write.level;
  voice.panner.pan.value = Math.max(-0.85, Math.min(0.85, pan));
  if (write.filterHz !== undefined && voice.filter) voice.filter.frequency.value = write.filterHz;
  if (write.lfoHz !== undefined && voice.lfo) voice.lfo.frequency.value = write.lfoHz;
  if (write.pitchHz !== undefined && voice.pitch) voice.pitch.frequency.value = write.pitchHz;
}

function heldStop(name: string) {
  const voice = held.get(name);
  if (!voice) return;
  held.delete(name);
  voice.gain.gain.value = 0;
  for (const source of voice.sources) {
    try {
      source.stop();
    } catch {
      // Already stopped: nothing to undo.
    }
  }
  voice.panner.disconnect();
}

/**
 * The Warden crossing the room you are standing in.
 *
 * Every other cue was a one-shot, which was fine while the Warden was a
 * thing that arrived: one knock through a wall, one note when it came in,
 * and then it closed the distance in silence behind a vignette that said
 * "close" without saying where. That is the one moment a player most needs
 * to hear it - around which pillar, on which side - so this is a held
 * sound rather than an event, and its side and weight are written every
 * frame from where the thing actually is.
 *
 * Built once and updated in place. A cue restarted sixty times a second
 * would allocate an oscillator, a gain and a panner per frame, which is
 * precisely the shape of the stutters this project has already had; three
 * AudioParam writes cost nothing and the performance check watches for the
 * difference.
 */
const buildStalk: HeldBuilder = (ctx, into) => {
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 300;

  // A sub that is felt more than heard, and a breath of noise over it.
  const sub = ctx.createOscillator();
  sub.type = "sine";
  sub.frequency.value = 46;
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer(ctx);
  noiseSource.loop = true;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.35;
  noiseSource.connect(noiseGain).connect(filter);
  sub.connect(filter);

  // A slow swell, so it reads as something breathing rather than a tone
  // somebody left on. Set once: the oscillator does the work, not the loop.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.85;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0.4;
  lfo.connect(lfoDepth).connect(into.gain);

  filter.connect(into);
  sub.start();
  noiseSource.start();
  lfo.start();
  return { filter, lfo: null, pitch: null, sources: [sub, noiseSource, lfo] };
};

/**
 * The Reaper: the same shape as the Warden's stalk and nothing like the
 * same sound. Pale where the Warden is dark, so a cold, high, beating
 * pair of tones and a thin hiss rather than a sub and a breath - the two
 * can be in a room together and a player who cannot see either should
 * still be able to count them.
 */
const buildReap: HeldBuilder = (ctx, into) => {
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1800;
  filter.Q.value = 1.2;
  const a = ctx.createOscillator();
  a.type = "sine";
  a.frequency.value = 220;
  const b = ctx.createOscillator();
  b.type = "sine";
  // Three hertz off: the beat between them is the pulse.
  b.frequency.value = 223;
  const pair = ctx.createGain();
  pair.gain.value = 0.35;
  a.connect(pair);
  b.connect(pair);
  pair.connect(into);
  const hiss = ctx.createBufferSource();
  hiss.buffer = noiseBuffer(ctx);
  hiss.loop = true;
  const hissGain = ctx.createGain();
  hissGain.gain.value = 0.25;
  hiss.connect(filter).connect(hissGain).connect(into);
  a.start();
  b.start();
  hiss.start();
  return { filter, lfo: null, pitch: null, sources: [a, b, hiss] };
};

/**
 * The roost, up: a lot of small leathery wings, fast, and squeaks over
 * them. The beat is a tremolo on band-passed noise at about eleven a
 * second, which is what a flock of small things sounds like from below;
 * the squeak is a high sine warbled by a second oscillator.
 */
const buildFlock: HeldBuilder = (ctx, into) => {
  const wings = heldNoise(ctx, into, "bandpass", 2400, 0.8, 11);
  const squeak = ctx.createOscillator();
  squeak.type = "sine";
  squeak.frequency.value = 3300;
  const warble = ctx.createOscillator();
  warble.frequency.value = 6.5;
  const warbleDepth = ctx.createGain();
  warbleDepth.gain.value = 420;
  warble.connect(warbleDepth).connect(squeak.frequency);
  const squeakGain = ctx.createGain();
  squeakGain.gain.value = 0.05;
  squeak.connect(squeakGain).connect(into);
  squeak.start();
  warble.start();
  return { filter: wings.filter, lfo: wings.lfo, pitch: null, sources: [wings.source, wings.lfo!, squeak, warble] };
};

/**
 * The Harrier in the air: one big pair of wings, slow and heavy, and a
 * low rush of air under them. The beat quickens as it dives - the same
 * number its nose tips by - so the sound of it coming is the tell, and a
 * player facing the wrong way still gets it.
 */
const buildWingbeat: HeldBuilder = (ctx, into) => {
  const wings = heldNoise(ctx, into, "lowpass", 900, 0.7, 4.5);
  const rush = ctx.createOscillator();
  rush.type = "sawtooth";
  rush.frequency.value = 90;
  const rushFilter = ctx.createBiquadFilter();
  rushFilter.type = "lowpass";
  rushFilter.frequency.value = 260;
  const rushGain = ctx.createGain();
  rushGain.gain.value = 0.16;
  rush.connect(rushFilter).connect(rushGain).connect(into);
  rush.start();
  return { filter: wings.filter, lfo: wings.lfo, pitch: null, sources: [wings.source, wings.lfo!, rush] };
};

/** The moth at your lantern: the smallest wings on the floor, very fast, very quiet. */
const buildFlutter: HeldBuilder = (ctx, into) => {
  const wings = heldNoise(ctx, into, "bandpass", 3600, 0.9, 24);
  return { filter: wings.filter, lfo: wings.lfo, pitch: null, sources: [wings.source, wings.lfo!] };
};

/**
 * The wisp: a soft chord with a shimmer on it. A helper, so it is the one
 * creature voice with nothing frightening in it - and it is also the
 * reason the Warden knows where you are, so it is not silent either.
 */
const buildWispHum: HeldBuilder = (ctx, into) => {
  const root = ctx.createOscillator();
  root.type = "triangle";
  root.frequency.value = 528;
  const fifth = ctx.createOscillator();
  fifth.type = "sine";
  fifth.frequency.value = 792;
  const shimmer = ctx.createOscillator();
  shimmer.frequency.value = 5.5;
  const shimmerDepth = ctx.createGain();
  shimmerDepth.gain.value = 7;
  shimmer.connect(shimmerDepth).connect(root.frequency);
  shimmer.connect(shimmerDepth).connect(fifth.frequency);
  const chord = ctx.createGain();
  chord.gain.value = 0.5;
  root.connect(chord);
  fifth.connect(chord);
  chord.connect(into);
  root.start();
  fifth.start();
  shimmer.start();
  return { filter: null, lfo: null, pitch: null, sources: [root, fifth, shimmer] };
};

/**
 * The Sentry's beam on you: a thin whine that climbs as it acquires.
 * Silent until the light touches you, so it never says where the post is
 * before the wedge on the floor does - it says how long you have left.
 */
const buildBeam: HeldBuilder = (ctx, into) => {
  const whine = ctx.createOscillator();
  whine.type = "sine";
  whine.frequency.value = 1200;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 900;
  whine.connect(filter).connect(into);
  whine.start();
  return { filter, lfo: null, pitch: whine, sources: [whine] };
};

/**
 * The cistern's toads: a low pulsing croak, three of them out of step, on
 * a slow tremolo each. A chorus rather than a call, because the tell is
 * the chorus stopping.
 */
const buildChorus: HeldBuilder = (ctx, into) => {
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 520;
  const sources: AudioScheduledSourceNode[] = [];
  [92, 104, 118].forEach((hz, i) => {
    const croak = ctx.createOscillator();
    croak.type = "sawtooth";
    croak.frequency.value = hz;
    const voice = ctx.createGain();
    voice.gain.value = 0.22;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 1.1 + i * 0.37;
    const depth = ctx.createGain();
    depth.gain.value = 0.2;
    lfo.connect(depth).connect(voice.gain);
    croak.connect(voice).connect(filter);
    croak.start();
    lfo.start();
    sources.push(croak, lfo);
  });
  filter.connect(into);
  return { filter, lfo: null, pitch: null, sources };
};

/**
 * What a room sounds like when nothing is happening in it.
 *
 * One per biome, from `rooms/biomes.ts`, and the biome names it: a room
 * cannot be given a look without being given a sound. Under the bed and
 * under every cue, so a cue is never fighting the room it is in. Two
 * shapes: a held voice, or a timer that drops a small sound now and then
 * - a drip, an ember - because a drip on an oscillator is a tremolo, and a
 * tremolo is not a drip.
 */
type AirId = "still" | "drip" | "wind" | "ember" | "creak" | "hum" | "hollow" | "spore" | "sift";

interface Air {
  id: AirId;
  voice: Held | null;
  timer: number | null;
}

let air: Air | null = null;

const buildCurrent: HeldBuilder = (ctx, into) => {
  const stream = heldNoise(ctx, into, "bandpass", 1400, 0.7, null);
  const ripple = ctx.createOscillator(), depth = ctx.createGain();
  ripple.frequency.value = 0.8; depth.gain.value = 180;
  ripple.connect(depth).connect(stream.filter.frequency);
  ripple.start();
  return { filter: stream.filter, lfo: null, pitch: null, sources: [stream.source, ripple] };
};

/** A held voice for the airs that are continuous. Null for the ones that are not. */
const AIR_VOICES: Partial<Record<AirId, { build: HeldBuilder; level: number }>> = {
  wind: {
    level: 0.34,
    build: (ctx, into) => {
      const wings = heldNoise(ctx, into, "lowpass", 420, 0.6, null);
      // The filter wanders slowly: air moving somewhere.
      const wander = ctx.createOscillator();
      wander.frequency.value = 0.13;
      const depth = ctx.createGain();
      depth.gain.value = 220;
      wander.connect(depth).connect(wings.filter.frequency);
      wander.start();
      return { filter: wings.filter, lfo: null, pitch: null, sources: [wings.source, wander] };
    },
  },
  hollow: {
    level: 0.36,
    build: (ctx, into) => {
      // A resonance rather than a breath: the catacomb's own note.
      const wings = heldNoise(ctx, into, "bandpass", 640, 6, null);
      const wander = ctx.createOscillator();
      wander.frequency.value = 0.09;
      const depth = ctx.createGain();
      depth.gain.value = 60;
      wander.connect(depth).connect(wings.filter.frequency);
      wander.start();
      return { filter: wings.filter, lfo: null, pitch: null, sources: [wings.source, wander] };
    },
  },
  hum: {
    level: 0.2,
    build: (ctx, into) => {
      const a = ctx.createOscillator();
      a.type = "sine";
      a.frequency.value = 330;
      const b = ctx.createOscillator();
      b.type = "sine";
      b.frequency.value = 331.5;
      const pair = ctx.createGain();
      pair.gain.value = 0.5;
      a.connect(pair);
      b.connect(pair);
      pair.connect(into);
      a.start();
      b.start();
      return { filter: null, lfo: null, pitch: null, sources: [a, b] };
    },
  },
  ember: {
    level: 0.12,
    build: (ctx, into) => {
      // The warmth under the crackle, which the timer supplies.
      const glow = ctx.createOscillator();
      glow.type = "sine";
      glow.frequency.value = 66;
      const glowGain = ctx.createGain();
      glowGain.gain.value = 0.6;
      glow.connect(glowGain).connect(into);
      glow.start();
      return { filter: null, lfo: null, pitch: null, sources: [glow] };
    },
  },
};

/** The intermittent airs: what to drop, and how long between drops. */
const AIR_DROPS: Partial<Record<AirId, { play: () => void; gapMs: [number, number] }>> = {
  drip: {
    gapMs: [700, 2400],
    play: () => tone(1500 + Math.random() * 900, 0.09, "sine", 0.22, 900, Math.random() * 1.2 - 0.6),
  },
  ember: {
    gapMs: [90, 420],
    play: () => noiseBurst(0.025, 0.22, 5200 + Math.random() * 2000, Math.random() * 0.8 - 0.4),
  },
  creak: {
    gapMs: [2600, 6800],
    play: () => tone(120 + Math.random() * 60, 0.32, "sawtooth", 0.24, 84, Math.random() * 1.2 - 0.6),
  },
  spore: {
    gapMs: [180, 620],
    play: () => tone(4200 + Math.random() * 2600, 0.05, "sine", 0.22, 3000, Math.random() * 1.4 - 0.7),
  },
  sift: {
    gapMs: [350, 1200],
    play: () => noiseBurst(0.045, 0.26, 2400 + Math.random() * 1800, Math.random() * 1.4 - 0.7),
  },
};

function stopAir(): void {
  if (!air) return;
  const going = air;
  air = null;
  if (going.timer !== null) window.clearTimeout(going.timer);
  if (going.voice && context) {
    // Out over a second rather than cut: a room changing sound on a door
    // is a place; a room that goes silent on a frame is a bug.
    const g = going.voice.gain.gain;
    g.cancelScheduledValues(context.currentTime);
    g.setValueAtTime(Math.max(g.value, 0.0001), context.currentTime);
    g.exponentialRampToValueAtTime(0.0001, context.currentTime + 1);
    const voice = going.voice;
    later(1100, () => {
      for (const s of voice.sources) {
        try {
          s.stop();
        } catch {
          // Already stopped.
        }
      }
      voice.panner.disconnect();
    });
  }
}


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
  setRoomAcoustics(profile: RoomAcoustics | null) {
    roomAcoustics = profile;
    reflections?.configure(profile);
  },
  roomAcoustics: () => roomAcoustics,
  /** Running water is infrastructure, independent of a room's native air. */
  setCurrent(level: number, pan = 0) {
    const amount = Math.max(0, Math.min(1, level));
    heldSet("water-current", buildCurrent, amount, pan, { level: amount * 0.28, filterHz: 650 + amount * 1000 });
  },
  stopCurrent() { heldStop("water-current"); },
  currentLevel: () => held.get("water-current")?.gain.gain.value ?? 0,
  /**
   * How roused the floor is, 0 to 1. The bed tightens with it: the drone
   * comes up and the air moves faster, so a floor being emptied of gems is
   * audibly a worse place to be standing.
   */
  setTension(rouse: number, air = 1, resonance = 0) {
    if (!bed || !context) return;
    const at = context.currentTime + 0.6;
    // These numbers are the ones that were here, and they are right:
    // measured in the 420-900Hz band, where the low-pass opening is the
    // whole of the difference, a roused floor puts 2.4 times the energy
    // there. They were nearly changed on the strength of a measurement that
    // was talking to a second copy of this module and therefore to a bed
    // that had never been started - the replacement tuning measured
    // slightly worse once the check was fixed.
    bed.gain.gain.linearRampToValueAtTime(0.11 + rouse * 0.1, at);
    bed.filter.frequency.linearRampToValueAtTime((320 + rouse * 420) * air, at);
    bed.fifth.frequency.linearRampToValueAtTime(82.4 + rouse * 6 + resonance, at);
  },
  /**
   * The room's own air, by biome. The same id again is a no-op, so a
   * player crossing between two flooded rooms hears one cistern.
   */
  setAir(id: AirId | null) {
    if (air?.id === id) return;
    stopAir();
    if (id === null || id === "still") return;
    const ctx = ensureContext();
    if (!ctx || !master) return;
    const next: Air = { id, voice: null, timer: null };
    const held = AIR_VOICES[id];
    if (held) {
      next.voice = heldStart(ctx, held.build);
      next.voice.gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      next.voice.gain.gain.exponentialRampToValueAtTime(held.level, ctx.currentTime + 1.5);
    }
    const drops = AIR_DROPS[id];
    if (drops) {
      const drop = () => {
        if (air !== next || muted) {
          if (air === next) next.timer = later(drops.gapMs[0], drop);
          return;
        }
        drops.play();
        next.timer = later(drops.gapMs[0] + Math.random() * (drops.gapMs[1] - drops.gapMs[0]), drop);
      };
      // The first one at once, so a room has its sound on the frame it is entered.
      next.timer = later(0, drop);
    }
    air = next;
  },
  /** Which air is running, for the checks. */
  airId: (): AirId | null => air?.id ?? null,
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
    stopAir();
    heldStop("water-current");
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
  /** A short material signature when a district's navigation anchor is entered. */
  landmark(id: LandmarkId = "rootwell") {
    if (id === "rootwell") {
      noiseBurst(0.24, 0.12, 520);
      tone(86, 0.42, "triangle", 0.1, 63);
    } else if (id === "hoist") {
      noiseBurst(0.13, 0.15, 1450);
      tone(132, 0.28, "square", 0.1, 88);
      later(95, () => tone(176, 0.16, "square", 0.07, 112));
    } else {
      tone(294, 0.42, "triangle", 0.11, 220);
      later(110, () => tone(440, 0.5, "triangle", 0.08, 330));
    }
  },
  /** A restrained continuation of the landmark signature at each learned route step. */
  secretTrail(id: LandmarkId = "rootwell", final = false) {
    const gain = final ? 0.13 : 0.095;
    if (id === "rootwell") {
      noiseBurst(0.08, gain, 680);
      tone(final ? 126 : 104, 0.2, "triangle", gain, 76);
    } else if (id === "hoist") {
      tone(final ? 196 : 154, 0.11, "square", gain, 112);
      later(65, () => noiseBurst(0.055, gain * 0.8, 1320));
    } else {
      tone(final ? 440 : 349, 0.24, "triangle", gain, 270);
      if (final) later(80, () => tone(523, 0.28, "triangle", gain * 0.72, 390));
    }
  },
  beetleScatter(pan = 0) {
    noiseBurst(0.14, 0.14, 2100, pan);
    tone(690, 0.12, "triangle", 0.14, 420, pan);
  },
  bellcapWarning(pan = 0) {
    tone(310, 0.45, "triangle", 0.09, 470, pan);
  },
  bellcapBurst(pan = 0) {
    noiseBurst(0.5, 0.22, 1100, pan);
    tone(170, 0.17, "triangle", 0.14, 75, pan);
  },
  /** A heavy wheel ratchets, then water pulls through a stone throat. */
  sluice() {
    tone(92, 0.6, "sawtooth", 0.14, 48);
    [0, 140, 310, 510].forEach(ms => later(ms, () => {
      noiseBurst(0.09, 0.12, 740); tone(180, 0.11, "square", 0.07, 105);
    }));
    later(620, () => noiseBurst(1.3, 0.22, 430));
  },
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
  /**
   * A footstep, and the most frequent sound in the game.
   *
   * It used to peak at 1.2 times the ambient bed, which is to say a walking
   * player could not hear themselves walk: the bed runs under everything at
   * about 0.029 and a walking step measured 0.035. Nobody noticed because
   * nothing had ever measured a cue against the room it plays into. It sits
   * at about twice the bed now - still the quietest thing the game plays on
   * purpose, which is right for a sound that happens every stride, but
   * present.
   */
  step(strong: boolean, running = false, surface: import("../rooms/underfoot").Footing = "stone") {
    const scuff = (duration: number, peak: number, filter: number) => noiseBurst(duration, peak, filter, 0, true);
    const body = (frequency: number, duration: number, type: OscillatorType, peak: number, sweep: number) =>
      tone(frequency, duration, type, peak, sweep, 0, true);
    const wobble = 0.85 + Math.random() * 0.4;
    // A run is heard by the Warden, so it had better be heard by the player
    // too: the same footstep, harder and with more body under it.
    const loud = running ? 1.7 : 1;
    if (surface === "water") {
      scuff(0.14, (strong ? 0.22 : 0.15) * loud, 1250 * wobble);
      body(170 * wobble, 0.1, "sine", 0.12 * loud, 80);
      return;
    }
    if (surface === "soft") {
      scuff(0.11, (strong ? 0.3 : 0.22) * loud, 240 * wobble);
      body(60 * wobble, 0.07, "sine", (strong ? 0.2 : 0.14) * loud, 42);
      return;
    }
    if (surface === "wood") {
      scuff(0.07, (strong ? 0.26 : 0.19) * loud, 560 * wobble);
      body(155 * wobble, 0.09, "triangle", (strong ? 0.19 : 0.13) * loud, 90);
      return;
    }
    if (surface === "metal") {
      scuff(0.06, (strong ? 0.22 : 0.16) * loud, 1600 * wobble);
      body(420 * wobble, 0.14, "triangle", (strong ? 0.16 : 0.11) * loud, 260);
      return;
    }
    scuff((strong ? 0.085 : 0.07) * loud, (strong ? 0.28 : 0.2) * loud, 420 * wobble);
    body(70 * wobble, 0.06, "sine", (strong ? 0.24 : 0.16) * loud, 48 * wobble);
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
  /** Something thrown, landing a long way off in the dark. */
  /**
   * A thrown scroll landing. Its whole job is to say the noise happened
   * over there, so it was the wrong cue to have sitting at not quite twice
   * the room tone.
   */
  clatter() {
    noiseBurst(0.12, 0.22, 2400);
    later(140, () => noiseBurst(0.16, 0.15, 1500));
    later(300, () => tone(120, 0.5, "sine", 0.2, 70));
  },
  /**
   * A Sentry calling out: two notes climbing, and something hears it.
   *
   * Measured at less than half the loudness of picking up a gem, which is
   * the wrong way round by some distance: taking a gem is a thing you chose
   * to do and being seen is a thing that happens to you and changes the
   * rest of the floor. It is the loudest cue in the game bar taking a hit
   * now.
   */
  spotted(pan = 0) {
    tone(440, 0.16, "square", 0.55, undefined, pan);
    later(120, () => tone(660, 0.3, "square", 0.5, undefined, pan));
    later(260, () => tone(880, 0.45, "sawtooth", 0.2, undefined, pan));
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
  /** The Warden heard through a wall: a slow knock, no pitch to speak of. */
  /**
   * It has stepped into a room next door. `pan` is which side that room is
   * on from where the player is looking, which is the whole value of the
   * cue: a footfall through a wall you cannot place is only a jump scare.
   */
  /**
   * A bark: the creature saying, out loud, which rung it is on.
   *
   * This is the whole legibility half of the awareness ladder, and it is
   * not decoration. A range of internal states is meaningless if the
   * player cannot perceive it, and the game this is transplanted from
   * resolved that entirely through barks - sound was the primary medium
   * through which the AIs communicated both their location and their
   * internal state.
   *
   * Rising and falling are different sounds because they are different
   * news. Going up is a short sharp intake, higher the further up it
   * went; coming down is a longer, lower, falling note, so a player who
   * hears one behind them knows without turning round whether to keep
   * moving or to keep still.
   */
  bark(rung: number, rose: boolean, pan = 0) {
    if (rung <= 0 && rose) return;
    const base = 150 + rung * 55;
    if (rose) {
      tone(base, 0.16, "triangle", 0.3, 900, pan);
      later(70, () => tone(base * 1.25, 0.12, "sine", 0.2, 1100, pan));
    } else {
      tone(base * 0.8, 0.42, "sine", 0.22, 620, pan);
      later(150, () => tone(base * 0.6, 0.5, "sine", 0.16, 480, pan));
    }
  },
  wardenNear(pan = 0) {
    tone(58, 0.5, "sine", 0.45, 42, pan);
    noiseBurst(0.3, 0.1, 260, pan);
  },
  /** The Warden walking into your room. */
  wardenHere() {
    tone(88, 0.9, "sawtooth", 0.35, 44);
    later(120, () => tone(132, 0.7, "sine", 0.25, 66));
    noiseBurst(0.6, 0.2, 500);
  },
  /**
   * It has you: the heaviest sound in the game, and until now there was no
   * sound at all.
   *
   * `wardenStruck` has been emitted since the Warden could land a hit and
   * nothing anywhere listened to it, so being caught by the thing the whole
   * floor is built around was presented exactly like walking into spikes -
   * the same `hurt`, the same flash, the same shake. This plays over that
   * rather than instead of it: the hit is still a hit, and this is what hit
   * you. Lower and longer than anything else, because it is the one event
   * in a run that a player should feel in their chest.
   */
  /**
   * The floor's spikes finding it: metal, then a long broken-off snarl.
   *
   * Deliberately not `hurt`. That cue means "you were hit", and this is the
   * one moment in a run when something else was, so it has to be legible as
   * a different thing happening or the player reads the window they just
   * bought as damage they just took.
   */
  /**
   * The Cutpurse moving: a dry chitter, repeated while it is in the room.
   *
   * Not a held node like `stalk`. The Warden's sound is a presence and has
   * to swell continuously; this one is a small animal, and small animals
   * make a series of noises rather than one long one. A throttled one-shot
   * is also the cheap option, and the thing making it is in the room for
   * six seconds at a time.
   *
   * The throttle is here rather than at the call site because the call
   * site is a frame loop and a rate limit kept in a component is a rate
   * limit that resets every time the component remounts.
   */
  skitter(closeness: number, pan = 0) {
    if (closeness <= 0) return;
    const now = performance.now();
    // Faster when it is near: the same trick a Geiger counter uses, and
    // the only cue the player gets that it is behind them.
    const gap = 260 - Math.min(1, closeness) * 140;
    if (now - lastSkitter < gap) return;
    lastSkitter = now;
    const level = 0.05 + Math.min(1, closeness) * 0.16;
    tone(1100 + Math.random() * 500, 0.035, "square", level, 700, pan);
    later(24, () => noiseBurst(0.035, level * 0.7, 5200, pan));
  },
  /** It has your gem: a snatch, and something small skittering off. */
  snatch(pan = 0) {
    tone(1400, 0.1, "sawtooth", 0.26, 620, pan);
    later(50, () => noiseBurst(0.12, 0.24, 4200, pan));
  },
  /** It got away with something: a rattle going away from you. */
  thiefFled(pan = 0) {
    tone(880, 0.16, "square", 0.2, 300, pan);
    later(90, () => tone(560, 0.3, "square", 0.16, 180, pan));
  },
  /** Caught: a squeal, and what it was holding hitting the floor. */
  thiefDropped(pan = 0) {
    tone(1500, 0.13, "sawtooth", 0.24, 380, pan);
    later(80, () => noiseBurst(0.2, 0.24, 3200, pan));
    later(170, () => tone(820, 0.22, "triangle", 0.2, 1180, pan));
  },
  /**
   * A rat on the move, while it is: a patter of small feet, throttled the
   * way `skitter` is but on its own clock, so a rat and the Cutpurse in
   * one room do not take turns. Quieter than the chitter it starts with,
   * because it is scenery running and the chitter is the tell.
   */
  scurry(closeness: number, pan = 0) {
    if (closeness <= 0) return;
    const now = performance.now();
    if (now - lastScurry < 90) return;
    lastScurry = now;
    const level = 0.22 + Math.min(1, closeness) * 0.3;
    noiseBurst(0.07, level, 5200, pan);
  },
  /** The roost, disturbed but not yet up: a dry rustle overhead, on its side. */
  batsStir(pan = 0) {
    noiseBurst(0.22, 0.34, 2800, pan);
    later(90, () => tone(2600, 0.05, "sine", 0.08, 3400, pan));
    later(160, () => noiseBurst(0.16, 0.2, 2400, pan));
  },
  /**
   * The roost going up: a burst of wings and squeaks all at once. Louder
   * than the flock that follows it, because the moment is the news and
   * the five seconds after are the cost.
   */
  batsBurst(pan = 0) {
    const flap = (at: number, hz: number) => later(at, () => noiseBurst(0.07, 0.28, hz, pan));
    flap(0, 2600);
    flap(60, 2200);
    flap(130, 2800);
    flap(210, 2400);
    later(40, () => tone(3400, 0.08, "sine", 0.12, 2200, pan));
    later(150, () => tone(3800, 0.1, "sine", 0.1, 2600, pan));
  },
  /** The toads going under, all at once: water, on the side they went in. */
  splash(pan = 0) {
    noiseBurst(0.18, 0.3, 1800, pan);
    later(40, () => tone(420, 0.12, "sine", 0.14, 180, pan));
    later(110, () => noiseBurst(0.22, 0.18, 2600, pan));
    later(160, () => tone(300, 0.16, "sine", 0.1, 140, pan));
  },
  /** The Harrier waking, somewhere on the floor: a shriek from far off. */
  harrierCry() {
    tone(1900, 0.32, "sawtooth", 0.14, 760);
    later(40, () => noiseBurst(0.3, 0.08, 1600));
  },
  /** It draws back to dive: a rising screech and the wings spread. This is the tell. */
  harrierWind(pan = 0) {
    tone(520, 0.36, "sawtooth", 0.2, 1500, pan);
    later(60, () => noiseBurst(0.3, 0.14, 1400, pan));
  },
  /** The dive landing: a rush of air and the hit. Plays over `hurt`, as the Warden's does. */
  harrierSwoop() {
    noiseBurst(0.4, 0.42, 1300);
    later(90, () => tone(240, 0.18, "square", 0.3, 90));
    later(120, () => tone(1300, 0.12, "sawtooth", 0.2, 500));
  },
  /** It wheels away: a few heavy beats going off, on its side. */
  harrierAway(pan = 0) {
    const beat = (at: number, level: number) => later(at, () => noiseBurst(0.1, level, 1400, pan));
    beat(0, 0.6);
    beat(180, 0.46);
    beat(380, 0.32);
    beat(600, 0.2);
  },
  /** Downed by a blast: it hits the floor and thrashes. */
  harrierFall(pan = 0) {
    tone(180, 0.16, "square", 0.24, 60, pan);
    later(30, () => noiseBurst(0.18, 0.28, 700, pan));
    const thrash = (at: number) => later(at, () => noiseBurst(0.06, 0.14, 1600, pan));
    thrash(260);
    thrash(340);
    thrash(450);
    thrash(520);
  },
  /** The spikes finding it: a squawk, cut off. */
  harrierDie() {
    tone(1500, 0.14, "sawtooth", 0.26, 900);
    later(90, () => noiseBurst(0.12, 0.26, 2400));
    later(140, () => tone(700, 0.08, "square", 0.18, 200));
  },
  /** The Keeper, barring the way: iron on stone, and the weight of it. */
  keeperClank() {
    tone(420, 0.08, "square", 0.22, 300);
    later(20, () => noiseBurst(0.14, 0.24, 2400));
    later(120, () => tone(64, 0.8, "sine", 0.3, 44));
  },
  /**
   * The halberd coming down: a creak of iron as the player steps into
   * reach. It has begun before the step that costs a life, and this says
   * so from behind as well as in front.
   */
  keeperSwing(pan = 0) {
    tone(320, 0.28, "sawtooth", 0.18, 140, pan);
    later(40, () => noiseBurst(0.22, 0.16, 1100, pan));
  },
  /**
   * A deed: a small rising figure, quiet enough to be heard over a chase.
   *
   * Deliberately not a fanfare. The moment a player earns "It Bleeds" they
   * are standing next to a wounded Warden with three seconds to decide
   * something, and a triumphant sting there would be the game applauding
   * over the top of its own best moment.
   */
  deed() {
    tone(660, 0.12, "triangle", 0.16);
    later(90, () => tone(880, 0.14, "triangle", 0.15));
    later(210, () => tone(1320, 0.3, "triangle", 0.12));
  },
  /** Hammering: three heavy strikes on wood, loud and slow. */
  barDoor() {
    const hit = (at: number) =>
      later(at, () => {
        tone(150, 0.14, "square", 0.32, 70);
        noiseBurst(0.16, 0.3, 900);
      });
    hit(0);
    hit(220);
    hit(470);
  },
  /** It comes through: splintering, and then it is in the doorway. */
  barBreak() {
    noiseBurst(0.3, 0.4, 2200);
    later(90, () => tone(110, 0.5, "sawtooth", 0.36, 55));
    later(260, () => noiseBurst(0.35, 0.3, 700));
  },
  /** The player lifts their own: wood on stone, and nothing else. */
  barLift() {
    tone(220, 0.1, "triangle", 0.16, 150);
    later(80, () => noiseBurst(0.14, 0.14, 1200));
  },
  /** A shutter opening or closing on a lamp: metal, short, two-part. */
  lantern(up: boolean) {
    tone(up ? 420 : 300, 0.06, "square", 0.14, up ? 620 : 210);
    later(45, () => noiseBurst(0.06, 0.12, up ? 3400 : 1800));
  },
  /** The last of the oil: a small failing sputter, and then nothing. */
  lanternOut() {
    tone(300, 0.2, "triangle", 0.16, 120);
    later(120, () => noiseBurst(0.3, 0.14, 900));
  },
  /** Filled from a brazier: oil catching. */
  lanternFilled() {
    noiseBurst(0.35, 0.16, 1400);
    later(120, () => tone(360, 0.28, "triangle", 0.16, 540));
  },
  /**
   * A gem given at the shrine: the coin going in, then the water settling
   * and the floor letting go. Low and long rather than bright, because
   * what it buys is quiet.
   */
  shrineKept() {
    tone(520, 0.1, "sine", 0.16, 700);
    later(110, () => noiseBurst(0.5, 0.1, 700));
    later(260, () => tone(196, 0.9, "sine", 0.2, 150));
    later(300, () => tone(147, 1.1, "sine", 0.14, 110));
  },
  /** Something small set on stone: a scrape and a click. */
  /** A draft from a cracked wall: a long, low breath of air. */
  draft() {
    noiseBurst(1.1, 0.07, 420);
  },
  /**
   * What is behind a thin wall, faintly: coins, a chime, or water. Quiet
   * enough to be missed from the middle of the room, which is the point.
   */
  throughWall(flavour: "hoard" | "reliquary" | "shrine") {
    if (flavour === "hoard") {
      tone(1240, 0.06, "square", 0.05, 900);
      later(110, () => tone(1480, 0.05, "square", 0.04, 1100));
    } else if (flavour === "reliquary") {
      tone(880, 0.5, "sine", 0.05, 860);
    } else {
      noiseBurst(0.05, 0.06, 2600);
      later(140, () => tone(520, 0.12, "sine", 0.04, 330));
    }
  },
  setDown() {
    noiseBurst(0.09, 0.16, 1400);
    later(60, () => tone(320, 0.07, "square", 0.14, 260));
  },
  wardenWound() {
    tone(660, 0.09, "square", 0.22, 880);
    later(30, () => noiseBurst(0.18, 0.3, 2600));
    later(90, () => tone(126, 0.7, "sawtooth", 0.34, 74));
  },
  /** It gives up on the room: the snarl falls away rather than stopping. */
  wardenRout() {
    tone(150, 1.1, "sawtooth", 0.4, 60);
    later(60, () => tone(98, 1.4, "square", 0.26, 44));
    later(240, () => noiseBurst(0.5, 0.3, 700));
  },
  /** A bomb going off. The loudest thing in the game, and meant to be. */
  boom() {
    tone(48, 1.6, "sawtooth", 0.7, 0);
    later(20, () => noiseBurst(0.9, 0.9, 220));
    later(90, () => tone(36, 1.2, "square", 0.4, 0));
  },
  wardenStrike() {
    tone(55, 1.2, "sawtooth", 0.5, 30);
    later(70, () => tone(82.4, 0.9, "square", 0.32, 48));
    later(40, () => noiseBurst(0.55, 0.45, 320));
  },
  /**
   * How close it is (0 far, 1 on top of you) and which side it is on.
   * Called every frame while it is in the room; silent at zero.
   */
  stalk(closeness: number, pan: number) {
    const level = Math.min(1, Math.max(0, closeness));
    // The LFO swings around this, so the ceiling leaves room for it.
    heldSet("stalk", buildStalk, closeness, pan, { level: 0.06 + level * 0.5, filterHz: 220 + level * 520 });
  },
  stalkStop() {
    heldStop("stalk");
  },
  /** The Reaper, in the room. Same contract as `stalk`. */
  reap(closeness: number, pan: number) {
    const level = Math.min(1, Math.max(0, closeness));
    heldSet("reap", buildReap, closeness, pan, { level: 0.05 + level * 0.3, filterHz: 1200 + level * 2200 });
  },
  reapStop() {
    heldStop("reap");
  },
  /**
   * The roost in the air, while it is. Loud enough anywhere in the room
   * to be missed by nobody, and louder under it: five seconds of this is
   * the cost of a dash beneath a roost, and until now the cost was
   * silent.
   */
  flock(closeness: number, pan: number) {
    const level = Math.min(1, Math.max(0, closeness));
    heldSet("flock", buildFlock, closeness, pan, { level: 0.08 + level * 0.22, filterHz: 2000 + level * 1200, lfoHz: 9 + level * 4 });
  },
  flockStop() {
    heldStop("flock");
  },
  /** The toads, while they sing: louder the more of them are up and the nearer they are. */
  chorus(closeness: number, pan: number) {
    const level = Math.min(1, Math.max(0, closeness));
    heldSet("chorus", buildChorus, closeness, pan, { level: 0.05 + level * 0.16, filterHz: 380 + level * 320 });
  },
  chorusStop() {
    heldStop("chorus");
  },
  /**
   * The Harrier flying, from how near it is and how far into its dive.
   * The dive quickens the beat and opens the filter, so the same sound
   * says "in the room" and "on you now".
   */
  wingbeat(closeness: number, pan: number, dive = 0) {
    const level = Math.min(1, Math.max(0, closeness));
    const d = Math.min(1, Math.max(0, dive));
    heldSet("wingbeat", buildWingbeat, closeness, pan, {
      level: 0.08 + level * 0.3,
      filterHz: 700 + level * 900 + d * 1200,
      lfoHz: 4 + d * 5,
    });
  },
  wingbeatStop() {
    heldStop("wingbeat");
  },
  /** The moth at the lantern: barely there, which is the size of it. */
  flutter(closeness: number, pan: number) {
    const level = Math.min(1, Math.max(0, closeness));
    heldSet("flutter", buildFlutter, closeness, pan, { level: 0.1 + level * 0.2 });
  },
  flutterStop() {
    heldStop("flutter");
  },
  /** The wisp, ahead of you: a hum that is louder the nearer it waits. */
  wispHum(closeness: number, pan: number) {
    const level = Math.min(1, Math.max(0, closeness));
    heldSet("wisp", buildWispHum, closeness, pan, { level: 0.03 + level * 0.1 });
  },
  wispHumStop() {
    heldStop("wisp");
  },
  /**
   * The Sentry's light on you, from nought to its patience. The whine
   * climbs an octave over the span, so the call is heard coming.
   */
  beam(acquire: number, pan: number) {
    const level = Math.min(1, Math.max(0, acquire));
    heldSet("beam", buildBeam, acquire, pan, { level: 0.03 + level * 0.12, pitchHz: 1200 + level * 1200 });
  },
  beamStop() {
    heldStop("beam");
  },
  setMuted(next: boolean) {
    muted = next;
    if (master) master.gain.value = masterGain();
  },
  isMuted: () => muted,
  setVolume(next: number) {
    volume = Math.max(0, Math.min(1, next));
    if (master) master.gain.value = masterGain();
  },
  volume: () => volume,
  /** Whether the held Warden sound is running. For the smoke test. */
  isStalking: () => held.has("stalk"),
};

/**
 * The score: the one thing in this game that is not a room, a rule or a
 * cue.
 *
 * There has been an ambient bed since the beginning - a drone, a fifth and
 * a breath of filtered noise that tightens as the floor rouses - and it is
 * atmosphere rather than music: nothing in it moves in pitch, so it can
 * only ever say "somewhere underground" and never say anything twice. A
 * demo on a store page is heard before it is read, and this one was
 * heard as a hum.
 *
 * Five notes of A minor pentatonic, played sparsely over the bed the game
 * already has. Two moods and one motif: stately on the title screen,
 * and underground a phrase that tightens as the floor wakes - the gap
 * between notes closing, the register dropping, and a heartbeat under it
 * once something is actually hunting. Synthesised like everything else
 * here, so it ships no files and needs no licence.
 *
 * Scheduled on the audio clock, never on the frame loop. Notes are laid
 * down half a second ahead of themselves from a timer that only has to
 * wake up often enough to stay ahead - which is what keeps the phrase
 * even on a machine rendering at four frames a second, where anything
 * driven per frame would stagger.
 */
type Mood = "title" | "delve";

/** A minor pentatonic, low. The bed's drone is the A below all of it. */
const SCALE = [220, 261.63, 293.66, 329.63, 392];
/** The phrase, as steps into `SCALE`. It is meant to be hummable. */
const PHRASE = [0, 2, 1, 4, 3, 1, 2, 0];

interface Score {
  mood: Mood;
  gain: GainNode;
  timer: number;
  /** The next note's time on the audio clock, and where in the phrase. */
  at: number;
  step: number;
  tension: number;
  paused: boolean;
}
let score: Score | null = null;

/** One note: a soft triangle and its fifth, through a slow filter. */
function note(ctx: AudioContext, out: GainNode, freq: number, at: number, hold: number) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.5, at + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + hold);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(700, at);
  filter.frequency.exponentialRampToValueAtTime(1600, at + hold * 0.4);
  const voice = ctx.createOscillator();
  voice.type = "triangle";
  voice.frequency.value = freq;
  const under = ctx.createOscillator();
  under.type = "sine";
  under.frequency.value = freq / 2;
  const underGain = ctx.createGain();
  underGain.gain.value = 0.4;
  voice.connect(filter);
  under.connect(underGain).connect(filter);
  filter.connect(gain).connect(out);
  voice.start(at);
  under.start(at);
  voice.stop(at + hold + 0.1);
  under.stop(at + hold + 0.1);
}

/** The heartbeat under a hunted phrase. Nothing but a thump. */
function pulse(ctx: AudioContext, out: GainNode, at: number) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.6, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.35);
  const thump = ctx.createOscillator();
  thump.type = "sine";
  thump.frequency.setValueAtTime(96, at);
  thump.frequency.exponentialRampToValueAtTime(44, at + 0.3);
  thump.connect(gain).connect(out);
  thump.start(at);
  thump.stop(at + 0.4);
}

export const music = {
  /**
   * How roused the floor is, 0 to 1 - the same number the bed takes. The
   * phrase closes up with it and the heartbeat comes in over half.
   */
  setTension(rouse: number) {
    if (score) score.tension = Math.max(0, Math.min(1, rouse));
  },
  /** A paused game is a quiet one: the phrase stops where it is. */
  setPaused(paused: boolean) {
    if (score) score.paused = paused;
  },
  start(mood: Mood) {
    const ctx = ensureContext();
    if (!ctx || !master) return;
    if (score?.mood === mood) return;
    if (score) music.stop();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    // A bed under everything, and quieter than it feels like it should be.
    //
    // Mixed at 0.5 and 0.34 this buried ten of the game's twenty-six cues -
    // a door, a key, a footstep and the Warden's own approach among them.
    // At 0.22 and 0.13 it still added 0.023 to a room tone of 0.031,
    // nearly doubling it, and two cues a player must not miss - the death
    // sting and being seen - no longer stood three times clear of it.
    //
    // This is a game whose only verb against the Warden is evasion and
    // whose warnings are all sounds. The score is the least important
    // thing in the mix and is mixed like it.
    gain.gain.exponentialRampToValueAtTime(mood === "title" ? 0.09 : 0.05, ctx.currentTime + 2);
    gain.connect(master);
    const state: Score = {
      mood,
      gain,
      timer: 0,
      at: ctx.currentTime + 0.4,
      step: 0,
      tension: 0,
      paused: false,
    };
    // Wake five times a second and lay down whatever falls in the next
    // second. The phrase's timing is the audio clock's, so a slow frame
    // cannot make it limp.
    state.timer = window.setInterval(() => {
      const now = ctx.currentTime;
      if (state.paused) {
        // Keep the cursor with the clock rather than firing a burst of
        // notes at once when the game comes back.
        state.at = Math.max(state.at, now + 0.4);
        return;
      }
      while (state.at < now + 1) {
        const tension = state.tension;
        const step = PHRASE[state.step % PHRASE.length];
        const octave = state.mood === "title" ? 1 : tension > 0.6 ? 0.5 : 1;
        note(ctx, state.gain, SCALE[step] * octave, state.at, state.mood === "title" ? 1.8 : 1.4);
        if (state.mood === "delve" && tension > 0.5) pulse(ctx, state.gain, state.at);
        // Sparse when nothing is looking for you, closer when something is.
        const gap = state.mood === "title" ? 1.15 : 2.4 - tension * 1.3;
        state.at += gap;
        state.step++;
      }
    }, 200);
    score = state;
  },
  stop() {
    if (!score || !context) return;
    const { gain, timer } = score;
    score = null;
    window.clearInterval(timer);
    const now = context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
  },
  /** Which mood is playing, or null. For the checks. */
  playing: (): Mood | null => score?.mood ?? null,
};
