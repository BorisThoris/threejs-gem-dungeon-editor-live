import { useEffect, useState } from "react";

import { modifiers } from "../game/relics/catalog";
import { RELICS } from "../game/relics/catalog";
import {
  barredNow,
  harrierAway,
  harrierDowned,
  keeperHolds,
  keeperStalled,
  lanternBand,
  lanternLit,
  lureNow,
  heatBand,
  heatSays,
  runClock,
  spareGems,
  tollNow,
  useCurrentRoom,
  useRun,
  wardNow,
  wardenMarked,
  wardenSenses,
  wardenStaggered,
} from "../game/state/run";
import { roostFor } from "../game/mobs/ambient";
import { sentryFor } from "../game/sentry/placement";
import { useLedger } from "../game/state/ledger";
import { GLIM_BANDS, GEMVEIN_BELOW } from "../game/lantern/glim";
import { draft } from "../game/rooms/draftState";
import { biomeFor } from "../game/rooms/biomes";
import { KIND_TITLE } from "../game/rooms/kinds";
import { alarmLabel, behaviourFor } from "../game/warden/tuning";
import { device } from "../game/input/device";
import { harrierRoostFor } from "../game/mobs/harrierRoost";
import { FLOORS } from "../game/world";
import { useSettings } from "../game/state/settings";
import { FONT, colors, text } from "./overlay";
import { hudLines, type HudLine } from "./hudLines";

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
  const room = useCurrentRoom();
  const dungeonSeed = useRun((s) => s.dungeon?.seed ?? 0);
  // Loud, quiet, or neither, off the one number the store runs the sprint
  // on. Nothing here decides anything: `noiseHoldFor` does, and this reads
  // the same `carry` it reads.
  const ground = (() => {
    if (!room) return null;
    const b = biomeFor(room.kind, room.id, dungeonSeed);
    if (b.carry > 1.1) return { name: b.ground, says: "carries", tone: "danger" as const };
    if (b.carry < 0.9) return { name: b.ground, says: "swallows sound", tone: "gold" as const };
    return { name: b.ground, says: "dead", tone: "dim" as const };
  })();

  // Said where the ground is said, because it is the same kind of fact: a
  // dash in here is louder than the ground alone makes it.
  const roost = room ? roostFor(room, dungeonSeed) !== null : false;
  const { heard, seen, lit, oil, band, lured, reeling, warded, barSeconds, heat, reaper, drafty, harrier, harrierUp, keeper, keeperUp } = useWardenSense();
  const wary = useRun((s) => s.wardenWary);
  const wisp = useRun((s) => s.wispOut);

  const owed = Math.max(0, toll - gems);
  const rouse = behaviourFor(alarm, heard).rouse;
  // A tone by name, not a colour: the lines are drawn from one palette
  // and the mapping lives beside it.
  const alarmTone: HudLine["tone"] = reeling
    ? "gold"
    : lured
      ? "accent"
      : heard
        ? "danger"
        : (["dim", "gold", "gold", "danger"] as const)[Math.min(3, Math.floor(rouse * 3.99))];

  /**
   * The lines, in the order `hudLines` puts them.
   *
   * The block of JSX this replaces was the order the features were built
   * in: with the Reaper in the room, "it is here" sat below what the floor
   * was made of, and two different facts were both labelled FLOOR. What is
   * urgent and what a line is called are one module's business now, and
   * this only draws what it is handed.
   */
  /**
   * The three facts the Ledger spends. Read here rather than inside
   * `hudLines` because that module is pure and the checks read it without
   * a browser - the same reason every other fact is assembled here.
   *
   * The vein band is asked of the one owner rather than named: the band
   * the veins show at is `glim.ts`'s to decide, and a readout with its own
   * copy of the threshold is a readout that goes on saying "Dark" after
   * somebody moves it.
   */
  const learned = useLedger((s) => s.learned);
  const watched = !!(room && sentryFor(room, dungeonSeed, floor));
  const veinBand = (GLIM_BANDS.find((b) => b.at < GEMVEIN_BELOW) ?? GLIM_BANDS[GLIM_BANDS.length - 1]).name;

  const lines = hudLines({
    lives,
    maxLives,
    keys,
    gems,
    toll,
    spare,
    owed,
    floor,
    floors: FLOORS,
    roomTitle: room ? KIND_TITLE[room.kind] : "",
    ground,
    roost,
    drafty,
    heatSays: heat.says,
    heatBand: heat.band,
    reaper,
    wardenAwake,
    wardenSays: alarmLabel(alarm, heard, lured, reeling, seen),
    wardenTone: alarmTone,
    wardenBars: Math.min(4, Math.floor(rouse * 3.99) + 1),
    wary: wary && !reeling,
    warded,
    keeper,
    keeperUp,
    harrier,
    harrierUp,
    lanternLit: lit,
    lanternBand: band.name.toLowerCase(),
    lanternBuys: band.buys,
    wisp,
    oil,
    barSeconds,
    nestGems,
    relics: relics.map((id) => RELICS[id].name),
    learned,
    watched,
    veinBand: veinBand.toLowerCase(),
  });

  // Eight lines at a monitor's spacing is more than half of a phone held
  // sideways. Closer together and a size down there, so the room is still
  // the thing on the screen.
  const compact = device === "phone";
  return (
    <div
      data-testid="hud"
      style={{
        position: "fixed",
        top: compact ? 12 : 20,
        left: compact ? 12 : 20,
        padding: compact ? "8px 10px" : "14px 16px",
        background: colors.panel,
        border: `1px solid ${colors.line}`,
        borderRadius: 6,
        fontFamily: FONT,
        fontSize: compact ? text.small : text.body,
        lineHeight: compact ? 1.6 : 2,
        color: colors.ink,
        pointerEvents: "none",
        zIndex: 900,
      }}
    >
      {lines.map((line, i) => {
        /**
         * The rank the line already carries, spent on the screen.
         *
         * `hudLines` has sorted these by how urgently they need reading
         * since the readout was unified, and the component then drew all
         * five ranks in the same size, weight and colour of label - so a
         * Reaper in the room looked exactly like what the floor is made
         * of, and the whole thing read as a table of key-value pairs
         * rather than as something with anything to say. The ordering was
         * doing all the work and none of it was visible.
         *
         * Three tiers, off the rank that is already there: what is taking
         * a life or running out (0-1), what a decision is made on (2-3),
         * and what is merely true (4). The last of those is the floor and
         * the ground - always present, never the thing to read first - so
         * it is small, dim and set below a hairline, out of the way of
         * everything that changes.
         */
        const ambient = line.rank >= 4;
        const urgent = line.rank <= 1;
        const firstAmbient = ambient && (i === 0 || lines[i - 1].rank < 4);
        return (
          <div
            key={line.id}
            data-testid={`hud-${line.id}`}
            style={{
              fontSize: ambient ? text.small : undefined,
              opacity: ambient ? 0.72 : 1,
              marginTop: firstAmbient ? (compact ? 5 : 8) : undefined,
              paddingTop: firstAmbient ? (compact ? 5 : 8) : undefined,
              borderTop: firstAmbient ? `1px solid ${colors.line}` : undefined,
            }}
          >
            <span
              style={{
                color: colors.dim,
                // Quieter than what it labels, always. A label is how you
                // find the fact, not the fact.
                fontSize: ambient ? "0.94em" : "0.88em",
                letterSpacing: "0.08em",
                opacity: 0.85,
              }}
            >
              {line.label}{" "}
            </span>
            <span
              style={{
                color: TONE[line.tone],
                // The one thing about to take a life is allowed to be the
                // loudest thing in the readout.
                fontWeight: urgent ? 700 : 400,
              }}
            >
              {/* Nothing said in colour alone: the mark carries whatever the
                  tone does, for a reader who sees every tone as the same
                  grey. It is the settings' choice, and one place decides
                  what the mark is. */}
              {marks && line.mark ? `${line.mark} ` : ""}
              {line.body}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** The palette, by the name a line asks for. One place turns one into the other. */
const TONE: Record<HudLine["tone"], string> = {
  ink: colors.ink,
  dim: colors.dim,
  gold: colors.gold,
  accent: colors.accent,
  danger: colors.danger,
};

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
  /** The lantern's band: what it is called, and the one thing it buys. */
  band: { name: string; buys: string };
  /**
   * What the floor's heat is called, and which band that is.
   *
   * Named and never counted: the band decides how loudly the readout says
   * it, and the name is the whole of what the player is shown.
   */
  heat: { says: string; band: number };
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
      seen: !lured && wardenMarked(s),
      lit: lanternLit(s),
      oil: Math.ceil(s.oil),
      band: { name: lanternBand(s).name, buys: lanternBand(s).buys },
      lured,
      reeling: wardenStaggered(s),
      warded: wardNow(s) !== null && wardNow(s) === s.currentRoomId,
      // Whole seconds: a bar is forty-five of them and the number is only
      // there to say "soon" or "not yet".
      barSeconds: barredNow(s) ? Math.max(0, Math.ceil(s.barUntil - runClock(s))) : 0,
      heat: { says: heatSays(s), band: heatBand(s) },
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
          was.band.name === now.band.name &&
          was.lured === now.lured &&
          was.reeling === now.reeling &&
          was.warded === now.warded &&
          was.barSeconds === now.barSeconds &&
          was.heat.band === now.heat.band &&
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
