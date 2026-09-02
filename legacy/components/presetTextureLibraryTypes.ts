export type PresetTextureDefinition = {
  id: string;
  name: string;
  category: string;
  description: string;
  width: number;
  height: number;
  filename: string;
  previewFilename: string;
  url: string;
  previewUrl: string;
};

// Runtime export for compatibility
export const PresetTextureDefinition = {} as PresetTextureDefinition;

// Texture categories
export const TEXTURE_CATEGORIES = {
  NATURAL: "Natural",
  BUILDING: "Building",
  PIXEL_ART: "Pixel Art",
  PATTERNS: "Patterns",
  ABSTRACT: "Abstract",
};
