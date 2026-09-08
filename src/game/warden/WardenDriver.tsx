import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { bus } from "../events";
import {
  barsNow,
  canControl,
  lureNow,
  sanctuaryRoom,
  useRun,
  wardNow,
  wardenSenses,
  wardenStaggered,
} from "../state/run";
import * as din from "../din/din";
import { emptyArrival } from "../din/din";
import * as ladder from "../ladder/state";
import { barToBreak } from "./bars";
import { nextRoom } from "./roam";
import { behaviourFor } from "./tuning";

/**
 * Reused, because this is asked on the frame the Warden steps and an
 * allocation per step is an allocation the perf budget would rather not
 * have.
 */
const heard = emptyArrival();

/**
 * The Warden's walk through the rooms nobody is standing in.
 *
 * Mounted once for the whole run, not per room: the Warden exists on the
 * whole floor, and only the frame loop is guaranteed to be running whatever
 * room is mounted. It steps on a timer set by the floor's alarm, walks
 * towards the player when the alarm or a sprint has given them away, and the
 * player hears it whenever it steps into a room next door.
 */
export function WardenDriver() {
  const since = useRef(0);

  useFrame((_, delta) => {
    const run = useRun.getState();
    if (!run.wardenRoomId || !run.dungeon || !run.currentRoomId) return;
    if (!canControl(run)) return;
    // Reeling from the floor's spikes: it is not going anywhere, and the
    // timer does not run while it is down - otherwise a stagger that
    // straddled a step boundary was spent the instant it ended, and the
    // window the player bought was three seconds of nothing followed by it
    // walking straight back in.
    if (wardenStaggered(run)) return;

    // A thrown sound is what it is walking to, if there is one: it is
    // following a noise it already heard rather than listening for the
    // player, which is why a Scroll of Echoes is also permission to run.
    const lure = lureNow(run);

    /**
     * And what the floor itself is telling it.
     *
     * The lure above is a tool the player buys and aims. This is the
     * general case underneath it: the Warden answers to [loud] at 0.30
     * and walks to wherever the loudest thing it can hear happened, and
     * it has no idea what made the noise. That is the whole payoff of the
     * Din, and it arrives with no new content - a barrel the player never
     * touched, burst by a Harrier's dive two rooms away, now pulls the
     * Warden off the player's trail, and nobody wrote a rule for it.
     *
     * Below the lure in priority because a bought, aimed noise should
     * beat an incidental one; above the hunt because a Warden that
     * ignored a bomb to keep walking at you would read as a cheat.
     */
    const noise =
      !lure && din.answering(heard, "warden", run.wardenRoomId) && heard.tag === "loud"
        ? heard.fromRoomId
        : null;
    const going = lure ?? noise;

    /**
     * Hearing is the other half of the ladder, and the half that works
     * through walls.
     *
     * Sight is reported by the component, which is the only thing that
     * knows where this is standing - but it is only mounted while the
     * Warden is in the room the player is in, which is the minority of the
     * floor. A noise two rooms away has to be able to move it, and this is
     * where that happens: a thing it can hear puts it on searching, and a
     * loud one is a strong stimulus, which is reacted to faster and
     * remembered longer.
     *
     * Never above searching. Hearing tells you a room, not a person -
     * committing on a sound alone would make every burst barrel a death
     * sentence and would delete the difference between the two senses.
     */
    if (noise) ladder.report("warden", 2, false, heard.magnitude >= 0.6, noise);

    // Heard, or seen: a raised lantern on a dark floor gives a player away
    // exactly as a sprint does, and `wardenSenses` is the one place that
    // decides that so the driver, the HUD and the tuning cannot disagree.
    const behaviour = behaviourFor(run.alarm, !going && wardenSenses(run));
    since.current += delta;
    if (since.current < behaviour.stepSeconds) return;
    since.current = 0;

    // It does not step while it is already in the room with the player: it
    // is busy, and a Warden that wandered off mid-approach would read as a
    // bug rather than as mercy. A sound it is chasing outranks that: it
    // leaves, which is the whole point of throwing one.
    if (!going && run.wardenRoomId === run.currentRoomId) return;

    const bars = barsNow(run);
    /**
     * A bar it cannot get round, it breaks.
     *
     * Never a wall it can never cross: a player who could shut it out of
     * half the floor would have somewhere to wait, and there being nowhere
     * to wait is the whole of what this thing is for. Breaking costs it
     * this step and is heard everywhere, so the bar never simply stops
     * working without the player being told.
     */
    const wall = barToBreak(run.dungeon, run.wardenRoomId, going ?? run.currentRoomId, bars);
    if (wall) {
      run.breakBar();
      return;
    }

    const to = nextRoom(
      run.dungeon,
      run.wardenRoomId,
      going ?? run.currentRoomId,
      /**
       * Hunting, and the third way into it.
       *
       * The alarm has always been able to set it hunting. The floor's heat
       * can now do it too, by way of the ladder: the Warden's ceiling
       * opens every floor at `searching`, so on a cold floor it
       * investigates, walks to noises and calls out and never beelines -
       * and the heat purchase that lifts the ceiling is what lets it
       * commit. It still has to actually see you afterwards, which is the
       * difference between "the floor allowed this" and "the floor did
       * this".
       */
      going ? true : behaviour.hunts || ladder.commits("warden"),
      run.wardenCameFrom,
      Math.random(),
      bars
    );
    if (!to) return;
    /**
     * A ward stone is a room it will not walk into, so it waits outside.
     *
     * Refusing the step rather than routing around it, because the stone
     * says "not this room" and not "the long way round": a Warden that
     * detoured would still be coming, and the thirty seconds the stone
     * buys is the one place in the game where the answer to it is to stand
     * still. It goes back to walking when the stone runs out.
     */
    if (to === wardNow(run)) return;
    /**
     * Nor into the room the floor started the player in, while that is
     * still their first breath on it. Refused for the same reason and in
     * the same way as the stone: the room says "not this one", and the
     * moment the player walks out of it the refusal is over.
     */
    if (to === sanctuaryRoom(run)) return;
    run.moveWarden(to);

    // Heard through the wall: it has stepped into a room you could walk to.
    const here = run.dungeon.rooms.find((r) => r.id === run.currentRoomId);
    if (here && to !== run.currentRoomId && Object.values(here.links).includes(to)) {
      bus.emit("wardenNearby", { roomId: to });
    }
  });

  return null;
}
