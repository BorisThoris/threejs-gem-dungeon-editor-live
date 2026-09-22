import type { Room } from "../dungeon/types";
import { floorSurfaceRects } from "../rooms/floorSurfacePattern";
import { biomeIdFor } from "../rooms/biomes";
import { galleryTerminiFor } from "../worldbuilding/galleryTermini";

export interface RoomAcoustics { delay: number; gain: number; cutoff: number }

/** Equivalent floor span includes galleries and polygon cuts. These are quiet
 * early returns, not a simulated reverberation field or an AI noise source. */
export function acousticsFor(room: Room): RoomAcoustics {
  const area = floorSurfaceRects(room).reduce((sum, r) => sum + r.width * r.depth, 0);
  const span = Math.sqrt(area);
  const biome = biomeIdFor(room.kind, room.id, room.seed, room);
  const soft = biome === "mossy" || biome === "fungal" || biome === "ash";
  const timber = biome === "timber";
  const gallery = galleryTerminiFor(room);
  const stations = gallery.sites.length;
  const secretFlank = gallery.sites.some(site => site.secretFlank);
  const districtGain = !stations ? 1 : room.district === "gardens" ? .82 : room.district === "works" ? 1.02 : 1.16;
  const districtCutoff = room.district === "gardens" ? 720 : room.district === "works" ? 1450 : 2200;
  const materialCutoff = biome === "ash" ? 480 : soft ? 650 : timber ? 1100 : biome === "crystal" ? 2600 : biome === "salt" ? 2350 : 1900;
  return {
    delay: Math.max(.025, Math.min(.16, span / 343 + stations * .004 + (secretFlank ? .004 : 0))),
    gain: (soft ? .055 : timber ? .1 : .19) * Math.min(1.28, Math.max(.65, span / 24)) * districtGain,
    cutoff: stations ? Math.round(materialCutoff * .72 + districtCutoff * .28) : materialCutoff,
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
