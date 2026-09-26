import { bus } from "../game/events";
import { DEFAULT_DELVER } from "../game/delvers/catalog";
import { OPPOSITE, type Dir } from "../game/dungeon/types";
import { spawnAfterTravel, spawnAtStart } from "../game/dungeon/layout";
import { generateRunFloor } from "../game/dungeon/runFloor";
import { useRun } from "../game/state/run";
import { FLOORS } from "../game/world";

export interface Scenario {
  seed: number;
  floor: number;
  roomId: string;
  roomBias: boolean;
}

export const MAX_SCENARIO_SEED = 0xffffffff;
/** Numeric controls must always produce a seed that a replay URL can accept. */
export function scenarioSeedInput(value: string): number {
  return Math.max(1, Math.min(MAX_SCENARIO_SEED, Math.floor(Number(value) || 1)));
}

/** A shareable development URL. The production app ignores this route. */
export function scenarioUrl(scenario: Scenario): string {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("scenario", "1");
  url.searchParams.set("seed", String(scenario.seed));
  url.searchParams.set("floor", String(scenario.floor));
  url.searchParams.set("room", scenario.roomId);
  if (scenario.roomBias) url.searchParams.set("bias", "1");
  return url.toString();
}

/** Inspect the same generated floor and selected room in the World atlas. */
export function atlasUrl(scenario: Scenario): string {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("editor", "1");
  url.searchParams.set("tab", "world");
  url.searchParams.set("seed", String(scenario.seed));
  url.searchParams.set("floor", String(scenario.floor));
  url.searchParams.set("room", scenario.roomId);
  if (scenario.roomBias) url.searchParams.set("bias", "1");
  return url.toString();
}

export function scenarioFromSearch(search: string): Scenario | null {
  const params = new URLSearchParams(search);
  if (!params.has("scenario")) return null;
  const seed = Number(params.get("seed"));
  const floor = Number(params.get("floor"));
  const roomId = params.get("room") ?? "";
  if (!Number.isInteger(seed) || seed < 1 || seed > MAX_SCENARIO_SEED ||
    !Number.isInteger(floor) || floor < 1 || floor > FLOORS || !/^(start|room_\d+)$/.test(roomId)) return null;
  return { seed, floor, roomId, roomBias: params.get("bias") === "1" };
}

function waitForRoom(roomId: string, floor: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => { unsubscribe(); reject(Error(`Room ${roomId} on floor ${floor} did not mount`)); }, 12000);
    const check = () => {
      const state = useRun.getState();
      if (state.phase !== "playing" || state.floor !== floor || state.currentRoomId !== roomId || state.transitioning) return;
      window.clearTimeout(timer);
      unsubscribe();
      resolve();
    };
    const unsubscribe = useRun.subscribe(check);
    check();
  });
}

let started = false;

/** Stage a real run through its own descent resets, then mount one selected room. */
export async function launchScenario(scenario: Scenario): Promise<void> {
  if (started) return; // React Strict Mode runs the mount effect twice in development.
  started = true;
  const run = useRun.getState();
  run.startRun(scenario.seed, DEFAULT_DELVER);
  await waitForRoom("start", 1);

  if (scenario.roomBias) {
    const state = useRun.getState();
    useRun.setState({ relics: [...state.relics, "tally"] });
    if (scenario.floor === 1) useRun.setState({ dungeon: generateRunFloor(scenario.seed, 1, true) });
  }

  for (let floor = 2; floor <= scenario.floor; floor++) {
    const endId = useRun.getState().dungeon!.endId;
    useRun.setState({ currentRoomId: endId, transitioning: true });
    useRun.getState().roomReady(endId);
    await waitForRoom("start", floor);
  }

  let state = useRun.getState();
  // A hidden chamber has no doorway until its host wall is opened. Use the
  // game's own reveal action so the room, map, and return door agree.
  const secretHost = state.dungeon!.rooms.find(candidate => candidate.secret?.to === scenario.roomId);
  if (secretHost) {
    state.revealSecret(secretHost.id);
    state = useRun.getState();
  }
  const room = state.dungeon!.rooms.find(candidate => candidate.id === scenario.roomId);
  if (!room) throw Error(`Room ${scenario.roomId} is absent from seed ${scenario.seed}, floor ${scenario.floor}`);
  if (room.id === state.dungeon!.startId) return;
  const entrance = (Object.keys(room.links) as Dir[]).find(dir => room.links[dir]);
  if (!entrance) throw Error(`Room ${room.id} has no entrance`);
  const spawn = spawnAfterTravel(room, OPPOSITE[entrance]);
  // The exit is a stair: reporting it ready would descend again. Keep its
  // preview playable and leave all other rooms to their normal mount signal.
  const transitioning = room.id !== state.dungeon!.endId;
  useRun.setState({ currentRoomId: room.id, visited: [state.dungeon!.startId, room.id],
    roomsSeen: state.roomsSeen + 1, enteredBy: entrance, transitioning });
  bus.emit("teleport", { position: spawn.position, yaw: spawn.yaw });
  bus.emit("lookSet", { yaw: spawn.yaw, pitch: 0 });
  if (transitioning) await waitForRoom(room.id, scenario.floor);
}
