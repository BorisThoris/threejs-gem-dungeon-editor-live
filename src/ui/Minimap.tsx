import { useEffect, useMemo, useRef, useState } from "react";

import { look } from "../game/input/look";
import { modifiers } from "../game/relics/catalog";
import { mapIsDark, useRun } from "../game/state/run";
import { colors, FONT, text } from "./overlay";

const SIZE = 190;
const CELL = 26;
const GAP = 9;
const SPACING = CELL + GAP;
/**
 * The dial pulls back rather than clipping when a floor is too big for it.
 *
 * Floors are 8 rooms at the top of the dungeon and up to 16 at the bottom,
 * and at a fixed spacing the deep ones ran off the rim - so the Robber's
 * Chart, which is bought to see where the gems are, showed less the deeper
 * you went and it mattered most. The spacing shrinks to fit what the player
 * knows, down to a floor where a room is still a readable square.
 */
const MIN_SPACING = 19;
/** How far from the middle a room may sit and still be drawn whole. */
const RIM = SIZE / 2 - CELL / 2 - 4;
const FADE = "radial-gradient(circle at 50% 50%, #000 58%, transparent 92%)";

/**
 * The dungeon as the player has seen it, turned to face the way they are.
 *
 * A north-up grid asks the player to do the rotation in their head every
 * time they turn a corner, which is exactly the moment they are least able
 * to. So the map turns instead: the room the player is standing in sits at
 * the centre, the whole map rotates under a fixed arrow, and a doorway
 * drawn towards the top of the dial is a doorway ahead of them.
 *
 * The rotation is written straight to a transform on a rAF loop rather than
 * held in state. Yaw changes every frame a mouse moves, and a minimap that
 * re-rendered at that rate would cost more than it is worth.
 *
 * Rooms are shown once the player has been in one next door, so the map is
 * a record of what has been learned. Two relics add to it: the Warden's
 * Lantern rings the room the Warden is in, the Robber's Chart dots the
 * rooms that still hold a gem.
 */
export function Minimap() {
  const dungeon = useRun((s) => s.dungeon);
  const currentRoomId = useRun((s) => s.currentRoomId);
  const visited = useRun((s) => s.visited);
  const marks = useRun((s) => s.marks);
  const gemRooms = useRun((s) => s.gemRooms);
  const wardenRoomId = useRun((s) => s.wardenRoomId);
  const unlocked = useRun((s) => s.unlocked);
  const shows = useRun((s) => modifiers(s.relics));
  const mapped = useRun((s) => s.mapped);
  // The nest goes on the dial the moment something of yours is in it. That
  // is the whole difference between a theft and a punishment: the gems are
  // not gone, they are somewhere, and the map says where.
  const nestRoomId = useRun((s) => (s.nestGems > 0 && s.nestSeen ? s.nestRoomId : null));
  const [dark, setDark] = useState(() => mapIsDark(useRun.getState()));

  // Gloom runs out on a clock, not on a state change, so the map has to
  // check rather than wait to be told.
  useEffect(() => {
    const t = window.setInterval(() => setDark(mapIsDark(useRun.getState())), 400);
    return () => window.clearInterval(t);
  }, []);
  const dial = useRef<SVGGElement>(null);

  // The map turns to put the player's heading at the top. Smoothed, so a
  // flick of the mouse does not snap the whole dial round.
  useEffect(() => {
    // Plus the yaw, not minus it. The camera at yaw t faces world
    // (-sin t, -cos t), which on a map with world +z drawn downwards is the
    // same pair in screen coordinates; SVG rotate(a) puts that at the top
    // only when a is +t. With the sign flipped the map was mirrored east to
    // west and right exactly when facing north or south, which is why it
    // survived being looked at.
    let shown = look.yaw;
    let raf = 0;
    const spin = () => {
      const want = look.yaw;
      // Take the short way round, so crossing north does not unwind a circle.
      let delta = ((want - shown + Math.PI) % (Math.PI * 2)) - Math.PI;
      if (delta < -Math.PI) delta += Math.PI * 2;
      shown += delta * 0.25;
      if (dial.current) {
        dial.current.setAttribute("transform", `rotate(${(shown * 180) / Math.PI})`);
      }
      raf = requestAnimationFrame(spin);
    };
    raf = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(raf);
  }, []);

  const dialled = useMemo(() => {
    if (!dungeon || !currentRoomId) return null;
    const here = dungeon.rooms.find((r) => r.id === currentRoomId);
    if (!here) return null;
    const seen = new Set(visited);
    const known = new Set<string>();
    // A Scroll of Mapping shows the floor; walking it is the usual way.
    if (mapped) for (const room of dungeon.rooms) known.add(room.id);
    for (const id of visited) {
      known.add(id);
      const room = dungeon.rooms.find((r) => r.id === id);
      for (const link of Object.values(room?.links ?? {})) if (link) known.add(link);
    }
    // A nest that has your gems in it is on the map whether or not you
    // have walked that far: being told where they went is the point.
    if (nestRoomId) known.add(nestRoomId);
    const shown = dungeon.rooms.filter((r) => known.has(r.id));
    // Room-grid offsets from the room the player is standing in, and the
    // spacing that keeps the farthest of them on the dial.
    const reach = Math.max(
      1,
      ...shown.map((r) => Math.max(Math.abs(r.grid.x - here.grid.x), Math.abs(r.grid.z - here.grid.z)))
    );
    const spacing = Math.max(MIN_SPACING, Math.min(SPACING, RIM / reach));
    const cell = CELL * (spacing / SPACING);
    const cells = shown.map((r) => ({
      id: r.id,
      x: (r.grid.x - here.grid.x) * spacing,
      y: (r.grid.z - here.grid.z) * spacing,
      state: r.id === currentRoomId ? "here" : seen.has(r.id) ? "seen" : "known",
      isExit: r.id === dungeon.endId,
      isVault: r.id === dungeon.vaultId && !unlocked.includes(r.id),
      isNest: r.id === nestRoomId,
      marked: marks.includes(r.id),
      hasWarden: shows.showsWarden && r.id === wardenRoomId,
      hasGem:
        shows.showsGems &&
        r.id !== currentRoomId &&
        !gemRooms.includes(r.id) &&
        r.kind !== "start" &&
        r.kind !== "end",
      links: Object.entries(r.links)
        .filter(([, to]) => to && known.has(to))
        .map(([dir]) => dir),
    }));
    return { cells, spacing, cell };
  }, [dungeon, currentRoomId, visited, gemRooms, wardenRoomId, shows, mapped, unlocked, nestRoomId, marks]);

  if (!dialled) return null;
  const { cells, spacing, cell } = dialled;

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        width: SIZE,
        height: SIZE,
        borderRadius: "50%",
        background: colors.panel,
        border: `1px solid ${colors.line}`,
        overflow: "hidden",
        fontFamily: FONT,
        pointerEvents: "none",
        zIndex: 900,
      }}
    >
      {/* The dial fades at its rim, so rooms leave the map rather than being
          chopped off by its edge. A CSS mask, not an SVG one: an SVG mask's
          region is measured against the masked element's bounding box, which
          moves as rooms come and go, so the map would fade unpredictably. */}
      <svg
        width={SIZE}
        height={SIZE}
        style={{
          display: "block",
          maskImage: FADE,
          WebkitMaskImage: FADE,
          opacity: dark ? 0 : 1,
          transition: "opacity 500ms ease",
        }}
      >
        <g transform={`translate(${SIZE / 2} ${SIZE / 2})`}>
          <g ref={dial}>
            {cells.map((c) => (
              <g key={c.id} transform={`translate(${c.x} ${c.y})`}>
                {c.links.map((dir) => {
                  const dx = dir === "east" ? 1 : dir === "west" ? -1 : 0;
                  const dy = dir === "south" ? 1 : dir === "north" ? -1 : 0;
                  return (
                    <line
                      key={dir}
                      x1={dx * (cell / 2)}
                      y1={dy * (cell / 2)}
                      x2={dx * (spacing / 2)}
                      y2={dy * (spacing / 2)}
                      stroke="rgba(255,255,255,0.3)"
                      strokeWidth={3.5}
                    />
                  );
                })}
                <rect
                  x={-cell / 2}
                  y={-cell / 2}
                  width={cell}
                  height={cell}
                  rx={4}
                  fill={c.state === "here" ? colors.accent : c.state === "seen" ? "#3a3f4b" : "#191d25"}
                  stroke={
                    c.isExit || c.isVault ? colors.gold : c.state === "known" ? colors.line : "none"
                  }
                  strokeWidth={c.isExit || c.isVault ? 2.5 : 1}
                  strokeDasharray={c.isVault ? "4 3" : undefined}
                />
                {c.hasGem && <circle r={3.4} fill={colors.accent} opacity={0.95} />}
                {/* The player's own mark. Nothing in the game reads it,
                    which is what makes it worth making: it means whatever
                    they meant by it. */}
                {c.marked && (
                  <text
                    data-testid="map-mark"
                    y={4.5}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={700}
                    fill={c.state === "here" ? "#0a0c12" : colors.ink}
                  >
                    ?
                  </text>
                )}
                {/* Not the gold of an exit or a vault, and not the ring of
                    the Warden: what is in there is yours, so it is drawn in
                    the colour gems are drawn in everywhere else. */}
                {c.isNest && (
                  <circle
                    r={cell / 2 + 2}
                    fill="none"
                    stroke={colors.accent}
                    strokeWidth={2}
                    strokeDasharray="3 3"
                  />
                )}
                {c.hasWarden && (
                  <circle r={cell / 2 + 2} fill="none" stroke={colors.danger} strokeWidth={2.5} />
                )}
              </g>
            ))}
          </g>
        </g>
        {/* The player: always at the centre, always pointing up. */}
        <g transform={`translate(${SIZE / 2} ${SIZE / 2})`}>
          <path d="M 0 -9 L 6 7 L 0 3 L -6 7 Z" fill="#0a0c12" stroke="#0a0c12" strokeWidth={3} />
          <path d="M 0 -9 L 6 7 L 0 3 L -6 7 Z" fill={colors.ink} />
        </g>
      </svg>
      {dark && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: text.small,
            color: colors.dim,
            letterSpacing: "0.08em",
          }}
        >
          GLOOM
        </div>
      )}
    </div>
  );
}
