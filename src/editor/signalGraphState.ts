import { EMISSIONS, HELD, type EmissionId, type HeldId } from "../game/din/emissions";
import { SUSCEPTIBILITY, type ReceiverId } from "../game/din/susceptibility";
import type { Footing } from "../game/rooms/underfoot";
import { FLOORS } from "../game/world";
import { scenarioSeedInput } from "./scenario";

export type SignalSource = { kind: "impulse"; id: EmissionId } | { kind: "held"; id: HeldId };
export const SIGNAL_FOOTINGS: Footing[] = ["stone", "water", "soft", "wood", "metal", "crust", "wax"];
export const SIGNAL_AGE_MAX = 10;
export const SIGNAL_STRENGTH_MAX = 1.5;
export interface SignalGraphState {
  source: SignalSource; seed: number; floor: number; roomBias: boolean;
  fromId: string; toId: string; barredDoor: string; age: number;
  footing: Footing; heldStrength: number; selectedReceiver: ReceiverId;
}

/** Untrusted links select existing declarations; they never invent signal rules. */
export function signalGraphFromSearch(search: string): SignalGraphState {
  const params = new URLSearchParams(search);
  const numeric = (key: string, fallback: number, min: number, max: number, step: number) => {
    const value = params.has(key) ? Number(params.get(key)) : fallback;
    return Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value / step) / (1 / step))) : fallback;
  };
  const [kind, id] = (params.get("source") ?? "").split(":");
  const source: SignalSource = kind === "held" && Object.hasOwn(HELD, id)
    ? { kind, id: id as HeldId } : kind === "impulse" && Object.hasOwn(EMISSIONS, id)
      ? { kind, id: id as EmissionId } : { kind: "impulse", id: "bombBurst" };
  const footing = params.get("footing") as Footing;
  const receiver = params.get("receiver") ?? "warden";
  return { source, seed: scenarioSeedInput(params.get("seed") ?? "1"),
    floor: numeric("floor", 1, 1, FLOORS, 1), roomBias: params.get("bias") === "1",
    fromId: params.get("from") ?? "start", toId: params.get("to") ?? "start", barredDoor: params.get("bar") ?? "",
    age: numeric("age", 0, 0, SIGNAL_AGE_MAX, 0.5),
    footing: SIGNAL_FOOTINGS.includes(footing) ? footing : "stone",
    heldStrength: numeric("strength", 1, 0, SIGNAL_STRENGTH_MAX, 0.1),
    selectedReceiver: Object.hasOwn(SUSCEPTIBILITY, receiver) ? receiver as ReceiverId : "warden" };
}

/** Call with the effective rooms and bar after validating them against the generated floor. */
export function signalGraphUrl(state: SignalGraphState): string {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  const fields = { editor: "1", tab: "signals", source: `${state.source.kind}:${state.source.id}`,
    seed: state.seed, floor: state.floor, from: state.fromId, to: state.toId, bar: state.barredDoor,
    age: state.age, footing: state.footing, strength: state.heldStrength, receiver: state.selectedReceiver };
  for (const [key, value] of Object.entries(fields)) url.searchParams.set(key, String(value));
  if (state.roomBias) url.searchParams.set("bias", "1");
  return url.toString();
}
