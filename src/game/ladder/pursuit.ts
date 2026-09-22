export type Pursuer = "warden" | "reaper" | "harrier" | "cutpurse";
export const PURSUIT_DELAY_S = 2.5;
export const TRAIL_MEMORY_S = 1.25;

interface Trail {
  seenRoom: string | null;
  seenAt: number;
  from: string | null;
  to: string | null;
  remaining: number;
}
const fresh = (): Trail => ({ seenRoom: null, seenAt: -Infinity, from: null, to: null, remaining: 0 });
const trails: Record<Pursuer, Trail> = { warden: fresh(), reaper: fresh(), harrier: fresh(), cutpurse: fresh() };

export function resetPursuit(): void {
  trails.warden = fresh();
  trails.reaper = fresh();
  trails.harrier = fresh();
  trails.cutpurse = fresh();
}

/** Only a local perception may renew the player's trail. */
export function perceive(who: Pursuer, room: string, now: number): void {
  Object.assign(trails[who], { seenRoom: room, seenAt: now });
}

/** Returns true when another doorway has broken an unfinished chase. */
export function leaveTrail(who: Pursuer, enemyRoom: string | null, from: string, to: string,
  now: number, detected: boolean): boolean {
  const trail = trails[who];
  const escaped = trail.to !== null;
  const follows = !escaped && enemyRoom === from && detected
    && trail.seenRoom === from && now - trail.seenAt <= TRAIL_MEMORY_S;
  trails[who] = follows ? { ...fresh(), from, to, remaining: PURSUIT_DELAY_S } : fresh();
  return escaped;
}

/** Active gameplay time only: pausing, loading and staggering cannot spend the delay. */
export function advanceTrail(who: Pursuer, enemyRoom: string | null, playerRoom: string,
  delta: number, detected: boolean): { waiting: boolean; to: string | null } {
  const trail = trails[who];
  if (!trail.to) return { waiting: false, to: null };
  if (!detected || enemyRoom !== trail.from || playerRoom !== trail.to) {
    trails[who] = fresh();
    return { waiting: false, to: null };
  }
  trail.remaining -= Math.min(Math.max(delta, 0), 0.1);
  if (trail.remaining > 0) return { waiting: true, to: null };
  const to = trail.to;
  trails[who] = fresh();
  return { waiting: false, to };
}
