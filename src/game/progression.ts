import { ENEMY_HEALTH } from "./items/weapons";

/** Finite, deterministic exponential difficulty. The numeric ceiling is defensive. */
export function expeditionPower(cycle: number): number {
  return 2 ** Math.min(40, Math.max(0, Math.floor(Number.isFinite(cycle) ? cycle : 0)));
}
export const expeditionHealth = (cycle: number) => ({
  warden: ENEMY_HEALTH.warden * expeditionPower(cycle),
  harrier: ENEMY_HEALTH.harrier * expeditionPower(cycle),
});
export function expeditionSeed(seed: number, cycle: number): number {
  const next = (Math.imul(seed, 1664525) + 1013904223 + cycle) >>> 0;
  return next === (seed >>> 0) ? (next ^ 0x9e3779b9) >>> 0 : next;
}

export const BOSS_ROOM_ID = "crown-chamber";
export const BOSS_HEALTH = 24;
export const BOSS_REWARD = 10;
export const BOSS_PERIOD = 4;
export const BOSS_WARNING = 1.4;
export const BOSS_RADIUS = 3.6;
export function bossBeat(elapsed: number) {
  const time = Math.max(0, elapsed), index = Math.floor(time / BOSS_PERIOD);
  return { index, outer: index % 2 === 1, warning: time % BOSS_PERIOD < BOSS_WARNING,
    progress: Math.min(1, (time % BOSS_PERIOD) / BOSS_WARNING) };
}
export function bossZoneHits(x: number, z: number, outer: boolean): boolean {
  const distance = Math.hypot(x, z);
  return outer ? distance >= BOSS_RADIUS : distance <= BOSS_RADIUS;
}
