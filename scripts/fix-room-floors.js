#!/usr/bin/env node

/**
 * Script to automatically fix room floor implementations
 * Removes individual floor meshes from room components since they now use RoomFloor
 */

const fs = require('fs');
const path = require('path');

const roomsDir = path.join(__dirname, '../src/components/primitives/game-rooms');

// Patterns to remove (floor implementations)
const floorPatterns = [
  // Basic floor mesh patterns
  {
    pattern: /{\s*\/\*.*Floor.*\*\/\s*<mesh position=\[0, -0\.5, 0\][^}]+}\s*<\/mesh>\s*}/gs,
    replacement: ''
  },
  // RigidBody floor patterns
  {
    pattern: /{\s*\/\*.*Floor.*\*\/\s*<RigidBody[^}]+}<\/RigidBody>\s*}/gs,
    replacement: ''
  },
  // Simple floor mesh without comments
  {
    pattern: /<mesh position=\[0, -0\.5, 0\] receiveShadow>\s*<boxGeometry args=\[8, 1, 8\] \/>\s*<meshStandardMaterial color="[^"]+" \/>\s*<\/mesh>/g,
    replacement: ''
  },
  // Floor with different sizes
  {
    pattern: /<mesh position=\[0, -0\.5, 0\] receiveShadow>\s*<boxGeometry args=\[[0-9]+, 1, [0-9]+\] \/>\s*<meshStandardMaterial color="[^"]+" \/>\s*<\/mesh>/g,
    replacement: ''
  }
];

// Room files to process (excluding ShapedShell and RoomFactory)
const roomFiles = [
  'ArenaRoom.tsx',
  'BenchPressRoom.tsx',
  'BossRoom.tsx',
  'ChallengeRoom.tsx',
  'CoffeeRoom.tsx',
  'ColosseumRoom.tsx',
  'CorridorRoom.tsx',
  'CryptRoom.tsx',
  'EndRoom.tsx',
  'EnemyRoom.tsx',
  'LibraryUpgradeRoom.tsx',
  'MeditationRoom.tsx',
  'PuzzleRoom.tsx',
  'SpecialRoom.tsx',
  'SpiderLair.tsx',
  'StairsRoom.tsx',
  'MiddleStairsRoom.tsx',
  'TrapRoom.tsx',
  'TreasureVault.tsx'
];

function processFile(filePath) {
  console.log(`Processing ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let changes = 0;

  // Apply each pattern
  floorPatterns.forEach(({ pattern, replacement }, index) => {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`  Found ${matches.length} floor pattern(s) (pattern ${index + 1})`);
      content = content.replace(pattern, replacement);
      changes += matches.length;
    }
  });

  // Clean up extra whitespace and empty lines
  content = content
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple empty lines to double
    .replace(/{\s*\n\s*}/g, '{\n  // Floor handled by RoomFloor component\n}') // Empty groups
    .replace(/<group>\s*{\s*\/\*.*Floor.*\*\/\s*}/g, '<group>') // Groups with only floor comments
    .replace(/<group>\s*{\s*\/\*.*Floor.*\*\/\s*<[^}]+}\s*<\/mesh>\s*}/g, '<group>'); // Groups with floor meshes

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`  ✅ Updated ${filePath} (${changes} changes)`);
  } else {
    console.log(`  ⏭️  No changes needed for ${filePath}`);
  }
}

function main() {
  console.log('🔧 Fixing room floor implementations...\n');

  roomFiles.forEach(fileName => {
    const filePath = path.join(roomsDir, fileName);
    processFile(filePath);
  });

  console.log('\n✅ Floor fixing complete!');
  console.log('\nAll rooms now use the unified RoomFloor component.');
  console.log('Floors will automatically match room type, shape, and theme.');
}

main();
