import type { RoomTemplate } from "../dungeon/types";

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
