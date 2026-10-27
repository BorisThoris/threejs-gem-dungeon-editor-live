/** Combat, equipment inspection and the viewmodel read this same weapon table. */
export const WEAPONS = {
  fists: { name: "Bare hands", damage: 0, reach: 3, arc: 50, charge: 0.3, recovery: 2.4, price: 0, colour: "#bf9673", description: "Shove threats away without wounding them." },
  sword: { name: "Iron sword", damage: 2, reach: 2.8, arc: 50, charge: 0.3, recovery: 1.1, price: 3, colour: "#bcc9d4", description: "A balanced blade for close combat." },
  spear: { name: "Watchman's spear", damage: 2, reach: 4.2, arc: 22, charge: 0.4, recovery: 1.5, price: 4, colour: "#b2d6cb", description: "Long reach, but a narrow thrust. Aim carefully." },
  axe: { name: "Executioner's axe", damage: 4, reach: 2.5, arc: 65, charge: 0.6, recovery: 2, price: 5, colour: "#d6ac83", description: "A broad, heavy swing with a long recovery." },
} as const;
export type WeaponId = keyof typeof WEAPONS;
export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];
export const weaponFor = (state: { equippedWeapon?: WeaponId }) => WEAPONS[state.equippedWeapon ?? "fists"];
export const ENEMY_HEALTH = { warden: 12, harrier: 6 } as const;
