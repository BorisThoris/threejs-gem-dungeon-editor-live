import { L, legalSpots } from "./space.mjs";
const kind = process.argv[2] ?? "pillar";
const roomKind = process.argv[3] ?? "normal";
const size = Number(process.argv[4] ?? 16);
const base = { id: "probe", kind: roomKind, size, shape: "square", props: [] };
const spots = new Set(legalSpots(kind, base, 0.5, 6).map(([x, z]) => `${x},${z}`));
const half = size / 2;
console.log(`${kind} in a ${size}m ${roomKind}: ${spots.size} spots  (rows = z from -${half} to ${half}, cols = x)`);
let header = "      ";
for (let x = -half; x <= half; x += 0.5) header += (Math.abs(x % 2) < 0.01 ? String(Math.abs(x)).slice(-1) : " ");
console.log(header);
for (let z = -half; z <= half; z += 0.5) {
  let row = String(z.toFixed(1)).padStart(5) + " ";
  for (let x = -half; x <= half; x += 0.5) row += spots.has(`${+x.toFixed(2)},${+z.toFixed(2)}`) ? "#" : ".";
  console.log(row);
}
