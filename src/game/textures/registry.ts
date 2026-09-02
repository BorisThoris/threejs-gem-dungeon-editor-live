import { useEffect, useMemo, useSyncExternalStore } from "react";
import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from "three";

import { createRng } from "../rng";

/**
 * Surfaces: every texture in the game, by id.
 *
 * The old tree drew three 64x64 canvases from hardcoded code, shipped 4 MB
 * of PNGs nothing fetched, and had a painter whose output could reach
 * nothing. This is one registry: the game asks for a surface by id, gets a
 * procedural default, and any tool - the painter, the mosaic creator - can
 * replace a surface by id with an image. Overrides persist in localStorage
 * so an authored surface survives a reload during authoring; the shipped
 * game draws the defaults.
 */

export const BUILTIN_SURFACES = ["stone", "wood", "brick", "moss", "iron", "dirt"] as const;
export type BuiltinSurface = (typeof BUILTIN_SURFACES)[number];

const SIZE = 128;
const STORAGE_KEY = "gem-dungeon.surfaces";

const cache = new Map<string, Texture>();
const overrides = new Map<string, string>();
const listeners = new Set<() => void>();
let version = 0;

// --- Procedural defaults ---------------------------------------------------

type Painter = (ctx: CanvasRenderingContext2D, rng: () => number) => void;

const speckle = (ctx: CanvasRenderingContext2D, rng: () => number, count: number, alpha: number, light: boolean) => {
  for (let i = 0; i < count; i++) {
    const v = light ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * (0.4 + rng() * 0.6)})`;
    const s = 1 + rng() * 3;
    ctx.fillRect(rng() * SIZE, rng() * SIZE, s, s);
  }
};

const PAINTERS: Record<BuiltinSurface, Painter> = {
  stone: (ctx, rng) => {
    // Dressed blocks in offset courses: mortar, then each block a slightly
    // different grey with a lit top edge and a shadowed bottom one.
    ctx.fillStyle = "#4a484e";
    ctx.fillRect(0, 0, SIZE, SIZE);
    const bh = 32;
    const bw = 64;
    for (let row = 0; row < SIZE / bh; row++) {
      const offset = row % 2 ? bw / 2 : 0;
      for (let x = -bw; x < SIZE + bw; x += bw) {
        const g = 122 + rng() * 26;
        const x0 = x + offset + 2;
        const y0 = row * bh + 2;
        ctx.fillStyle = `rgb(${g},${g},${g + 6})`;
        ctx.fillRect(x0, y0, bw - 4, bh - 4);
        ctx.fillStyle = "rgba(255,255,255,0.13)";
        ctx.fillRect(x0, y0, bw - 4, 2);
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.fillRect(x0, y0 + bh - 6, bw - 4, 2);
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = `rgba(0,0,0,${0.08 + rng() * 0.1})`;
          ctx.beginPath();
          ctx.ellipse(x0 + rng() * (bw - 4), y0 + rng() * (bh - 4), 3 + rng() * 9, 2 + rng() * 5, rng() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    speckle(ctx, rng, 350, 0.22, false);
    speckle(ctx, rng, 160, 0.14, true);
  },
  wood: (ctx, rng) => {
    ctx.fillStyle = "#7a5230";
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let y = 0; y < SIZE; y += 32) {
      ctx.fillStyle = `rgba(0,0,0,${0.25 + rng() * 0.15})`;
      ctx.fillRect(0, y, SIZE, 2);
      for (let g = 0; g < 6; g++) {
        ctx.strokeStyle = `rgba(60,35,15,${0.25 + rng() * 0.3})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        const yy = y + 4 + rng() * 26;
        ctx.moveTo(0, yy);
        ctx.bezierCurveTo(SIZE / 3, yy + rng() * 4 - 2, (2 * SIZE) / 3, yy + rng() * 4 - 2, SIZE, yy);
        ctx.stroke();
      }
    }
  },
  brick: (ctx, rng) => {
    ctx.fillStyle = "#5c5451";
    ctx.fillRect(0, 0, SIZE, SIZE);
    const bh = 16;
    const bw = 32;
    for (let row = 0; row < SIZE / bh; row++) {
      const offset = row % 2 ? bw / 2 : 0;
      for (let x = -bw; x < SIZE + bw; x += bw) {
        ctx.fillStyle = `rgb(${120 + rng() * 30},${70 + rng() * 20},${58 + rng() * 16})`;
        ctx.fillRect(x + offset + 1, row * bh + 1, bw - 2, bh - 2);
      }
    }
    speckle(ctx, rng, 250, 0.2, false);
  },
  moss: (ctx, rng) => {
    PAINTERS.stone(ctx, rng);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(${60 + rng() * 30},${110 + rng() * 40},${50 + rng() * 20},0.45)`;
      ctx.beginPath();
      ctx.ellipse(rng() * SIZE, rng() * SIZE, 4 + rng() * 14, 3 + rng() * 9, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  iron: (ctx, rng) => {
    ctx.fillStyle = "#6e737b";
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 60; i++) {
      ctx.strokeStyle = `rgba(${rng() > 0.5 ? 255 : 0},${rng() > 0.5 ? 255 : 0},${rng() > 0.5 ? 255 : 0},0.12)`;
      ctx.beginPath();
      const x = rng() * SIZE;
      const y = rng() * SIZE;
      ctx.moveTo(x, y);
      ctx.lineTo(x + rng() * 30 - 15, y + rng() * 30 - 15);
      ctx.stroke();
    }
  },
  dirt: (ctx, rng) => {
    ctx.fillStyle = "#5d4a36";
    ctx.fillRect(0, 0, SIZE, SIZE);
    speckle(ctx, rng, 900, 0.3, false);
    speckle(ctx, rng, 300, 0.12, true);
  },
};

function paintDefault(id: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const painter = PAINTERS[id as BuiltinSurface] ?? PAINTERS.stone;
  painter(ctx, createRng(`surface:${id}`));
  return canvas;
}

function finish(texture: Texture): Texture {
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

// --- Overrides -------------------------------------------------------------

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    for (const [id, url] of Object.entries(JSON.parse(raw) as Record<string, string>)) {
      overrides.set(id, url);
    }
  } catch {
    // Storage may be unavailable or corrupt; the defaults still work.
  }
}
if (typeof window !== "undefined") loadPersisted();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(overrides)));
  } catch {
    // Quota or privacy mode: the override still applies for this session.
  }
}

const notify = () => {
  version++;
  listeners.forEach((l) => l());
};

/** Replace a surface with an image (a data URL), or clear it with null. */
export function setSurfaceImage(id: string, dataUrl: string | null): void {
  if (dataUrl) overrides.set(id, dataUrl);
  else overrides.delete(id);
  cache.get(id)?.dispose();
  cache.delete(id);
  persist();
  notify();
}

export const hasSurfaceOverride = (id: string): boolean => overrides.has(id);
/** The stored image for an authored surface, as a data URL. */
export const getSurfaceOverride = (id: string): string | undefined => overrides.get(id);

export const listSurfaces = (): { id: string; custom: boolean }[] => {
  const ids = new Set<string>([...BUILTIN_SURFACES, ...overrides.keys()]);
  return [...ids].map((id) => ({ id, custom: overrides.has(id) }));
};

/** The texture for a surface id. Cached; shared - clone before setting repeat. */
export function getSurface(id: string): Texture {
  const hit = cache.get(id);
  if (hit) return hit;
  const canvas = paintDefault(id);
  const texture = finish(new CanvasTexture(canvas));
  cache.set(id, texture);
  const url = overrides.get(id);
  if (url) {
    // Draw the override onto the same canvas once it loads; the texture is
    // already in use, so nothing needs to re-render for the swap.
    const image = new Image();
    image.onload = () => {
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.drawImage(image, 0, 0, SIZE, SIZE);
      texture.needsUpdate = true;
      // Consumers hold clones with their own upload version; tell them.
      notify();
    };
    image.src = url;
  }
  return texture;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * A surface tiled `repeatX` by `repeatY` times. Returns a per-caller clone so
 * setting repeat does not change every other user of the same surface, and
 * disposes it when the caller goes away.
 */
export function useSurface(id: string, repeatX = 1, repeatY = repeatX): Texture {
  const v = useSyncExternalStore(subscribe, () => version);
  const texture = useMemo(() => {
    const clone = getSurface(id).clone();
    clone.repeat.set(repeatX, repeatY);
    clone.needsUpdate = true;
    return clone;
    // `v` is the registry version: a new override means a new clone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, repeatX, repeatY, v]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
