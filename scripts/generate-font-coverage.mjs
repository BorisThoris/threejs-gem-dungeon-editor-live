#!/usr/bin/env node
/**
 * Generates `src/components/gameFontCoverage.ts` from the font we ship in
 * `public/fonts`.
 *
 * Why this exists: troika (behind drei's <Text>) renders a character with the
 * font given in the `font` prop only when that font actually has a glyph for
 * it. For anything it cannot cover it asks lojjic's unicode-font-resolver over
 * the network - `https://cdn.jsdelivr.net/gh/lojjic/unicode-font-resolver/...`
 * - to find a font that can, and there is no option to turn that off. In a
 * packaged offline build that request fails, so a single stray emoji in a label
 * costs a network round trip and a console error every time the label syncs.
 *
 * So GameText strips characters the bundled font cannot draw before handing the
 * string to troika, and this script produces the exact coverage set to strip
 * against by reading the font's own `cmap` table. Re-run it if the bundled font
 * is ever changed:
 *
 *   node scripts/generate-font-coverage.mjs
 *
 * Plain Node, no dependencies.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fontPath = join(repoRoot, 'public', 'fonts', 'LiberationSans-Regular.ttf');
const outPath = join(repoRoot, 'src', 'components', 'gameFontCoverage.ts');

const buf = readFileSync(fontPath);
const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const u8 = (o) => view.getUint8(o);
const u16 = (o) => view.getUint16(o);
const i16 = (o) => view.getInt16(o);
const u32 = (o) => view.getUint32(o);

function findTable(tag) {
  const numTables = u16(4);
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    const thisTag = String.fromCharCode(u8(rec), u8(rec + 1), u8(rec + 2), u8(rec + 3));
    if (thisTag === tag) return u32(rec + 8);
  }
  throw new Error(`font has no ${tag} table`);
}

/** Pick the best available cmap subtable: prefer full-repertoire formats. */
function pickSubtable(cmap) {
  const n = u16(cmap + 2);
  let best = null;
  let bestScore = -1;
  for (let i = 0; i < n; i++) {
    const rec = cmap + 4 + i * 8;
    const platform = u16(rec);
    const encoding = u16(rec + 2);
    const offset = cmap + u32(rec + 4);
    const format = u16(offset);
    if (format !== 4 && format !== 12 && format !== 6 && format !== 0) continue;
    // Unicode full repertoire beats BMP beats anything Mac-flavoured.
    let score = 0;
    if (format === 12) score += 100;
    if (format === 4) score += 50;
    if (platform === 3 && encoding === 10) score += 20;
    if (platform === 3 && encoding === 1) score += 10;
    if (platform === 0) score += 15;
    if (score > bestScore) {
      bestScore = score;
      best = { offset, format };
    }
  }
  if (!best) throw new Error('no usable cmap subtable');
  return best;
}

function readCodePoints({ offset, format }) {
  const covered = new Set();
  if (format === 4) {
    const segCount = u16(offset + 6) / 2;
    const endBase = offset + 14;
    const startBase = endBase + segCount * 2 + 2;
    const deltaBase = startBase + segCount * 2;
    const rangeBase = deltaBase + segCount * 2;
    for (let s = 0; s < segCount; s++) {
      const end = u16(endBase + s * 2);
      const start = u16(startBase + s * 2);
      if (start === 0xffff) continue;
      const delta = i16(deltaBase + s * 2);
      const rangeOffset = u16(rangeBase + s * 2);
      for (let cp = start; cp <= end && cp !== 0x10000; cp++) {
        let glyph;
        if (rangeOffset === 0) {
          glyph = (cp + delta) & 0xffff;
        } else {
          const gi = rangeBase + s * 2 + rangeOffset + (cp - start) * 2;
          if (gi + 1 >= buf.byteLength) continue;
          glyph = u16(gi);
          if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
        }
        if (glyph !== 0) covered.add(cp);
      }
    }
  } else if (format === 12) {
    const nGroups = u32(offset + 12);
    for (let g = 0; g < nGroups; g++) {
      const rec = offset + 16 + g * 12;
      const start = u32(rec);
      const end = u32(rec + 4);
      const startGlyph = u32(rec + 8);
      for (let cp = start; cp <= end; cp++) {
        if (startGlyph + (cp - start) !== 0) covered.add(cp);
      }
    }
  } else {
    throw new Error(`cmap format ${format} not supported by this script`);
  }
  return covered;
}

const covered = readCodePoints(pickSubtable(findTable('cmap')));

// Collapse to [start, end] ranges.
const sorted = [...covered].sort((a, b) => a - b);
const ranges = [];
for (const cp of sorted) {
  const last = ranges[ranges.length - 1];
  if (last && cp === last[1] + 1) last[1] = cp;
  else ranges.push([cp, cp]);
}

const hex = (n) => n.toString(16);
const encoded = ranges.map(([a, b]) => (a === b ? hex(a) : `${hex(a)}-${hex(b)}`)).join(',');

const banner = `// GENERATED FILE - do not edit by hand.
// Produced by \`node scripts/generate-font-coverage.mjs\` from
// public/fonts/LiberationSans-Regular.ttf (${covered.size} code points in
// ${ranges.length} ranges). Re-run that script if the bundled font changes.
`;

const body = `${banner}
/**
 * Every code point the bundled game font can actually draw, as inclusive
 * "start-end" hex ranges (a lone value is a one-code-point range).
 */
const COVERED_RANGES = "${encoded}";

const starts: number[] = [];
const ends: number[] = [];
for (const part of COVERED_RANGES.split(",")) {
  const dash = part.indexOf("-");
  if (dash === -1) {
    const only = parseInt(part, 16);
    starts.push(only);
    ends.push(only);
  } else {
    starts.push(parseInt(part.slice(0, dash), 16));
    ends.push(parseInt(part.slice(dash + 1), 16));
  }
}

/** True when the bundled font has a glyph for this code point. */
export function fontCovers(codePoint: number): boolean {
  // Ranges are sorted and disjoint, so a binary search settles it.
  let lo = 0;
  let hi = starts.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (codePoint < starts[mid]) hi = mid - 1;
    else if (codePoint > ends[mid]) lo = mid + 1;
    else return true;
  }
  return false;
}
`;

writeFileSync(outPath, body);
console.log(`Wrote ${outPath}: ${covered.size} code points, ${ranges.length} ranges, ${encoded.length} chars encoded.`);
