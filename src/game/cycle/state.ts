import { shortestPath } from "../dungeon/generate";
import { KEEPER_FLOOR } from "../world";
import { keeperPostsFor } from "../keeper/posts";
import { keeperHolds, useRun } from "../state/run";
import { BASE, CRESCENDO, mayEscalate, openCycle, type Director, type Tempo } from "./director";
import { openMenace, type Menace } from "./menace";

/**
 * The floor's pacing, held outside React.
 *
 * Same reason as the Din's live signals and the ladder's rungs: it changes
 * every frame, nothing in the DOM draws from it, and it has to survive the
 * room component unmounting when the player walks through a doorway. And
 * separate from the driver so that file exports a component and nothing
 * else, which is what keeps hot reload working on it.
 */
let director: Director = openCycle();

export const cycleNow = (): Director => director;

export const setCycle = (next: Director): void => {
  director = next;
};

/**
 * The menace gauge, held the same way and for the same reasons.
 *
 * Beside the director rather than inside it because they answer different
 * questions on different clocks: the director asks whether the floor may
 * send something new in the next ten seconds, and this asks whether the
 * player has been leaned on for long enough that the thing already here
 * should walk away. A floor resets both.
 */
let menace: Menace = openMenace();

export const menaceNow = (): Menace => menace;

export const setMenace = (next: Menace): void => {
  menace = next;
};

/** Whether the floor may send something NEW right now. */
export const cycleAllows = (): boolean => mayEscalate(director);

/**
 * Whether the floor may send something new, asked by the thing that sends
 * things.
 *
 * The boss floor is exempt, and that is the source's own rule rather than
 * a convenience: adaptive pacing is switched off entirely for authored
 * encounters, because the director paces the connective tissue and the
 * DESIGNER paces the crescendos. Our Keeper is a designed encounter that
 * begins the moment the player walks into its room, and a valley chosen by
 * an accumulator in the middle of it would be the director overruling the
 * only authored moment in the game.
 */
export function floorMaySend(): boolean {
  const s = useRun.getState();
  /**
   * The encounter is the ROOM, not the floor.
   *
   * The first version of this exempted the whole of the Keeper's floor
   * whenever the Keeper was standing, which is the entire floor until
   * somebody bombs it - so floor three had no valleys at all and the
   * Cycle was switched off exactly where the run is longest. The rule is
   * that the designer paces the crescendos and the director paces the
   * connective tissue, and almost all of floor three is connective tissue.
   *
   * So the exemption is the doorways the Keeper stands in, which is where
   * the authored encounter actually begins.
   */
  if (s.dungeon && s.currentRoomId && keeperHolds(s)) {
    const posts = keeperPostsFor(s.dungeon, s.floor);
    if (posts.some((p) => p.roomId === s.currentRoomId)) return true;
  }
  return cycleAllows();
}

/**
 * How many rooms from the exit the last floor stops breathing.
 *
 * `AHEAD_OF_KEEPER` is two: the set piece that describes the Keeper is
 * staged two to four rooms out, so three is about where the player reads
 * the thing that tells them what is coming. The crescendo starts where the
 * foreshadowing does, which is the only defensible place to start it.
 */
export const CRESCENDO_FROM = 3;

/**
 * Which pacing the floor is running: the connective tissue's, or the
 * finale's.
 *
 * `CRESCENDO` has been in `director.ts` since the Cycle shipped and nothing
 * has ever read it. It is the same machine with five numbers swapped - a
 * twenty-five to thirty second hold at the top against a two to five second
 * valley, inverted from the base curve - and the research is explicit that
 * it is a PRESET, used where a set piece wants one and never reached by the
 * director on its own.
 *
 * The set piece this game has is the Keeper, and its own doorways are
 * already exempt from the director entirely. What had no pacing of its own
 * is the APPROACH: the last few rooms before the exit on the last floor,
 * where the run's one authored encounter is about to happen and where the
 * director was still handing out thirty-to-forty-five second valleys. The
 * last ninety seconds of a run were paced exactly like the first ninety.
 *
 * Distance by DOORWAYS WALKED rather than by metres, because that is the
 * axis the rest of the floor is measured on - the foreshadowing, the
 * Keeper's posts and the relax's own progress count are all rooms.
 */
export function tempoFor(): Tempo {
  const s = useRun.getState();
  if (s.floor !== KEEPER_FLOOR || !s.dungeon || !s.currentRoomId) return BASE;
  const path = shortestPath(s.dungeon.rooms, s.currentRoomId, s.dungeon.endId);
  // No path is a room walled off from the exit, which the generator does
  // not make; if it ever did, the ordinary curve is the safe answer.
  if (!path) return BASE;
  return path.length - 1 <= CRESCENDO_FROM ? CRESCENDO : BASE;
}
