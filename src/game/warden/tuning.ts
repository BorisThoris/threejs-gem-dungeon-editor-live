import {
  ALARM_HUNTS_AT,
  ALARM_MAX,
  WARDEN_SPEED_CALM,
  WARDEN_SPEED_ROUSED,
  WARDEN_STEP_CALM_S,
  WARDEN_STEP_ROUSED_S,
} from "../world";

/**
 * How roused the Warden is, from the floor's alarm and whether it has just
 * heard the player. One place, so the driver, the component, the audio and
 * the HUD all agree about what a given alarm level means.
 */
export interface WardenBehaviour {
  /** 0 (calm) to 1 (fully roused). */
  rouse: number;
  /** Seconds between room-to-room moves. */
  stepSeconds: number;
  /** Units per second while crossing a room towards the player. */
  speed: number;
  /** It walks towards the player's room rather than wandering. */
  hunts: boolean;
}

/**
 * @param heard Whether a sprint has just given the player's room away. It
 *   changes only whether the Warden walks towards them - being loud tells
 *   it where you are, it does not make it angrier - so the alarm still owns
 *   the speed and the step.
 */
export function behaviourFor(alarm: number, heard = false): WardenBehaviour {
  const rouse = Math.max(0, Math.min(1, alarm / ALARM_MAX));
  const lerp = (a: number, b: number) => a + (b - a) * rouse;
  return {
    rouse,
    stepSeconds: lerp(WARDEN_STEP_CALM_S, WARDEN_STEP_ROUSED_S),
    speed: lerp(WARDEN_SPEED_CALM, WARDEN_SPEED_ROUSED),
    hunts: heard || alarm >= ALARM_HUNTS_AT,
  };
}

/** What the HUD calls the current state of the floor. */
export function alarmLabel(
  alarm: number,
  heard = false,
  lured = false,
  reeling = false,
  seen = false
): string {
  // Outranks everything else it could be doing: whatever the floor's alarm
  // says, for these few seconds it is not coming.
  if (reeling) return "Reeling";
  if (lured) return "Following a noise";
  // Which sense gave the player away, because the two have different
  // answers: one is put down with a key, the other by stopping.
  if (seen) return "Sees your light";
  if (heard) return "Heard you";
  if (alarm <= 0) return "Still";
  if (alarm < ALARM_HUNTS_AT) return "Stirring";
  if (alarm < ALARM_MAX) return "Hunting";
  return "Enraged";
}
