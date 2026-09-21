import type { Room } from "../dungeon/types";
import { floorSurfaceRects } from "../rooms/floorSurfacePattern";
import { biomeIdFor } from "../rooms/biomes";

export interface RoomAcoustics { delay: number; gain: number; cutoff: number }

/** Equivalent floor span includes galleries and polygon cuts. These are quiet
 * early returns, not a simulated reverberation field or an AI noise source. */
export function acousticsFor(room: Room): RoomAcoustics {
  const area = floorSurfaceRects(room).reduce((sum, r) => sum + r.width * r.depth, 0);
  const span = Math.sqrt(area);
  const biome = biomeIdFor(room.kind, room.id, room.seed, room);
  const soft = biome === "mossy" || biome === "fungal" || biome === "ash";
  const timber = biome === "timber";
  return {
    delay: Math.max(.025, Math.min(.14, span / 343)),
    gain: (soft ? .055 : timber ? .1 : .19) * Math.min(1.2, Math.max(.65, span / 24)),
    cutoff: biome === "ash" ? 480 : soft ? 650 : timber ? 1100 : biome === "crystal" ? 2600 : 1900,
  };
}

/** Three bounded taps, allocated once. No feedback loop, new voice per step,
 * or buffers per room. Only footfalls enter this return; threat cues stay dry. */
export function createRoomReflections(ctx: BaseAudioContext, output: AudioNode) {
  const input = ctx.createBiquadFilter();
  input.type = "lowpass";
  const wet = ctx.createGain();
  wet.gain.value = 0;
  wet.connect(output);
  const taps = [1, 1.63, 2.31].map((ratio, i) => {
    const delay = ctx.createDelay(.5), gain = ctx.createGain();
    gain.gain.value = [1, .48, .23][i];
    input.connect(delay).connect(gain).connect(wet);
    return { delay, ratio };
  });
  return {
    input,
    configure(profile: RoomAcoustics | null) {
      // Immediate changes prevent a departing room's scheduled automation
      // from returning after a rapid transition or a pause.
      wet.gain.value = profile?.gain ?? 0;
      if (!profile) return;
      input.frequency.value = profile.cutoff;
      for (const tap of taps) tap.delay.delayTime.value = profile.delay * tap.ratio;
    },
  };
}
