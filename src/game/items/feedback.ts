import { afflictionBlurb } from "./afflictions";
import { ITEMS, type ItemId } from "./catalog";
import { avariceGems, healingLives, type Charge } from "./charge";

/** Explain the charged kind just used, including costs hidden by its appearance. */
export function itemUseBlurb(id: ItemId, charge: Charge, purpose?: "vault"): string {
  if (id === "snare" && purpose === "vault") return "Spent holding the vault mechanism for one entry.";
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
