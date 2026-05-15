/**
 * Maps biome/room types to the standardized room types used by useRoomActions
 * This ensures consistency between the game and 3D editor
 */

export const mapToRoomType = (biomeType: string): string | null => {
  const mapping: Record<string, string> = {
    // Direct mappings
    "coffee": "coffee",
    "meditation": "meditation", 
    "library": "library",
    "shop": "shop",
    "treasure": "treasure",
    "puzzle": "puzzle",
    "boss": "boss",
    "arena": "arena",
    "end": "end",
    "portal": "portal",
    "challenge": "challenge",
    "library-upgrade": "library-upgrade",
    "trap": "trap",
    "laboratory": "laboratory",
    "observatory": "observatory",
    "start": "start",
    
    // Mappings for similar functionality
    "bench-press": "benchpress",
    "gym": "benchpress", // Map gym to benchpress for strength training
    "stairs": "normal", // Stairs are just normal rooms
    "middle-stairs": "normal",
    "special": "normal", // Special rooms are normal with special properties
    "colosseum": "arena", // Colosseum is similar to arena
    "crypt": "normal", // Crypt is a normal room type
    "garden": "normal", // Garden is a normal room
    "kitchen": "normal", // Kitchen is a normal room
    "bedroom": "normal", // Bedroom is a normal room
    "workshop": "normal", // Workshop is a normal room
    "arch": "normal", // Arch is a normal room
    "pillar": "normal", // Pillar is a normal room
    "barrier": "normal", // Barrier is a normal room
    "maze": "normal", // Maze is a normal room
    "bridge": "normal", // Bridge is a normal room
    "statue": "normal", // Statue is a normal room
  };

  return mapping[biomeType] || null;
};

/**
 * Checks if a biome type has action cards available
 */
export const hasActionCards = (biomeType: string): boolean => {
  return mapToRoomType(biomeType) !== null;
};
