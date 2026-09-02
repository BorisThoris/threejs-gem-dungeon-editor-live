import { useMemo } from "react";

import { modifiers } from "../game/relics/catalog";
import { useRun } from "../game/state/run";
import { colors, FONT } from "./overlay";

const CELL = 18;
const GAP = 6;

/**
 * The dungeon as the player has seen it: a grid of rooms, the one they are
 * in lit, the ones they have been in dim, the ones they know are next door
 * outlined. The exit shows once a room next to it has been visited.
 *
 * Two relics write here. The Warden's Lantern marks the room the Warden is
 * in; the Robber's Chart marks rooms that still hold a gem. Both are bought
 * information, so neither is shown without them.
 *
 * Replaces 1,300 lines of rotating compass minimap with a fullscreen mode
 * and a debug key that completed rooms.
 */
export function Minimap() {
  const dungeon = useRun((s) => s.dungeon);
  const currentRoomId = useRun((s) => s.currentRoomId);
  const visited = useRun((s) => s.visited);
  const gemRooms = useRun((s) => s.gemRooms);
  const wardenRoomId = useRun((s) => s.wardenRoomId);
  const shows = useRun((s) => modifiers(s.relics));

  const cells = useMemo(() => {
    if (!dungeon) return null;
    const seen = new Set(visited);
    const known = new Set<string>();
    for (const id of visited) {
      known.add(id);
      const room = dungeon.rooms.find((r) => r.id === id);
      for (const link of Object.values(room?.links ?? {})) if (link) known.add(link);
    }
    const rooms = dungeon.rooms.filter((r) => known.has(r.id));
    const xs = rooms.map((r) => r.grid.x);
    const zs = rooms.map((r) => r.grid.z);
    const minX = Math.min(...xs);
    const minZ = Math.min(...zs);
    return {
      width: (Math.max(...xs) - minX + 1) * (CELL + GAP) - GAP,
      height: (Math.max(...zs) - minZ + 1) * (CELL + GAP) - GAP,
      items: rooms.map((r) => ({
        id: r.id,
        x: (r.grid.x - minX) * (CELL + GAP),
        y: (r.grid.z - minZ) * (CELL + GAP),
        state: r.id === currentRoomId ? "here" : seen.has(r.id) ? "seen" : "known",
        isExit: r.id === dungeon.endId,
        hasWarden: shows.showsWarden && r.id === wardenRoomId,
        hasGem: shows.showsGems && r.id !== currentRoomId && !gemRooms.includes(r.id) && r.kind !== "start" && r.kind !== "end",
        links: Object.entries(r.links)
          .filter(([, to]) => to && known.has(to))
          .map(([dir]) => dir),
      })),
    };
  }, [dungeon, currentRoomId, visited, gemRooms, wardenRoomId, shows]);

  if (!cells) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        padding: 12,
        background: colors.panel,
        border: `1px solid ${colors.line}`,
        borderRadius: 6,
        fontFamily: FONT,
        pointerEvents: "none",
        zIndex: 900,
      }}
    >
      <svg width={cells.width} height={cells.height} style={{ display: "block", overflow: "visible" }}>
        {cells.items.map((c) => (
          <g key={c.id}>
            {c.links.map((dir) => {
              const cx = c.x + CELL / 2;
              const cy = c.y + CELL / 2;
              const dx = dir === "east" ? GAP + 2 : dir === "west" ? -(GAP + 2) : 0;
              const dy = dir === "south" ? GAP + 2 : dir === "north" ? -(GAP + 2) : 0;
              return (
                <line
                  key={dir}
                  x1={cx}
                  y1={cy}
                  x2={cx + dx * 1.6}
                  y2={cy + dy * 1.6}
                  stroke={colors.line}
                  strokeWidth={2}
                />
              );
            })}
            <rect
              x={c.x}
              y={c.y}
              width={CELL}
              height={CELL}
              rx={3}
              fill={c.state === "here" ? colors.accent : c.state === "seen" ? "#3a3f4b" : "transparent"}
              stroke={c.isExit ? colors.gold : c.state === "known" ? colors.line : "none"}
              strokeWidth={c.isExit ? 2 : 1}
            />
            {c.hasGem && (
              <circle cx={c.x + CELL / 2} cy={c.y + CELL / 2} r={2.6} fill={colors.accent} opacity={0.9} />
            )}
            {c.hasWarden && (
              <circle
                cx={c.x + CELL / 2}
                cy={c.y + CELL / 2}
                r={CELL / 2 - 1}
                fill="none"
                stroke={colors.danger}
                strokeWidth={2}
              />
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
