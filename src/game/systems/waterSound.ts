/** A long, deterministic stream bed: soft turbulence under irregular resonant
 * bubbles. Generated once per audio context, never in the animation loop. */
export function waterSamples(sampleRate: number, seconds = 16, seed = 719): Float32Array {
  const data = new Float32Array(Math.round(sampleRate * seconds));
  let state = seed >>> 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  let low = 0, smooth = 0;
  const cutoff = 1 - Math.exp(-2 * Math.PI * 380 / sampleRate);
  for (let i = 0; i < data.length; i++) {
    low += ((random() * 2 - 1) - low) * cutoff;
    smooth += (low - smooth) * cutoff;
    const time = i / sampleRate;
    const swell = 0.7 + 0.18 * Math.sin(time * 1.7) + 0.12 * Math.sin(time * 4.1);
    data[i] = smooth * 0.28 * swell;
  }
  // Each bubble rings briefly as its air cavity collapses. Uneven timing,
  // pitch and decay avoid both a repeated drip and a continuous hiss.
  for (let time = 0; time < seconds; time += 0.018 + random() * 0.095) {
    const start = Math.floor(time * sampleRate);
    const duration = 0.035 + random() * 0.095;
    const frequency = 320 + random() ** 2 * 1250;
    const amplitude = 0.025 + random() * 0.065;
    let phase = 0;
    for (let j = 0; j < duration * sampleRate && start + j < data.length; j++) {
      const age = j / sampleRate, progress = age / duration;
      phase += 2 * Math.PI * frequency * (1 + progress * 0.45) / sampleRate;
      const envelope = Math.min(1, age / 0.003) * Math.exp(-progress * 5) * (1 - progress);
      data[start + j] += Math.sin(phase) * envelope * amplitude;
    }
  }
  // Silence at the loop seam prevents a discontinuity from clicking.
  const fade = Math.round(sampleRate * 0.025);
  for (let i = 0; i < fade; i++) {
    const gain = i / fade;
    data[i] *= gain; data[data.length - 1 - i] *= gain;
  }
  return data;
}
