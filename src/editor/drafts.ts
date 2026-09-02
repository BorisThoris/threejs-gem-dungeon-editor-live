import { useSyncExternalStore } from "react";

import type { RoomTemplate } from "../game/dungeon/types";
import { registerTemplate } from "../game/rooms/templates";

/**
 * Room templates under construction.
 *
 * Drafts live in localStorage so a reload during authoring loses nothing.
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
const listeners = new Set<() => void>();
let drafts: Record<string, Draft> = {};
let snapshot: Draft[] = [];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    drafts = raw ? (JSON.parse(raw) as Record<string, Draft>) : {};
  } catch {
    drafts = {};
  }
  snapshot = Object.values(drafts).sort((a, b) => b.updatedAt - a.updatedAt);
}

function save() {
  snapshot = Object.values(drafts).sort((a, b) => b.updatedAt - a.updatedAt);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // Quota or privacy mode: the draft still exists for this session.
  }
  listeners.forEach((l) => l());
}

load();
for (const draft of Object.values(drafts)) {
  if (draft.enabled) registerTemplate(draft.template);
}

export const draftStore = {
  all: (): Draft[] => snapshot,
  get: (id: string): Draft | undefined => drafts[id],

  put(template: RoomTemplate, enabled = drafts[template.id]?.enabled ?? false): void {
    drafts[template.id] = { template, enabled, updatedAt: Date.now() };
    if (enabled) registerTemplate(template);
    save();
  },

  setEnabled(id: string, enabled: boolean): void {
    const draft = drafts[id];
    if (!draft) return;
    draft.enabled = enabled;
    draft.updatedAt = Date.now();
    if (enabled) registerTemplate(draft.template);
    save();
  },

  remove(id: string): void {
    delete drafts[id];
    save();
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export const useDrafts = (): Draft[] => useSyncExternalStore(draftStore.subscribe, draftStore.all);

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
