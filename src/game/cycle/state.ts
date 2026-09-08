import { keeperPostsFor } from "../keeper/posts";
import { keeperHolds, useRun } from "../state/run";
import { mayEscalate, openCycle, type Director } from "./director";

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
