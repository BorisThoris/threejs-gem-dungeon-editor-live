import { useEffect } from "react";

import { bus, type BusEvents } from "../events";
import { touchControlsActive } from "../input/device";
import { useRun } from "../state/run";
import { floorRules } from "../world";

/**
 * What the game says the first time something matters.
 *
 * Nothing down here is explained in a menu nobody reads. The Warden is
 * introduced the first time it wakes, the spikes the first time they bite
 * it, the lantern the first time it goes up - one line, in the notice
 * slot, at the moment the thing has just happened and the player is
 * looking at it. For a long time that was the Warden's module and the
 * Warden's systems only: the ten loops added plates, pits, grates,
 * drafts, a wisp, a moth, rats, barrels, a Harrier and a Keeper, and
 * every one of them happened in silence the first time. A player who has
 * just been darted by a plate they did not see, or watched a moth carry
 * their light away, was told nothing.
 *
 * So the teacher is one table now, in one voice: an event, a line, and
 * whether it is said once a run or every time. Every system that has a
 * rule a player cannot see gets its sentence here, and nowhere else -
 * the checks read this table, hold every line to a length and an ending,
 * and fire every loop's event to hear its line said once and then not
 * again. Feedback for an action the player just took (the fuse lit, the
 * satchel full) stays with the action; this is for rules.
 *
 * The lines that name a key are functions of whether the on-screen
 * controls are up, decided when the line is said rather than when the
 * module loads, because the controls can appear at the first touch.
 */
export interface Lesson<K extends keyof BusEvents = keyof BusEvents> {
  id: string;
  event: K;
  /** Said every time rather than once a run. */
  every?: boolean;
  /** Only when this holds for the payload, and the run. */
  when?: (payload: BusEvents[K]) => boolean;
  line: string | ((payload: BusEvents[K], touch: boolean) => string);
  /** A payload the checks can say the line with, where the line needs one. */
  sample?: BusEvents[K];
}

const lesson = <K extends keyof BusEvents>(l: Lesson<K>): Lesson => l as unknown as Lesson;

export const LESSONS: readonly Lesson[] = [
  // The Warden, and what it hears and sees.
  lesson({ id: "woke", event: "wardenWoke", line: "Something woke below. It walks the floor now, and every gem you take makes it worse." }),
  lesson({
    id: "here",
    event: "wardenEntered",
    line: (_, touch) =>
      touch
        ? "It is in this room. You cannot fight it. Press RUN and go."
        : "It is in this room. You cannot fight it. Hold Shift and go.",
  }),
  lesson({ id: "seen", event: "sentrySaw", line: "The watcher called out. Stay out of the light - it tells the Warden where you are." }),
  // Only worth saying once there is something to hear it: told before the
  // Warden wakes, the line is a warning about nothing.
  lesson({ id: "loud", event: "wardenHeard", when: () => !!useRun.getState().wardenRoomId, line: "It heard that. Running carries down here; walking does not." }),
  // Not a one-off: feedback for an action the player just took, and it
  // says what the scroll bought them.
  lesson({ id: "thrown", event: "wardenLured", every: true, line: "Something clatters a long way off. It has gone to look, and it is not listening for you." }),
  lesson({ id: "bit", event: "wardenWounded", line: "The spikes do not care which of you stands on them. Put another patch between you." }),
  // The rout says the lesson has been learned by the other side, which is
  // a rule change and so worth saying every time.
  lesson({ id: "routed", event: "wardenRouted", every: true, line: "It will not cross those again. Whatever else this floor gives you, that trick is spent." }),
  // The one line that has to arrive before the player can act on it:
  // everything else teaches by having just happened, and this by having
  // four seconds left.
  lesson({
    id: "thief",
    event: "thiefCame",
    line: (_, touch) =>
      touch
        ? "Something small is in here with you, and it wants what you are carrying. RUN, now."
        : "Something small is in here with you, and it wants what you are carrying. Shift, now.",
  }),
  lesson({ id: "robbed", event: "thiefFled", line: "It took that to its nest. The nest is on your map - the gems are not gone, they are somewhere." }),
  // Every time: running out is a thing to be told about whenever it
  // happens, because the answer to it is somewhere else in the room.
  lesson({ id: "dry", event: "lanternOut", every: true, line: "The lantern is out. Fill it at a brazier - though a brazier is the brightest place to stand." }),
  // The lantern starts down, so the first time it goes up is the first
  // time the player has chosen to be seen.
  lesson({
    id: "light",
    event: "lanternToggled",
    when: ({ raised }) => raised,
    line: (_, touch) =>
      touch
        ? "Your lantern is up, and it is the brightest thing on this floor. LAMP puts it down."
        : "Your lantern is up, and it is the brightest thing on this floor. F puts it down.",
    sample: { raised: true },
  }),
  lesson({ id: "barred", event: "doorBarred", line: "That doorway is shut to it. It will walk round - and everything down here heard you shut it." }),
  // Every time: a bar going is a rule changing back, and the player is
  // usually looking the other way when it happens.
  lesson({ id: "smashed", event: "barBroken", every: true, when: ({ byWarden }) => byWarden, line: "It came through the bar. There was no way round, and now it knows exactly where you are.", sample: { byWarden: true } }),
  // Once, to teach the one rule a player cannot see: a device outlives
  // the visit it was set during.
  lesson({ id: "set", event: "devicePlaced", line: "It stays where you left it, and it is still there when you come back through." }),

  // The ten loops. Each names the rule the player has just met and what
  // it is for, in the order they are likely to meet them.
  lesson({ id: "darts", event: "trapSprung", when: ({ kind, by }) => kind === "darts" && by === "player", line: "A plate, and darts across the lane. Anything with feet springs it - and the Warden has feet.", sample: { key: "k", kind: "darts", by: "player" } }),
  lesson({ id: "darts-warden", event: "trapSprung", when: ({ kind, by }) => kind === "darts" && by === "warden", line: "The Warden sprang the plate. The floor's traps are yours to use, and they do not care who walks in.", sample: { key: "k", kind: "darts", by: "warden" } }),
  lesson({ id: "pit", event: "trapSprung", when: ({ kind }) => kind === "pit", line: "The floor gave way. It is a spike patch now, for anything that walks - you, the rats, the Warden.", sample: { key: "k", kind: "pit", by: "player" } }),
  lesson({ id: "grate", event: "trapSprung", when: ({ kind }) => kind === "grate", line: "A grate dropped behind you. That doorway is barred - to it, and to you, until it lifts.", sample: { key: "k", kind: "grate", by: "player" } }),
  lesson({ id: "draft", event: "draftFelt", line: "A draft, from that wall. Something is behind it, and a bomb would find out." }),
  lesson({
    id: "wall",
    event: "wallSound",
    line: ({ flavour }) =>
      flavour === "hoard"
        ? "A clink through the wall. There is a hoard behind it, if you have a bomb."
        : flavour === "reliquary"
          ? "A chime through the wall. A reliquary is behind it, if you have a bomb."
          : "A drip through the wall. A shrine is behind it, if you have a bomb.",
    sample: { roomId: "r", flavour: "hoard" },
  }),
  lesson({ id: "wisp", event: "wispCame", line: "A wisp gathers at your light and drifts ahead. It leads to the crack - and everything that hunts by light sees it." }),
  lesson({ id: "moth", event: "mothLanded", line: "A moth settles on the lantern. It will carry the light where you are not, and the Warden follows light." }),
  lesson({ id: "bats", event: "batsRoused", line: "Bats. A dash under a roost wakes them, and the whole floor heard that." }),
  lesson({ id: "rat", event: "snareSprung", when: ({ by }) => by === "rat", line: "A rat sprang your snare. Anything with feet does - the Warden most of all.", sample: { by: "rat" } }),
  lesson({ id: "burst", event: "propBroken", line: "It burst. A barrel between you and a blast takes the blast for you, and now and then there is a gem in the wreck." }),
  lesson({ id: "harrier", event: "harrierWoke", line: "Something with wings is hunting you. Spikes cannot touch it and furniture does not slow it - a blast knocks it down." }),
  lesson({ id: "keeper", event: "keeperBars", line: "The Keeper holds the last stairs. It cannot be walked past. A blast in its room makes it kneel - for nine seconds." }),

  // Every floor, on arriving: what this one is like.
  lesson({ id: "floor", event: "floorDescended", every: true, line: ({ floor }) => floorRules(floor).blurb, sample: { floor: 2, left: 0 } }),
];

/** The events the ten loops added, each of which must have a lesson. */
export const LOOP_EVENTS: readonly (keyof BusEvents)[] = [
  "trapSprung",
  "draftFelt",
  "wallSound",
  "wispCame",
  "mothLanded",
  "batsRoused",
  "snareSprung",
  "propBroken",
  "harrierWoke",
  "keeperBars",
];

/** A lesson's words, for a payload. */
export function lessonText(l: Lesson, payload: BusEvents[keyof BusEvents], touch = false): string {
  return typeof l.line === "function" ? l.line(payload, touch) : l.line;
}

export function useTeacher() {
  useEffect(() => {
    let told = new Set<string>();
    const say = (text: string) => bus.emit("notice", text);
    /**
     * The table is a union of event names, so its handlers take a union of
     * payloads; `bus.on` is generic over one event at a time and cannot
     * see that a row's handler only ever receives its own row's payload.
     * One narrowing here, rather than a cast at every row.
     */
    const subscribe = bus.on as unknown as (
      event: keyof BusEvents,
      handler: (payload: BusEvents[keyof BusEvents]) => void
    ) => () => void;
    const offs = LESSONS.map((l) =>
      subscribe(l.event, (payload) => {
        if (l.when && !l.when(payload)) return;
        if (!l.every) {
          if (told.has(l.id)) return;
          told.add(l.id);
        }
        say(lessonText(l, payload, touchControlsActive()));
      })
    );
    offs.push(
      bus.on("runStarted", () => {
        told = new Set();
        say(floorRules(1).blurb);
      })
    );
    return () => offs.forEach((off) => off());
  }, []);
}
