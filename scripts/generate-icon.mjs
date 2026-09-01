/**
 * Generates the application icon.
 *
 * package.json pointed `build.mac.icon` and `build.linux.icon` at
 * public/favicon.ico, which does not exist in this repository, so
 * electron-builder fell back to the stock Electron icon and warned about it on
 * every packaging run. This draws the game's gem instead.
 *
 * Written with only node:zlib so it needs no image dependency: a PNG is just
 * a signature, an IHDR chunk, deflated scanlines in IDAT, and IEND.
 *
 *   node scripts/generate-icon.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const SIZE = 512;
const OUT = "build/icon.png";

// Palette: the gem's cyan against the dungeon's near-black, matching the
// in-game collectible.
const BG = [16, 18, 27];

function lerp(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

/** Signed distance to a diamond (rotated square), which is the gem's outline. */
function diamondDistance(x, y, halfWidth, halfHeight) {
  return Math.abs(x) / halfWidth + Math.abs(y) / halfHeight - 1;
}

function render() {
  const light = [186, 240, 255];
  const mid = [92, 200, 238];
  const dark = [26, 116, 158];

  // RGBA, row-major, with a filter byte at the start of every scanline.
  const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);

  for (let y = 0; y < SIZE; y++) {
    const rowStart = y * (SIZE * 4 + 1);
    raw[rowStart] = 0; // filter: none

    for (let x = 0; x < SIZE; x++) {
      const cx = (x - SIZE / 2) / (SIZE / 2);
      const cy = (y - SIZE / 2) / (SIZE / 2);

      const d = diamondDistance(cx, cy, 0.62, 0.82);
      let color = BG;
      let alpha = 255;

      if (d < 0) {
        // Inside the gem. Facet it: left half lighter than right, with a
        // brighter band along the upper edge so it reads as cut stone.
        const facet = cx < 0 ? 0.0 : 0.45;
        const vertical = (cy + 0.82) / 1.64; // 0 at top, 1 at bottom
        let t = Math.min(1, Math.max(0, facet + vertical * 0.55));
        color = t < 0.5 ? lerp(light, mid, t * 2) : lerp(mid, dark, (t - 0.5) * 2);

        // Crisp highlight along the top-left facet edge.
        if (Math.abs(d) < 0.035 && cy < 0) color = light;
      } else if (d < 0.02) {
        // Antialias the silhouette.
        const t = d / 0.02;
        color = lerp(mid, BG, t);
      }

      const i = rowStart + 1 + x * 4;
      raw[i] = color[0];
      raw[i + 1] = color[1];
      raw[i + 2] = color[2];
      raw[i + 3] = alpha;
    }
  }
  return raw;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // colour type: RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(render(), { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, png);
console.log(`Wrote ${OUT} (${SIZE}x${SIZE}, ${png.length} bytes)`);
