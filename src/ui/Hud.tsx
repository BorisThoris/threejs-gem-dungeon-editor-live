import { modifiers } from "../game/relics/catalog";
import { RELICS } from "../game/relics/catalog";
import { spareGems, tollNow, useCurrentRoom, useRun } from "../game/state/run";
import { KIND_TITLE } from "../game/rooms/kinds";
import { alarmLabel, behaviourFor } from "../game/warden/tuning";
import { FLOORS } from "../game/world";
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
  const freeHit = useRun((s) => modifiers(s.relics).freeHitPerFloor && !s.freeHitUsed);
  const room = useCurrentRoom();

  const owed = Math.max(0, toll - gems);
  const rouse = behaviourFor(alarm).rouse;
  const alarmColour = ALARM_COLOUR[Math.min(3, Math.floor(rouse * 3.99))];

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
      </div>
      <div>
        <span style={{ color: colors.dim }}>GEMS </span>
        <span style={{ color: colors.accent }}>{gems}</span>
        <span style={{ color: colors.dim }}> · toll {toll} · </span>
        {owed > 0 ? (
          <span style={{ color: colors.danger }}>{owed} short</span>
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
      {wardenAwake && (
        <div>
          <span style={{ color: colors.dim }}>WARDEN </span>
          <span style={{ color: alarmColour }}>{alarmLabel(alarm)}</span>
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
