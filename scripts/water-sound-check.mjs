import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
const built = await build({ entryPoints: ["src/game/systems/waterSound.ts"], bundle: true, write: false, format: "esm" });
const { waterSamples } = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`);
const rate = 44100, channels = [waterSamples(rate), waterSamples(rate, 16, 816)];
let energy = 0, difference = 0, peak = 0, cross = 0, otherEnergy = 0;
for (let i = 0; i < channels[0].length; i++) {
  const a = channels[0][i], b = channels[1][i];
  energy += a * a; otherEnergy += b * b; cross += a * b; peak = Math.max(peak, Math.abs(a), Math.abs(b));
  if (i) difference += (a - channels[0][i - 1]) ** 2;
}
const rms = Math.sqrt(energy / channels[0].length), roughness = difference / energy;
assert.ok(rms > 0.01 && rms < 0.1, `water has a restrained audible body: ${rms}`);
assert.ok(peak < 0.5, "overlapping bubbles retain headroom");
assert.ok(roughness < 0.12, `high-frequency static is suppressed: ${roughness}`);
assert.ok(Math.abs(cross / Math.sqrt(energy * otherEnergy)) < 0.2, "stereo channels carry different ripples");
for (const channel of channels) { assert.ok(channel[0] === 0); assert.ok(channel.at(-1) === 0); }
// Preview at the current voice's full level before the user's master volume.
const bytes = Buffer.alloc(44 + channels[0].length * 4);
bytes.write("RIFF"); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write("WAVEfmt ", 8);
bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(2, 22);
bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 4, 28); bytes.writeUInt16LE(4, 32); bytes.writeUInt16LE(16, 34);
bytes.write("data", 36); bytes.writeUInt32LE(bytes.length - 44, 40);
for (let i = 0; i < channels[0].length; i++) for (let c = 0; c < 2; c++)
  bytes.writeInt16LE(Math.round(channels[c][i] * 1.2 * 32767), 44 + i * 4 + c * 2);
mkdirSync("output/audio", { recursive: true }); writeFileSync("output/audio/water-current.wav", bytes);
console.log(JSON.stringify({ pass: true, rms, peak, roughness, seconds: 16 }));
