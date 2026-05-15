// 3D Models index
// This file defines available 3D models and their metadata

export interface ModelDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  filename: string;
  format: 'gltf' | 'glb' | 'obj' | 'fbx';
  size: string;
  vertices?: number;
  textures?: string[];
  materials?: string[];
}

export const MODELS: ModelDefinition[] = [
  {
    id: 'cube',
    name: 'Cube',
    category: 'Primitives',
    description: 'Basic cube primitive',
    filename: 'cube.gltf',
    format: 'gltf',
    size: '1x1x1'
  },
  {
    id: 'sphere',
    name: 'Sphere',
    category: 'Primitives', 
    description: 'Basic sphere primitive',
    filename: 'sphere.gltf',
    format: 'gltf',
    size: '1x1x1'
  },
  {
    id: 'plane',
    name: 'Plane',
    category: 'Primitives',
    description: 'Basic plane primitive',
    filename: 'plane.gltf', 
    format: 'gltf',
    size: '1x1'
  },
  {
    id: 'cylinder',
    name: 'Cylinder',
    category: 'Primitives',
    description: 'Basic cylinder primitive',
    filename: 'cylinder.gltf',
    format: 'gltf',
    size: '1x1x1'
  },
  {
    id: 'player-hand',
    name: 'Player Hand',
    category: 'Player',
    description: '3D floating hand for player interactions',
    filename: 'player-hand.tsx',
    format: 'tsx',
    size: '0.6x0.4x0.2',
    vertices: 120,
    materials: ['skin-tone']
  }
];

export const getModelUrl = (modelId: string): string => {
  const model = MODELS.find(m => m.id === modelId);
  if (!model) {
    throw new Error(`Model not found: ${modelId}`);
  }
  return `/assets/models/${model.filename}`;
};

export const getModelsByCategory = (category: string): ModelDefinition[] => {
  return MODELS.filter(model => model.category === category);
};
