import InteractTrigger from "./InteractTrigger";

interface DoorTriggerProps {
  position: [number, number, number];
  /** Where this door leads, for the prompt. */
  label?: string;
  /** Called when the player confirms they want to go through. */
  onEnter: () => void;
  /** When false the doorway refuses entry (e.g. an unaffordable end door). */
  enabled?: boolean;
  /** Shown instead of the usual prompt when the door will not open. */
  blockedReason?: string;
}

/**
 * A door, in the game's one interaction verb.
 *
 * Doors used to work two ways at once, and both were wrong. Walking into a
 * doorway teleported you immediately, so brushing past a door on the way to a
 * gem threw you into the next room; and the door mesh was clickable, which is
 * undiscoverable in a first-person game and fired whenever a stray click
 * landed on scenery. Now standing near a door offers it and only E takes it.
 *
 * The behaviour lives in InteractTrigger, which the shop counter and the
 * library's lectern also use - one prompt, one key, one set of rules about
 * which of several nearby things you actually meant.
 */
export function DoorTrigger({
  position,
  label,
  onEnter,
  enabled = true,
  blockedReason,
}: DoorTriggerProps) {
  return (
    <InteractTrigger
      position={position}
      label={`Open ${label ?? "door"}`}
      onInteract={onEnter}
      enabled={enabled}
      blockedReason={blockedReason}
    />
  );
}

export default DoorTrigger;
