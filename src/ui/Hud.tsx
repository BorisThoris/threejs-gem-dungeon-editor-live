import { useEffect, useState } from "react";

import { modifiers } from "../game/relics/catalog";
import { RELICS } from "../game/relics/catalog";
import {
  barredNow,
  harrierAway,
  harrierDowned,
  keeperHolds,
  keeperStalled,
  lanternLit,
  lureNow,
  patienceLeft,
  runClock,
  spareGems,
  tollNow,
  useCurrentRoom,
  useRun,
  wardNow,
  wardenSeesLight,
  wardenSenses,
  wardenStaggered,
} from "../game/state/run";
import { roostFor } from "../game/mobs/ambient";
import { draft } from "../game/rooms/draftState";
import { biomeFor } from "../game/rooms/biomes";
import { KIND_TITLE } from "../game/rooms/kinds";
import { alarmLabel, behaviourFor } from "../game/warden/tuning";
import { harrierRoostFor } from "../game/mobs/harrierRoost";
import { FLOORS, REAPER_WARNING_S } from "../game/world";
import { useSettings } from "../game/state/settings";
import { FONT, colors, text } from "./overlay";

const ALARM_COLOUR = ["#7f8794", "#e0b74a", "#e07a3a", "#f0506a"];

/**
 * What the player needs to decide with: how deep they are, what the door
 * will cost, how much they are actually up, and how awake the floor is.
 *
 * The old HUD said "3 more for the exit", which was the whole of the
 * game's tension in one flat number. This one has to answer a question the
 * player is really asking: is one more room worth it?
 */
export function Hud() {
  const lives = useRun((s) => s.lives);
  const maxLives = useRun((s) => s.maxLives);
  const gems = useRun((s) => s.gems);
  const toll = useRun(tollNow);
  const spare = useRun(spareGems);
  const floor = useRun((s) => s.floor);
  const alarm = useRun((s) => s.alarm);
  const relics = useRun((s) => s.relics);
  const wardenAwake = useRun((s) => s.wardenRoomId !== null);
  const keys = useRun((s) => s.keys);
  const nestGems = useRun((s) => s.nestGems);
  // Nothing said in colour alone. The alarm was a word whose *colour*
  // carried half its meaning and the gem count's danger likewise, which is
  // exactly the thing a colour-blind player cannot read.
  const marks = useSettings((s) => s.highContrast);
  const freeHit = useRun((s) => modifiers(s.relics).freeHitPerFloor && !s.freeHitUsed);
  const room = useCurrentRoom();
  const dungeonSeed = useRun((s) => s.dungeon?.seed ?? 0);
  // Loud, quiet, or neither, off the one number the store runs the sprint
  // on. Nothing here decides anything: `noiseHoldFor` does, and this reads
  // the same `carry` it reads.
  const ground = (() => {
    if (!room) return null;
    const b = biomeFor(room.kind, room.id, dungeonSeed);
    if (b.carry > 1.1) return { name: b.ground, says: "carries", tone: colors.danger };
    if (b.carry < 0.9) return { name: b.ground, says: "swallows sound", tone: colors.gold };
    return { name: b.ground, says: "dead", tone: colors.dim };
  })();

  // Said where the ground is said, because it is the same kind of fact: a
  // dash in here is louder than the ground alone makes it.
  const roost = room ? roostFor(room, dungeonSeed) !== null : false;
  const { heard, seen, lit, oil, lured, reeling, warded, barSeconds, patience, reaper, drafty, harrier, harrierUp, keeper, keeperUp } = useWardenSense();
  const wary = useRun((s) => s.wardenWary);
  const wisp = useRun((s) => s.wispOut);

  const owed = Math.max(0, toll - gems);
  const rouse = behaviourFor(alarm, heard).rouse;
  const alarmColour = reeling
    ? colors.gold
    : lured
    ? colors.accent
    : heard
      ? colors.danger
      : ALARM_COLOUR[Math.min(3, Math.floor(rouse * 3.99))];

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        left: 20,
        padding: "14px 16px",
        background: colors.panel,
        border: `1px solid ${colors.line}`,
        borderRadius: 6,
        fontFamily: FONT,
        fontSize: text.body,
        lineHeight: 2,
        color: colors.ink,
        pointerEvents: "none",
        zIndex: 900,
      }}
    >
      <div>
        <span style={{ color: colors.dim }}>LIVES </span>
        <span style={{ color: lives <= 1 ? colors.danger : colors.ink }}>
          {"♥".repeat(lives)}
          <span style={{ color: colors.line }}>{"♥".repeat(Math.max(0, maxLives - lives))}</span>
        </span>
        {freeHit && <span style={{ color: colors.gold }}> +charm</span>}
        {keys > 0 && <span style={{ color: colors.gold }}> · iron key</span>}
      </div>
      <div>
        <span style={{ color: colors.dim }}>GEMS </span>
        <span style={{ color: colors.accent }}>{gems}</span>
        <span style={{ color: colors.dim }}> · toll {toll} · </span>
        {owed > 0 ? (
          <span style={{ color: colors.danger }}>
            {marks && "! "}
            {owed} short
          </span>
        ) : (
          <span style={{ color: colors.gold }}>{spare} spare</span>
        )}
      </div>
      <div>
        <span style={{ color: colors.dim }}>FLOOR </span>
        {floor}
        <span style={{ color: colors.dim }}>/{FLOORS} · </span>
        {room ? KIND_TITLE[room.kind] : ""}
      </div>
      {/* What the floor is made of, and what running on it costs.
          The dash is the one speed that gives the player away, and the
          biome decides for how long - so the room has to say what it is
          before the decision, not after being caught. Named as well as
          judged: "standing water" is why, "loud" is what it means, and a
          reader who cannot tell the colours apart has both. */}
      {ground && (
        <div>
          <span style={{ color: colors.dim }}>GROUND </span>
          {ground.name}
          <span style={{ color: colors.dim }}> · </span>
          <span style={{ color: ground.tone }}>{ground.says}</span>
          {roost && <span style={{ color: colors.gold }}> · bats roost here</span>}
          {drafty && <span style={{ color: colors.gold }}> · a draft</span>}
        </div>
      )}
      {/* The floor's patience, once it is short, and what came when it ran
          out. Said in words as well as a number and a mark, so the one
          thing in the game you cannot outwalk is never told in colour. */}
      {(reaper || patience <= REAPER_WARNING_S) && (
        <div>
          <span style={{ color: colors.dim }}>FLOOR </span>
          <span style={{ color: colors.danger }}>
            {marks && (reaper ? "!!!! " : "!! ")}
            {reaper ? "it is here - the exit, now" : `tires of you · ${Math.max(0, patience)}s`}
          </span>
        </div>
      )}
      {wardenAwake && (
        <div>
          <span style={{ color: colors.dim }}>WARDEN </span>
          <span style={{ color: alarmColour }}>
            {/* The bars are the alarm level in a shape rather than a hue,
                so "Stirring" and "Enraged" are told apart by a reader who
                sees both of them as the same grey. */}
            {marks && `${"|".repeat(Math.min(4, Math.floor(rouse * 3.99) + 1))} `}
            {alarmLabel(alarm, heard, lured, reeling, seen)}
          </span>
          {/* Said once it is true, because it changes what the trap room is
              worth walking to - and a rule the player is not told has
              changed reads as the trick simply having stopped working. */}
          {wary && !reeling && <span style={{ color: colors.dim }}> · wary of spikes</span>}
          {/* The one state in the game where standing still is the answer,
              so it says so where the player is already looking. */}
          {warded && <span style={{ color: colors.gold }}> · warded out of this room</span>}
        </div>
      )}
      {/* The last stairs are kept, and the floor says so from the moment
          you are on it - the answer is a bomb, and a player who learns that
          at the door with none left has been ambushed by the rules. */}
      {keeper && (
        <div>
          <span style={{ color: colors.dim }}>KEEPER </span>
          <span style={{ color: keeper === "kneels" ? colors.gold : colors.danger }}>
            {keeper === "kneels" ? `kneels · ${keeperUp}s · go` : "holds the stairs · a blast makes it kneel"}
          </span>
        </div>
      )}
      {/* The thing with wings: named where it sleeps, so a player can tiptoe
          out; and what to do about it once it is up, because the answer is
          new - the spikes and the furniture that handle the Warden do not
          handle this, and a blast does. */}
      {harrier && (
        <div>
          <span style={{ color: colors.dim }}>ABOVE </span>
          <span style={{ color: harrier === "roosts" ? colors.gold : harrier === "down" ? colors.gold : colors.danger }}>
            {harrier === "roosts"
              ? "a harrier roosts here · quietly"
              : harrier === "hunting"
                ? "a harrier hunts you · a blast downs it"
                : harrier === "away"
                  ? "the harrier wheels away"
                  : `the harrier is down · ${harrierUp}s · spikes would end it`}
          </span>
        </div>
      )}
      <div>
        <span style={{ color: colors.dim }}>LANTERN </span>
        <span style={{ color: lit ? colors.gold : colors.dim }}>{lit ? "up" : "down"}</span>
        {/* The helper, named beside its price: it is out for exactly as
            long as the Warden can see the light. */}
        {wisp && <span style={{ color: colors.gold }}> · a wisp</span>}
        <span style={{ color: colors.dim }}> · </span>
        {/* Oil in whole seconds. It only burns while the lantern is up, so
            a player who keeps it down never watches this number, which is
            the point of it being a decision rather than a countdown. */}
        <span style={{ color: oil <= 20 ? colors.danger : colors.ink }}>{oil}s</span>
        <span style={{ color: colors.dim }}> oil</span>
      </div>
      {barSeconds > 0 && (
        <div>
          <span style={{ color: colors.dim }}>BARRED </span>
          <span style={{ color: colors.gold }}>a doorway</span>
          <span style={{ color: colors.dim }}> · {barSeconds}s</span>
        </div>
      )}
      {/* Only once it has cost you something. A line about a thief nobody
          has met yet is a spoiler and a distraction. */}
      {nestGems > 0 && (
        <div>
          <span style={{ color: colors.dim }}>STOLEN </span>
          <span style={{ color: colors.accent }}>{nestGems}</span>
          <span style={{ color: colors.dim }}> · in its nest, on the map</span>
        </div>
      )}
      {relics.length > 0 && (
        <div>
          <span style={{ color: colors.dim }}>HELD </span>
          <span style={{ color: colors.gold }}>{relics.map((id) => RELICS[id].name).join(", ")}</span>
        </div>
      )}
    </div>
  );
}

/**
 * What the Warden is currently going on: the player's footsteps, a thrown
 * noise, or the alarm alone. Polled.
 *
 * Both of the first two run out on a clock rather than on a state change,
 * so like the minimap's gloom this has to look rather than wait to be told -
 * otherwise the HUD would keep saying "Heard you" until something else
 * happened to change the store.
 */
function useWardenSense(): {
  heard: boolean;
  seen: boolean;
  lit: boolean;
  oil: number;
  lured: boolean;
  reeling: boolean;
  warded: boolean;
  barSeconds: number;
  /** Whole seconds of the floor's patience left, and whether it ran out. */
  patience: number;
  reaper: boolean;
  /** Standing in the draft from a cracked wall. */
  drafty: boolean;
  /** The floor's Harrier: roosting in this room, hunting, wheeling away, or down. */
  harrier: "roosts" | "hunting" | "away" | "down" | null;
  /** Whole seconds until a downed Harrier is up again. */
  harrierUp: number;
  /** The Keeper: holding the last stairs, or kneeling. */
  keeper: "holds" | "kneels" | null;
  /** Whole seconds until a kneeling Keeper is up again. */
  keeperUp: number;
} {
  const read = () => {
    const s = useRun.getState();
    const lured = lureNow(s) !== null;
    const keeper: "holds" | "kneels" | null = keeperStalled(s) ? "kneels" : keeperHolds(s) ? "holds" : null;
    const harrier: "roosts" | "hunting" | "away" | "down" | null = s.harrierSlain
      ? null
      : s.harrierAwake
        ? harrierDowned(s)
          ? "down"
          : harrierAway(s)
            ? "away"
            : "hunting"
        : s.dungeon && harrierRoostFor(s.dungeon, s.floor) === s.currentRoomId
          ? "roosts"
          : null;
    return {
      heard: !lured && wardenSenses(s),
      seen: !lured && wardenSeesLight(s),
      lit: lanternLit(s),
      oil: Math.ceil(s.oil),
      lured,
      reeling: wardenStaggered(s),
      warded: wardNow(s) !== null && wardNow(s) === s.currentRoomId,
      // Whole seconds: a bar is forty-five of them and the number is only
      // there to say "soon" or "not yet".
      barSeconds: barredNow(s) ? Math.max(0, Math.ceil(s.barUntil - runClock(s))) : 0,
      patience: Math.ceil(patienceLeft(s)),
      reaper: s.reaperAwake,
      drafty: draft.near && draft.roomId === s.currentRoomId,
      harrier,
      harrierUp: harrierDowned(s) ? Math.max(0, Math.ceil(s.harrierDownedUntil - runClock(s))) : 0,
      keeper,
      keeperUp: keeperStalled(s) ? Math.max(0, Math.ceil(s.keeperStalledUntil - runClock(s))) : 0,
    };
  };
  const [sense, setSense] = useState(read);
  useEffect(() => {
    const t = window.setInterval(
      () => setSense((was) => {
        const now = read();
        return was.heard === now.heard &&
          was.seen === now.seen &&
          was.lit === now.lit &&
          was.oil === now.oil &&
          was.lured === now.lured &&
          was.reeling === now.reeling &&
          was.warded === now.warded &&
          was.barSeconds === now.barSeconds &&
          was.patience === now.patience &&
          was.reaper === now.reaper &&
          was.drafty === now.drafty &&
          was.harrier === now.harrier &&
          was.harrierUp === now.harrierUp &&
          was.keeper === now.keeper &&
          was.keeperUp === now.keeperUp
          ? was
          : now;
      }),
      250
    );
    return () => window.clearInterval(t);
  }, []);
  return sense;
}
