import { WEAPONS, WEAPON_IDS } from "../game/items/weapons";
import { canSpend, useCurrentRoom, useRun } from "../game/state/run";
import { colors, secondaryButton, text } from "./overlay";

/** Equipment is managed while paused; purchases require actually reaching a shop. */
export function Equipment() {
  const run = useRun();
  const shop = useCurrentRoom()?.kind === "shop";
  return <section aria-label="Weapons" style={{ marginBottom: 20 }}>
    <h3 style={{ color: colors.ink, fontSize: text.body }}>Weapons</h3>
    <p style={{ color: colors.dim, fontSize: text.small }}>Equipped: {WEAPONS[run.equippedWeapon].name}. Left click, Space or RT attacks.</p>
    {WEAPON_IDS.filter(id => shop || run.weapons.includes(id)).map(id => {
      const weapon = WEAPONS[id], owned = run.weapons.includes(id), equipped = run.equippedWeapon === id;
      return <div key={id} style={{ borderTop: `1px solid ${colors.line}`, paddingTop: 8 }}>
        <div style={{ color: colors.ink }}>{weapon.name}</div>
        <p style={{ color: colors.dim, fontSize: text.small, lineHeight: 1.5 }}>
          {weapon.description}<br />{weapon.damage} damage · {weapon.reach}m reach · {weapon.charge}s windup · {weapon.recovery}s recovery
        </p>
        <button style={secondaryButton} data-testid={`weapon-${id}`}
          disabled={equipped || (!owned && !canSpend(run, weapon.price))}
          onClick={() => owned ? run.equipWeapon(id) : run.buyWeapon(id)}>
          {equipped ? "Equipped" : owned ? "Equip" : `Buy · ${weapon.price} gems (passage reserved)`}
        </button>
      </div>;
    })}
    {!shop && <p style={{ color: colors.dim, fontSize: text.small }}>Visit a shop to buy more weapons.</p>}
  </section>;
}
