import { FLOORS } from "../world";
import { generateDungeon } from "./generate";

/** The next floor's seed, as recorded by a run descending the stairs. */
export const nextFloorSeed = (currentSeed: number, nextFloor: number): number =>
  (currentSeed * 7919 + nextFloor) >>> 0;

/** Recover a floor's generator seed from the seed shown on the run summary. */
export function runFloorSeed(runSeed: number, floor: number): number {
  let seed = runSeed;
  for (let depth = 2; depth <= floor; depth++) seed = nextFloorSeed(seed, depth);
  return seed;
}

/** The exact generation options used by play, for both runs and development tools. */
export function generateRunFloor(runSeed: number | undefined, floor: number, roomBias = false) {
  return generateDungeon({
    seed: runSeed === undefined ? undefined : runFloorSeed(runSeed, floor),
    floor,
    lastFloor: floor === FLOORS,
    pays: roomBias,
  });
}
