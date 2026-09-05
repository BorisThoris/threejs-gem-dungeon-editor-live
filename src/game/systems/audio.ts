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
  pan = 0
) {
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
  node.connect(gain);
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
  pan = 0
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
  envelope(ctx, osc, 0.008, duration, peak, pan);
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

function noiseBurst(duration: number, peak = 0.4, filterHz = 1800, pan = 0) {
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
  envelope(ctx, filter, 0.005, duration, peak, pan);
  source.start(ctx.currentTime, offset, duration + 0.1);
  source.stop(ctx.currentTime + duration + 0.1);
}

const later = (ms: number, fn: () => void) => window.setTimeout(fn, ms);

/** When the last chitter played, for the throttle in `sfx.skitter`. */
let lastSkitter = 0;

/**
 * The Warden crossing the room you are standing in.
 *
 * Every other cue is a one-shot, which was fine while the Warden was a
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
let stalking: {
  gain: GainNode;
  panner: StereoPannerNode;
  filter: BiquadFilterNode;
  sub: OscillatorNode;
  noise: AudioBufferSourceNode;
  lfo: OscillatorNode;
} | null = null;

function startStalk(ctx: AudioContext): typeof stalking {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const panner = ctx.createStereoPanner();
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
  lfo.connect(lfoDepth).connect(gain.gain);

  filter.connect(gain).connect(panner);
  panner.connect(master!);
  sub.start();
  noiseSource.start();
  lfo.start();
  return { gain, panner, filter, sub, noise: noiseSource, lfo };
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
  /**
   * How roused the floor is, 0 to 1. The bed tightens with it: the drone
   * comes up and the air moves faster, so a floor being emptied of gems is
   * audibly a worse place to be standing.
   */
  setTension(rouse: number) {
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
  step(strong: boolean, running = false) {
    const wobble = 0.85 + Math.random() * 0.4;
    // A run is heard by the Warden, so it had better be heard by the player
    // too: the same footstep, harder and with more body under it.
    const loud = running ? 1.7 : 1;
    noiseBurst((strong ? 0.085 : 0.07) * loud, (strong ? 0.28 : 0.2) * loud, 420 * wobble);
    tone(70 * wobble, 0.06, "sine", (strong ? 0.24 : 0.16) * loud, 48 * wobble);
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
  /** The charm eating a hit: a hit that stops short. */
  charm() {
    tone(660, 0.1, "sine", 0.4);
    later(60, () => tone(330, 0.4, "sine", 0.3));
  },
  /** The Warden heard through a wall: a slow knock, no pitch to speak of. */
  /**
   * It has stepped into a room next door. `pan` is which side that room is
   * on from where the player is looking, which is the whole value of the
   * cue: a footfall through a wall you cannot place is only a jump scare.
   */
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
  /** Something small set on stone: a scrape and a click. */
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
    const ctx = ensureContext();
    if (!ctx || !master) return;
    if (closeness <= 0) {
      sfx.stalkStop();
      return;
    }
    if (!stalking) stalking = startStalk(ctx);
    if (!stalking) return;
    const level = Math.min(1, closeness);
    // The LFO swings around this, so the ceiling leaves room for it.
    stalking.gain.gain.value = 0.06 + level * 0.5;
    stalking.filter.frequency.value = 220 + level * 520;
    stalking.panner.pan.value = Math.max(-0.85, Math.min(0.85, pan));
  },
  stalkStop() {
    if (!stalking) return;
    const s = stalking;
    stalking = null;
    s.gain.gain.value = 0;
    try {
      s.sub.stop();
      s.noise.stop();
      s.lfo.stop();
    } catch {
      // Already stopped: nothing to undo.
    }
    s.panner.disconnect();
  },
  setMuted(next: boolean) {
    muted = next;
    if (master) master.gain.value = next ? 0 : 0.35;
  },
  isMuted: () => muted,
  /** Whether the held Warden sound is running. For the smoke test. */
  isStalking: () => stalking !== null,
};
