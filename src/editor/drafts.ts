import { useSyncExternalStore } from "react";

import { PROP_KINDS, ROOM_KINDS, SHAPES, type RoomTemplate } from "../game/dungeon/types";
import { ROOM_SIZES } from "../game/world";
import { registerTemplate, unregisterTemplate } from "../game/rooms/templates";
import { isSlotRule } from "../game/rooms/slots";
import { SHIPPED } from "../game/rooms/shipped";

/**
 * Room templates under construction.
 *
 * Drafts are saved to localStorage; failed writes are reported for export or retry.
 * A draft marked enabled is registered with the game's template registry
 * when this module loads, so starting a run from the editor plays it - the
 * generator picks templates by kind. Shipping a template means exporting it
 * and adding the JSON to the repository's shipped content.
 */

export interface Draft {
  template: RoomTemplate;
  enabled: boolean;
  updatedAt: number;
}

const STORAGE_KEY = "gem-dungeon.drafts";

const has = (list: readonly string[], v: unknown): boolean => typeof v === "string" && list.includes(v);

/**
 * Whether a value is a template the generator can place: a kind, shape and
 * size the game defines, and props of known kinds at finite positions.
 * Applied to imports and to what comes back from storage, so a bad file
 * can neither crash the editor on every reload nor reach a run.
 */
export function isRoomTemplate(value: unknown): value is RoomTemplate {
  if (!value || typeof value !== "object") return false;
  const t = value as Record<string, unknown>;
  if (typeof t.id !== "string" || !t.id) return false;
  if ([t.name, t.story, t.tableau].some(text => text !== undefined && typeof text !== "string")) return false;
  if (!has(ROOM_KINDS, t.kind) || !has(SHAPES, t.shape)) return false;
  if (typeof t.size !== "number" || !(ROOM_SIZES as readonly number[]).includes(t.size)) return false;
  if (!Array.isArray(t.props)) return false;
  if (t.slots !== undefined && (!Array.isArray(t.slots) || !t.slots.every(isSlotRule))) return false;
  return t.props.every((p) => {
    if (!p || typeof p !== "object") return false;
    const q = p as Record<string, unknown>;
    return (
      has(PROP_KINDS, q.kind) &&
      Number.isFinite(q.x) &&
      Number.isFinite(q.z) &&
      (q.rotation === undefined || Number.isFinite(q.rotation)) &&
      (q.scale === undefined || Number.isFinite(q.scale)) &&
      (q.slot === undefined || typeof q.slot === "string")
    );
  });
}
const listeners = new Set<() => void>();
// Imported IDs are arbitrary strings, including names inherited by plain objects.
let drafts: Record<string, Draft> = Object.create(null);
let snapshot: Draft[] = [];
let saveFailed = false;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    drafts = Object.create(null);
    const entries = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.entries(parsed) : [];
    for (const [id, value] of entries) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const draft = value as Record<string, unknown>;
      if (isRoomTemplate(draft.template) && draft.template.id === id) {
        drafts[id] = { template: draft.template, enabled: draft.enabled === true,
          updatedAt: typeof draft.updatedAt === "number" && Number.isFinite(draft.updatedAt) ? draft.updatedAt : 0 };
      }
    }
  } catch {
    drafts = Object.create(null);
  }
  snapshot = Object.values(drafts).sort((a, b) => b.updatedAt - a.updatedAt);
}

function save() {
  snapshot = Object.values(drafts).sort((a, b) => b.updatedAt - a.updatedAt);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    saveFailed = false;
  } catch {
    // Keep session work available for export and retry, but never imply it is durable.
    saveFailed = true;
  }
  listeners.forEach((l) => l());
}

load();
function restoreShipped(id: string) {
  const shipped = SHIPPED.find(t => t.id === id);
  if (shipped) registerTemplate(shipped);
  else unregisterTemplate(id);
}
for (const draft of Object.values(drafts)) {
  if (draft.enabled) registerTemplate(draft.template);
}

export const draftStore = {
  all: (): Draft[] => snapshot,
  saveFailed: (): boolean => saveFailed,
  retrySave: save,
  get: (id: string): Draft | undefined => drafts[id],

  put(template: RoomTemplate, enabled = drafts[template.id]?.enabled ?? false): void {
    if (!isRoomTemplate(template)) return;
    drafts[template.id] = { template, enabled, updatedAt: Date.now() };
    if (enabled) registerTemplate(template);
    else restoreShipped(template.id);
    save();
  },

  setEnabled(id: string, enabled: boolean): void {
    const draft = drafts[id];
    if (!draft) return;
    draft.enabled = enabled;
    draft.updatedAt = Date.now();
    if (enabled) registerTemplate(draft.template);
    else restoreShipped(id);
    save();
  },

  remove(id: string): void {
    delete drafts[id];
    restoreShipped(id);
    save();
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export const useDrafts = (): Draft[] => useSyncExternalStore(draftStore.subscribe, draftStore.all);
export const useDraftSaveFailed = (): boolean => useSyncExternalStore(draftStore.subscribe, draftStore.saveFailed);

export const newDraftId = (kind: string): string =>
  `${kind}-${Math.random().toString(36).slice(2, 7)}`;

/** Download a JSON file. */
export function download(filename: string, text: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
