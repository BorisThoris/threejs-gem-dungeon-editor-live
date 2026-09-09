import { TABLEAUX } from "../deepworks/fragments";
import { orient, orientationOf, type Orientation } from "../dungeon/layout";
import type { PropPlacement, Room, RoomTemplate } from "../dungeon/types";
import { resolveSlots } from "./slots";

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

/**
 * The templates the generator may draw for a room of this kind.
 *
 * Excludes anything placed by MEANING rather than by the draw. A
 * forward-pointing tableau staged two rooms before the Keeper stops
 * foreshadowing anything the moment the same four props also turn up in an
 * ordinary corridor on floor one - it reads as scenery, and the one room
 * that was staged reads as scenery too. A set piece is either placed
 * deliberately or drawn at random, and it cannot be both.
 */
export const templatesForKind = (kind: RoomTemplate["kind"]): RoomTemplate[] =>
  [...TEMPLATES.values()].filter((t) => t.kind === kind && !placedByMeaning(t));

/** Whether this template is staged by a rule instead of drawn. */
export const placedByMeaning = (t: RoomTemplate): boolean =>
  TABLEAUX.some((x) => x.id === t.tableau && x.ahead);

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
  /**
   * The one place a slotted template becomes a room, and before the turn
   * rather than after it: everything downstream reads a plain list of props
   * and has no way of knowing a placeholder was ever there.
   *
   * Keyed on the room's own identity the same way its orientation is - a
   * run's three start rooms share an id and a grid square, so drawing on
   * the dungeon seed alone would have furnished all three the same and
   * substituted the same things into them.
   *
   * Unconditional, because a template with no rules resolves to itself and
   * a branch here would be one more thing to keep true.
   */
  const props = resolveSlots(
    template.props,
    template.slots ?? [],
    `slots:${room.seed}:${room.id}:${room.grid.x},${room.grid.z}`
  );
  return orientProps(props, orientationOf(room));
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

/**
 * The registered template that points FORWARDS, if one ships.
 *
 * A tableau flagged `ahead` in the corpus is staged to describe something
 * the delver has not met yet, so it is placed by where it points rather
 * than by the generator's ordinary draw. Asked of the registry rather than
 * hardcoded, so shipping a second forward-pointing set piece is a content
 * change and not a code one.
 */
export const foreshadowingTemplate = (): RoomTemplate | undefined =>
  [...TEMPLATES.values()].find(placedByMeaning);
