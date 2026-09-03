import { useEffect, useState } from "react";

import { modifiers } from "../game/relics/catalog";
import { RELICS } from "../game/relics/catalog";
import { lureNow, spareGems, tollNow, useCurrentRoom, useRun, wardenHears } from "../game/state/run";
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
  const keys = useRun((s) => s.keys);
  const freeHit = useRun((s) => modifiers(s.relics).freeHitPerFloor && !s.freeHitUsed);
  const room = useCurrentRoom();

  const { heard, lured } = useWardenSense();

  const owed = Math.max(0, toll - gems);
  const rouse = behaviourFor(alarm, heard).rouse;
  const alarmColour = lured
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
          <span style={{ color: alarmColour }}>{alarmLabel(alarm, heard, lured)}</span>
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
function useWardenSense(): { heard: boolean; lured: boolean } {
  const read = () => {
    const s = useRun.getState();
    const lured = lureNow(s) !== null;
    return { heard: !lured && wardenHears(s), lured };
  };
  const [sense, setSense] = useState(read);
  useEffect(() => {
    const t = window.setInterval(
      () => setSense((was) => {
        const now = read();
        return was.heard === now.heard && was.lured === now.lured ? was : now;
      }),
      250
    );
    return () => window.clearInterval(t);
  }, []);
  return sense;
}
