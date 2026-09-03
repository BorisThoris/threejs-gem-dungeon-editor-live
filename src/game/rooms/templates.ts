import { orient, orientationOf, type Orientation } from "../dungeon/layout";
import type { PropPlacement, Room, RoomTemplate } from "../dungeon/types";

/**
 * Authored room layouts, by id.
 *
 * This is the content pipeline: the Room Builder writes RoomTemplates, the
 * generator may assign one to a room of the matching kind, and Dressing
 * renders its props instead of the kind's seeded layout. Shipped templates
 * are registered here; drafts made in the builder live in localStorage
 * until they are exported and added.
 */
const TEMPLATES = new Map<string, RoomTemplate>();

export function registerTemplate(template: RoomTemplate): void {
  TEMPLATES.set(template.id, template);
}

export const getTemplate = (id: string): RoomTemplate | undefined => TEMPLATES.get(id);

/** Everything registered, for the check that validates what ships. */
export const allTemplates = (): RoomTemplate[] => [...TEMPLATES.values()];

export const templatesForKind = (kind: RoomTemplate["kind"]): RoomTemplate[] =>
  [...TEMPLATES.values()].filter((t) => t.kind === kind);

/**
 * An authored room's props, turned the way the room they are in is turned.
 *
 * A template is a composition, and a composition a quarter turn round is
 * still that composition - so it turns with the anchors rather than staying
 * put while the gem, the braziers and everything else move around it. One
 * shipped hall was one room in every eleven the game drew; there are eight
 * of it now.
 *
 * The one owner of that: the dressing renders these and the gem avoids
 * them, and the two disagreeing about where an authored chest is is exactly
 * how a treasure room came to ship three chests and show two.
 */
export function authoredProps(room: Room): PropPlacement[] {
  const template = room.template ? getTemplate(room.template) : undefined;
  if (!template) return [];
  return orientProps(template.props, orientationOf(room));
}

/**
 * The same turn applied to props that are not registered yet.
 *
 * The editor validates a draft nobody has shipped, and the check that holds
 * the shipped templates walks all eight turns of each - so the turn has to
 * be available without a room to look the template up from. It is the one
 * place the transform is written: a validator that measured an unturned
 * prop against a turned gem would be answering about a room that does not
 * exist.
 */
export function orientProps(props: PropPlacement[], o: Orientation): PropPlacement[] {
  return props.map((p) => {
    const [x, z] = orient(p.x, p.z, o);
    // The prop turns with the room, so its own facing turns too. A mirror
    // reverses which way round it reads.
    const turn = (o.mirror ? -1 : 1) * ((p.rotation ?? 0) + o.turns * (Math.PI / 2));
    return { ...p, x, z, rotation: turn };
  });
}
