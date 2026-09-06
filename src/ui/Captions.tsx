import { useEffect, useState } from "react";

import { bus } from "../game/events";
import { useSettings } from "../game/state/settings";
import { FONT, colors, text } from "./overlay";

/**
 * What the game just said out loud, in words.
 *
 * The Warden is heard before it is seen; how close it is, is a sound; and
 * which wall it knocked on is a pan. That is the best idea in the game and
 * it is entirely unavailable to a player who cannot hear it, which is the
 * plainest accessibility gap the project has. These caption the cues that
 * carry information - not every noise, which would be a wall of text over
 * a dungeon, but the ones a player is meant to act on.
 *
 * Off by default, because a hearing player does not need them and a line
 * of text is a thing on the screen. On, they sit under the middle, the
 * place a subtitle goes, and never take the pointer.
 */
const HOLD_MS = 2600;

/** The cues worth words, and the words. */
type Line = { text: string; key: number };

export function Captions() {
  const on = useSettings((s) => s.captions);
  const [line, setLine] = useState<Line | null>(null);

  useEffect(() => {
    if (!on) {
      setLine(null);
      return;
    }
    let timer = 0;
    let n = 0;
    const say = (text: string) => {
      n += 1;
      setLine({ text, key: n });
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setLine(null), HOLD_MS);
    };
    /**
     * Which side something is on, in words.
     *
     * The audio pans these and the pan is the whole point of the cue - a
     * player who only knows the Warden is near learns nothing about which
     * door to take. -1 is hard left.
     */
    const side = (pan: number) => (pan < -0.2 ? " (left)" : pan > 0.2 ? " (right)" : "");
    const offs = [
      bus.on("wardenWoke", () => say("Something wakes, far off")),
      bus.on("wardenNearby", () => say("Footsteps, through the wall")),
      bus.on("wardenEntered", () => say("It is in the room")),
      bus.on("wardenStruck", () => say("It reaches you")),
      bus.on("wardenWounded", () => say("It recoils - the spikes have it")),
      bus.on("wardenRouted", () => say("It flees into the dark")),
      bus.on("floorTiring", () => say("The floor tires of you")),
      bus.on("reaperWoke", () => say("Something that was not here is here")),
      bus.on("reaperStruck", () => say("It passes through you")),
      bus.on("reaperStalled", () => say("The blast holds it")),
      bus.on("snareSprung", ({ by }) => {
        if (by === "rat") say("Something small springs your snare");
      }),
      bus.on("mothLanded", () => say("A moth settles on the lantern")),
      bus.on("mothLeft", () => say("The moth carries the light away")),
      bus.on("batsRoused", () => say("Bats burst from the roost")),
      bus.on("draftFelt", () => say("A draft of cold air, from the wall")),
      bus.on("propBroken", ({ kind }) => say(`The ${kind} bursts`)),
      bus.on("wallSound", ({ flavour }) =>
        say(
          flavour === "hoard"
            ? "Something clinks, through the wall"
            : flavour === "reliquary"
              ? "A faint chime, through the wall"
              : "Water, dripping, through the wall"
        )
      ),
      bus.on("mapMarked", ({ marked }) => say(marked ? "Marked on the map" : "Mark cleared")),
      bus.on("trapSprung", ({ kind, by }) =>
        say(
          kind === "grate"
            ? "A grate drops behind you"
            : kind === "darts"
              ? by === "warden"
                ? "A plate clicks under it - darts"
                : "A plate clicks underfoot - darts"
              : by === "warden"
                ? "The floor gives way under it"
                : "The floor gives way"
        )
      ),
      bus.on("wardenLured", () => say("A clatter, far off")),
      bus.on("sentrySaw", ({ pan }) => say(`A watcher calls out${side(pan)}`)),
      bus.on("thiefCame", () => say("Something small skitters in")),
      bus.on("thiefTook", () => say("It snatches a gem")),
      bus.on("thiefFled", () => say("It is away with it")),
      bus.on("thiefCaught", () => say("It drops what it had")),
      bus.on("doorBarred", () => say("Hammering - loud")),
      bus.on("barBroken", ({ byWarden }) =>
        say(byWarden ? "The bar splinters" : "You lift the bar")
      ),
      bus.on("lanternOut", () => say("The lantern gutters out")),
      bus.on("damaged", () => say("You are hit")),
      bus.on("arenaRun", ({ running }) =>
        say(running ? "Stone grinds - the arms begin" : "The arms stop")
      ),
    ];
    return () => {
      offs.forEach((off) => off());
      window.clearTimeout(timer);
    };
  }, [on]);

  if (!on || !line) return null;
  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: "22%",
        transform: "translateX(-50%)",
        padding: "6px 14px",
        borderRadius: 4,
        background: "rgba(5, 6, 8, 0.78)",
        border: `1px solid ${colors.line}`,
        fontFamily: FONT,
        fontSize: text.body,
        color: colors.ink,
        whiteSpace: "nowrap",
        pointerEvents: "none",
        zIndex: 940,
      }}
    >
      {line.text}
    </div>
  );
}
