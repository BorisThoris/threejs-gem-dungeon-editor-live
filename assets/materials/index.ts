// Materials index
// This file defines available materials and their properties

export interface MaterialDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  type: 'standard' | 'pbr' | 'toon' | 'unlit';
  properties: {
    color?: string;
    metalness?: number;
    roughness?: number;
    emissive?: string;
    emissiveIntensity?: number;
    normalMap?: string;
    aoMap?: string;
    displacementMap?: string;
  };
  textures?: string[];
}

export const MATERIALS: MaterialDefinition[] = [
  {
    id: 'default',
    name: 'Default Material',
    category: 'Basic',
    description: 'Default material with basic properties',
    type: 'standard',
    properties: {
      color: '#ffffff',
      metalness: 0.0,
      roughness: 0.5
    }
  },
  {
    id: 'metal',
    name: 'Metal',
    category: 'Metallic',
    description: 'Metallic material with high metalness',
    type: 'pbr',
    properties: {
      color: '#cccccc',
      metalness: 1.0,
      roughness: 0.1
    }
  },
  {
    id: 'wood',
    name: 'Wood',
    category: 'Natural',
    description: 'Wood material with natural properties',
    type: 'pbr',
    properties: {
      color: '#8B4513',
      metalness: 0.0,
      roughness: 0.8
    }
  },
  {
    id: 'glass',
    name: 'Glass',
    category: 'Transparent',
    description: 'Transparent glass material',
    type: 'standard',
    properties: {
      color: '#ffffff',
      metalness: 0.0,
      roughness: 0.0
    }
  },
  {
    id: 'emissive',
    name: 'Emissive',
    category: 'Special',
    description: 'Self-illuminated material',
    type: 'unlit',
    properties: {
      color: '#00ff00',
      emissive: '#00ff00',
      emissiveIntensity: 1.0
    }
  }
];

export const getMaterialUrl = (materialId: string): string => {
  return `/assets/materials/${materialId}.json`;
};

export const getMaterialsByCategory = (category: string): MaterialDefinition[] => {
  return MATERIALS.filter(material => material.category === category);
};
