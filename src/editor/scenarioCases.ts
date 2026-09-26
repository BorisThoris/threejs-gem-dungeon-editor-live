import { generateRunFloor } from "../game/dungeon/runFloor";
import { ROOM_KINDS, SHAPES, type RoomKind, type Shape } from "../game/dungeon/types";
import { FLOORS } from "../game/world";
import type { Scenario } from "./scenario";

export interface ScenarioCase extends Scenario {
  kind: RoomKind;
  shape: Shape;
  district: string;
  coversKind: boolean;
  coversShape: boolean;
}

/** A small deterministic cover of every generated kind and footprint. */
export function scenarioCoverageCases(maxSeed = 32): ScenarioCase[] {
  const uncoveredKinds = new Set<RoomKind>(ROOM_KINDS);
  const uncoveredShapes = new Set<Shape>(SHAPES);
  const cases: ScenarioCase[] = [];
  for (let seed = 1; seed <= maxSeed && (uncoveredKinds.size || uncoveredShapes.size); seed++) {
    for (let floor = 1; floor <= FLOORS; floor++) {
      const dungeon = generateRunFloor(seed, floor);
      for (const room of dungeon.rooms) {
        const coversKind = uncoveredKinds.has(room.kind);
        const coversShape = uncoveredShapes.has(room.shape);
        if (!coversKind && !coversShape) continue;
        cases.push({ seed, floor, roomId: room.id, roomBias: false,
          kind: room.kind, shape: room.shape, district: room.district ?? "unknown", coversKind, coversShape });
        uncoveredKinds.delete(room.kind);
        uncoveredShapes.delete(room.shape);
      }
    }
  }
  return cases;
}
