// Biome categories for organized generation
export interface BiomeCategory {
  id: string;
  name: string;
  description: string;
  biomes: string[];
  weight: number; // Relative weight for generation
  color: string; // UI color
  icon: string; // Emoji icon
}

export const BIOME_CATEGORIES: BiomeCategory[] = [
  {
    id: "buff",
    name: "Buff & Healing",
    description: "Biomes that provide positive effects and healing",
    biomes: [
      "coffee", "meditation", "gym", "bench-press", "garden", 
      "bedroom", "kitchen", "sanctuary", "shrine", "alchemy"
    ],
    weight: 0.2,
    color: "#4CAF50",
    icon: "💪"
  },
  {
    id: "resource",
    name: "Resource & Economy",
    description: "Biomes focused on resources, trading, and upgrades",
    biomes: [
      "shop", "treasure", "library", "library-upgrade", "workshop",
      "laboratory", "vault", "treasury", "armory", "forge", "normal"
    ],
    weight: 0.2,
    color: "#FF9800",
    icon: "💰"
  },
  {
    id: "puzzle",
    name: "Puzzle & Interaction",
    description: "Biomes with puzzles, mysteries, and interactive elements",
    biomes: [
      "puzzle", "maze", "observatory", "museum", "theater",
      "ballroom", "special", "secret", "cursed-room", "devil-room",
      "angel-room", "memory-chamber", "labyrinth"
    ],
    weight: 0.2,
    color: "#9C27B0",
    icon: "🧩"
  },
  {
    id: "transport",
    name: "Transportation & Movement",
    description: "Biomes that facilitate movement and transportation",
    biomes: [
      "portal", "corridor", "stairs", "middle-stairs", "bridge",
      "tunnel", "cave", "grotto", "sewer", "aqueduct", "underground",
      "subterranean", "intersection", "crossroads"
    ],
    weight: 0.15,
    color: "#2196F3",
    icon: "🚀"
  },
  {
    id: "obstacle",
    name: "Obstacle & Architectural",
    description: "Biomes that create obstacles and architectural challenges",
    biomes: [
      "arch", "pillar", "barrier", "statue", "tower", "gatehouse",
      "basement", "attic", "closet", "bathroom", "balcony", "terrace",
      "patio", "veranda", "pergola", "gazebo"
    ],
    weight: 0.1,
    color: "#607D8B",
    icon: "🚧"
  },
  {
    id: "special",
    name: "Special & Unique",
    description: "Unique and special biomes with distinctive characteristics",
    biomes: [
      "end", "start", "nexus", "void", "abyss", "pyramid", "ziggurat", 
      "pagoda", "arena", "boss", "challenge", "colosseum", "trap",
      "enemy", "throne-room", "dungeon", "crypt"
    ],
    weight: 0.15,
    color: "#E91E63",
    icon: "✨"
  },
  {
    id: "religious",
    name: "Religious & Spiritual",
    description: "Biomes with religious and spiritual significance",
    biomes: [
      "chapel", "temple", "monastery", "cathedral", "mosque", 
      "synagogue", "pagoda", "ziggurat", "pyramid", "shrine"
    ],
    weight: 0.1,
    color: "#8BC34A",
    icon: "⛪"
  },
  {
    id: "social",
    name: "Social & Gathering",
    description: "Biomes designed for social interaction and gatherings",
    biomes: [
      "theater", "ballroom", "amphitheater", "courtroom", "barracks",
      "stable", "courtyard", "plaza", "square", "rotunda", "pavilion"
    ],
    weight: 0.1,
    color: "#FF5722",
    icon: "👥"
  },
  {
    id: "geometric",
    name: "Geometric & Abstract",
    description: "Biomes with geometric and abstract shapes",
    biomes: [
      "circle", "triangle", "hexagon", "octagon", "pentagon", 
      "diamond", "star", "cross", "spiral", "square"
    ],
    weight: 0.05,
    color: "#9E9E9E",
    icon: "🔷"
  }
];

// Get all biomes from all categories
export const getAllBiomes = (): string[] => {
  return BIOME_CATEGORIES.flatMap(category => category.biomes);
};

// Get biomes by category
export const getBiomesByCategory = (categoryId: string): string[] => {
  const category = BIOME_CATEGORIES.find(cat => cat.id === categoryId);
  return category ? category.biomes : [];
};

// Get category for a specific biome
export const getCategoryForBiome = (biomeId: string): BiomeCategory | null => {
  return BIOME_CATEGORIES.find(category => 
    category.biomes.includes(biomeId)
  ) || null;
};

// Get weighted biome selection based on categories
export const getWeightedBiomes = (enabledCategories: string[] = []): Array<{ biome: string; weight: number }> => {
  const biomes: Array<{ biome: string; weight: number }> = [];
  
  BIOME_CATEGORIES.forEach(category => {
    if (enabledCategories.length === 0 || enabledCategories.includes(category.id)) {
      category.biomes.forEach(biome => {
        biomes.push({
          biome,
          weight: category.weight
        });
      });
    }
  });
  
  return biomes;
};
