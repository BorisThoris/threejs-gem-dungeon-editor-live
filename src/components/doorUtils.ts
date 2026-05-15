// Door state type
export type DoorState = "closed" | "opening" | "open" | "closing" | "locked" | "broken";

// Door type
export type DoorType = "standard" | "locked" | "secret";

// Door state transition validation
export const canTransition = (from: DoorState, to: DoorState): boolean => {
  const validTransitions: Record<DoorState, DoorState[]> = {
    closed: ["opening", "locked"],
    opening: ["open"],
    open: ["closing"],
    closing: ["closed"],
    locked: ["closed"],
    broken: [], // Cannot transition from broken
  };
  return validTransitions[from]?.includes(to) || false;
};

// Door behavior configuration
export type DoorBehavior = {
  requiresInteraction: boolean;
  canAutoClose: boolean;
  requiresKey: boolean;
  interactionType: "standard" | "hidden";
  autoCloseDelay?: number;
};

// Runtime export for compatibility
export const DoorBehavior = {} as DoorBehavior;

export const getDoorBehavior = (type: DoorType): DoorBehavior => {
  switch (type) {
    case "locked":
      return {
        requiresInteraction: true,
        canAutoClose: false,
        requiresKey: true,
        interactionType: "standard",
      };
    case "secret":
      return {
        requiresInteraction: true,
        canAutoClose: true,
        requiresKey: false,
        interactionType: "hidden",
      };
    default:
      return {
        requiresInteraction: true,
        canAutoClose: true,
        requiresKey: false,
        interactionType: "standard",
        autoCloseDelay: 3000,
      };
  }
};
