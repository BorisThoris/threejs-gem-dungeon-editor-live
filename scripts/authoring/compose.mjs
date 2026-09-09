import { L, GRIDS, problems } from "./space.mjs";

/** Is this single prop legal in the given room base, in every orientation? */
export function fits(base, prop, seeds = 8) {
  const t = { ...base, props: [prop], slots: base.slots ?? [] };
  for (const g of GRIDS) if (L.templateProblems(t, seeds, g).length) return false;
  return true;
}

/** Nearest legal position to a wanted one, searching outward on a half-metre lattice. */
export function nudge(base, prop, seeds = 8, reach = 4) {
  if (fits(base, prop, seeds)) return prop;
  for (let r = 0.5; r <= reach; r += 0.5) {
    const ring = [];
    for (let a = 0; a < 32; a++) {
      const th = (a / 32) * Math.PI * 2;
      ring.push([+(prop.x + Math.cos(th) * r).toFixed(1), +(prop.z + Math.sin(th) * r).toFixed(1)]);
    }
    for (const [x, z] of ring) {
      const p = { ...prop, x, z };
      if (fits(base, p, seeds)) return p;
    }
  }
  return null;
}

/** Build a template from a wanted composition, nudging each prop and dropping any that cannot fit. */
export function compose(base, wanted, seeds = 8) {
  const props = [];
  const dropped = [];
  for (const w of wanted) {
    const p = nudge(base, { rotation: 0, ...w }, seeds);
    if (!p) { dropped.push(w); continue; }
    // And clear of everything already placed, by the same rule the validator uses.
    const t = { ...base, props: [...props, p], slots: base.slots ?? [] };
    let clash = false;
    for (const g of GRIDS) if (L.templateProblems(t, seeds, g).length) { clash = true; break; }
    if (clash) {
      const q = nudgeClear(base, props, p, seeds);
      if (!q) { dropped.push(w); continue; }
      props.push(q);
    } else props.push(p);
  }
  return { props, dropped };
}

function nudgeClear(base, placed, prop, seeds) {
  for (let r = 0.5; r <= 4; r += 0.5) {
    for (let a = 0; a < 32; a++) {
      const th = (a / 32) * Math.PI * 2;
      const p = { ...prop, x: +(prop.x + Math.cos(th) * r).toFixed(1), z: +(prop.z + Math.sin(th) * r).toFixed(1) };
      const t = { ...base, props: [...placed, p], slots: base.slots ?? [] };
      let bad = false;
      for (const g of GRIDS) if (L.templateProblems(t, seeds, g).length) { bad = true; break; }
      if (!bad) return p;
    }
  }
  return null;
}

export function render(t) {
  const half = t.size / 2;
  const cells = new Map();
  t.props.forEach((p, i) => {
    const cx = Math.round((p.x + half) * 2), cz = Math.round((p.z + half) * 2);
    cells.set(`${cx},${cz}`, (p.kind[0] ?? "?").toUpperCase());
  });
  const out = [];
  for (let z = 0; z <= half * 4; z++) {
    let row = "";
    for (let x = 0; x <= half * 4; x++) row += cells.get(`${x},${z}`) ?? ".";
    out.push(row);
  }
  return out.join("\n");
}

export { problems };
