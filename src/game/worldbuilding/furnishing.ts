import type { PropKind, PropPlacement, Room } from "../dungeon/types";
import type { Spots } from "../rooms/layouts";
import type { Vec3 } from "../dungeon/layout";
import { identityFor, PLACE_IDENTITIES } from "./identity";

/** Work areas, growing beds and memorial pairs reuse the room's validated
 * anchor rings. Rewards retain their own anchor instead of becoming clutter. */
export function purposeFurnishing(room: Room, { near, far, centre, rng }: Spots): PropPlacement[] {
  const at = (kind: PropKind, p: Vec3): PropPlacement => ({ kind, x: p[0], z: p[2], rotation: Math.atan2(-p[0], -p[2]) });
  const tradition = PLACE_IDENTITIES[identityFor(room)].tradition;
  const reward = at("chest", near[1]);
  const provisions = rng() < 0.5 ? at("potion", near[3]) : at("candle", near[3]);
  if (tradition === "trellis") return [reward, provisions,
    at("urn", near[0]), at("urn", near[2]), at("table", far[0]), at("crate", far[1]),
    at("urn", far[2]), at("web", far[3]), ...centre.map(p => at("urn", p))];
  if (tradition === "vaulting") return [reward, provisions,
    at("urn", near[0]), at("urn", near[2]), at("statue", far[0]), at("statue", far[2]),
    at("skull", far[1]), at("candle", far[3]), ...centre.map(p => at("candle", p))];
  return [reward, provisions,
    at("barrel", near[0]), at("crate", near[2]), at("table", far[0]), at("chair", far[1]),
    at("crate", far[2]), at("barrel", far[3]), ...centre.map((p, i) => at(i ? "barrel" : "bookshelf", p))];
}
