import { useCurrentRoom, useRun } from "../game/state/run";
import { KIND_TITLE } from "../game/rooms/kinds";
import { FLOORS, GEMS_FOR_EXIT } from "../game/world";
import { FONT, colors, text } from "./overlay";

/** Lives, gems and where you are - read straight from the run store. */
export function Hud() {
  const lives = useRun((s) => s.lives);
  const maxLives = useRun((s) => s.maxLives);
  const gems = useRun((s) => s.gems);
  const floor = useRun((s) => s.floor);
  const room = useCurrentRoom();
  const needed = Math.max(0, GEMS_FOR_EXIT - gems);

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
      </div>
      <div>
        <span style={{ color: colors.dim }}>GEMS </span>
        <span style={{ color: colors.accent }}>{gems}</span>
        <span style={{ color: colors.dim }}>
          {" "}
          {needed > 0 ? `· ${needed} more for the exit` : "· the exit is open"}
        </span>
      </div>
      {room && (
        <div>
          <span style={{ color: colors.dim }}>FLOOR </span>
          {floor}
          <span style={{ color: colors.dim }}>/{FLOORS} · </span>
          {KIND_TITLE[room.kind]}
        </div>
      )}
    </div>
  );
}
