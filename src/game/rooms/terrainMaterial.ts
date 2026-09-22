import type { BiomeId } from "./biomes";

export interface TerrainEffect {
  /** Author-facing name for the visual rule. */
  readonly name: string;
  /** Whether the rule reads the paused run clock. */
  readonly animated: boolean;
  /** Low shared glow; spatial variation stays in the shader, not extra lights. */
  readonly emissive: string;
  readonly emissiveIntensity: number;
  /** GLSL inserted after Three's standard colour fragment. */
  readonly fragment: string;
}

/**
 * One deliberately coarse material gesture per terrain grammar. Every formula
 * is world-space and quantized with `floor`: adjoining merged beds share marks,
 * and nothing acquires the smooth procedural finish the art direction forbids.
 */
export const TERRAIN_EFFECTS: Record<BiomeId, TerrainEffect> = {
  hewn: {
    name: "chisel checks", animated: false, emissive: "#000000", emissiveIntensity: 0,
    fragment: "float cut = mod(floor(terrainXZ.x * 1.25) + floor(terrainXZ.y * 1.25), 3.0); diffuseColor.rgb *= 0.90 + step(1.5, cut) * 0.10;",
  },
  mossy: {
    name: "tended rows", animated: false, emissive: "#172313", emissiveIntensity: 0.08,
    fragment: "float row = mod(floor((terrainXZ.y + 0.35) * 1.35), 3.0); diffuseColor.rgb *= 0.82 + step(0.5, row) * 0.16;",
  },
  catacomb: {
    name: "mortar wear", animated: false, emissive: "#000000", emissiveIntensity: 0,
    fragment: "float joint = mod(floor(terrainXZ.x * 1.7) + floor(terrainXZ.y * 0.85), 4.0); diffuseColor.rgb *= 0.86 + step(0.5, joint) * 0.12;",
  },
  flooded: {
    name: "stepped ripple", animated: true, emissive: "#233d42", emissiveIntensity: 0.15,
    fragment: "float ripple = floor((sin(terrainXZ.x * 3.0 + terrainXZ.y * 2.0 + terrainTime * 1.2) * 0.5 + 0.5) * 3.0) / 3.0; diffuseColor.rgb *= 0.88 + ripple * 0.24;",
  },
  foundry: {
    name: "kiln heat bands", animated: true, emissive: "#5b2614", emissiveIntensity: 0.18,
    fragment: "float heat = floor((sin(terrainXZ.y * 1.65 + terrainTime * 1.05) * 0.5 + 0.5) * 3.0) / 3.0; diffuseColor.rgb *= vec3(0.88 + heat * 0.24, 0.82 + heat * 0.12, 0.78 + heat * 0.05);",
  },
  timber: {
    name: "saw-cut bays", animated: false, emissive: "#000000", emissiveIntensity: 0,
    fragment: "float bay = mod(floor(terrainXZ.y * 1.35), 3.0); float nick = mod(floor(terrainXZ.x * 2.0), 5.0); diffuseColor.rgb *= 0.84 + step(0.5, bay) * 0.10 + step(3.5, nick) * 0.06;",
  },
  bone: {
    name: "ossuary flecks", animated: false, emissive: "#1c1a16", emissiveIntensity: 0.05,
    fragment: "float fleck = mod(floor(terrainXZ.x * 2.4) * 3.0 + floor(terrainXZ.y * 2.4) * 5.0, 7.0); diffuseColor.rgb *= 0.84 + step(4.5, fleck) * 0.22;",
  },
  crystal: {
    name: "resonant facets", animated: true, emissive: "#4e3d68", emissiveIntensity: 0.16,
    fragment: "float facets = floor((sin((terrainXZ.x + terrainXZ.y) * 2.25 + terrainTime * 0.55) + sin((terrainXZ.x - terrainXZ.y) * 1.65 - terrainTime * 0.35) + 2.0) * 0.75) / 3.0; diffuseColor.rgb *= 0.82 + facets * 0.30;",
  },
  fungal: {
    name: "spore breathing", animated: true, emissive: "#25473a", emissiveIntensity: 0.13,
    fragment: "float fan = floor((sin(length(terrainXZ) * 2.1 - terrainTime * 0.65) * 0.5 + 0.5) * 3.0) / 3.0; diffuseColor.rgb *= vec3(0.80 + fan * 0.12, 0.86 + fan * 0.22, 0.82 + fan * 0.16);",
  },
  ash: {
    name: "sifting windrows", animated: true, emissive: "#261b17", emissiveIntensity: 0.06,
    fragment: "float sift = floor((sin(terrainXZ.x * 0.7 + terrainXZ.y * 2.4 + terrainTime * 0.28) * 0.5 + 0.5) * 2.0) / 2.0; diffuseColor.rgb *= 0.80 + sift * 0.18;",
  },
  salt: {
    name: "raked salt checks", animated: false, emissive: "#31413f", emissiveIntensity: 0.07,
    fragment: "float rake = mod(floor((terrainXZ.x + terrainXZ.y) * 1.5) + floor((terrainXZ.x - terrainXZ.y) * 0.75), 5.0); diffuseColor.rgb *= 0.82 + step(2.5, rake) * 0.19;",
  },
};

