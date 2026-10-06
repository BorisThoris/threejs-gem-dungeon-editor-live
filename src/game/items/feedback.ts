import { afflictionBlurb } from "./afflictions";
import { ITEMS, WARD_S, type ItemId } from "./catalog";
import { avariceGems, healingLives, scaled, type Charge } from "./charge";

/** Explain the charged kind just used, including costs hidden by its appearance. */
export function itemUseBlurb(id: ItemId, charge: Charge, purpose?: "vault" | "grate"): string {
  if (id === "snare" && purpose === "vault") return "Spent holding the vault mechanism for one entry.";
  if (id === "bomb" && purpose === "grate") return "Left unlit to hold this grate open. It will not explode.";
  if (id === "wardstone") return `The Warden will not come into this room for ${scaled(WARD_S, charge)} seconds. Setting another Ward Stone moves the protection.`;
  if (id === "avarice") {
    const gems = avariceGems(charge);
    return `${gems} ${gems === 1 ? "gem" : "gems"}, and the floor notices.`;
  }
  if (id === "healing") {
    const lives = healingLives(charge);
    return `Restores up to ${lives} ${lives === 1 ? "life" : "lives"}.${charge === "cursed" ? " The floor hears you." : ""}`;
  }
  if (id === "mapping" && charge === "cursed") {
    return `The floor is mapped. ${afflictionBlurb("gloom")}`;
  }
  return ITEMS[id].blurb;
}
