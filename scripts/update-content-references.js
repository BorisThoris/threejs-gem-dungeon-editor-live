const fs = require('fs');
const path = require('path');

// Content block mappings
const contentMappings = {
  'LibraryRoom': 'LibraryContent',
  'ShopRoom': 'ShopContent',
  'TreasureRoom': 'TreasureContent',
  'PuzzleRoom': 'PuzzleContent',
  'BossRoom': 'BossContent',
  'CoffeeRoom': 'CoffeeContent',
  'MeditationRoom': 'MeditationContent',
  'BenchPressRoom': 'BenchPressContent',
  'PortalRoom': 'PortalContent',
  'ArenaRoom': 'ArenaContent',
  'EnemyRoom': 'EnemyContent',
  'EndRoom': 'EndContent',
  'SpecialRoom': 'SpecialContent',
  'ChallengeRoom': 'ChallengeContent',
  'LibraryUpgradeRoom': 'LibraryUpgradeContent',
  'TrapRoom': 'TrapContent',
  'CryptRoom': 'CryptContent'
};

// Files to update (excluding the renamed files themselves)
const filesToUpdate = [
  'src/components/AutoThreeDEditor.tsx',
  'src/components/Room.tsx',
  'src/components/primitives/index.ts',
  'src/components/rooms/index.ts',
  'src/components/RoomDemo.tsx',
  'src/utils/coffeeRoomUI.ts',
  'src/algorithms/simpleMapGenerator.ts'
];

console.log('🔄 Updating content block references...\n');

filesToUpdate.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let hasChanges = false;
      
      // Update imports
      Object.entries(contentMappings).forEach(([oldName, newName]) => {
        const importPattern = new RegExp(`import.*${oldName}.*from`, 'g');
        if (importPattern.test(content)) {
          content = content.replace(importPattern, (match) => 
            match.replace(oldName, newName)
          );
          hasChanges = true;
        }
      });
      
      // Update component references
      Object.entries(contentMappings).forEach(([oldName, newName]) => {
        const componentPattern = new RegExp(`\\b${oldName}\\b`, 'g');
        if (componentPattern.test(content)) {
          content = content.replace(componentPattern, newName);
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated: ${filePath}`);
      } else {
        console.log(`⚪ No changes needed: ${filePath}`);
      }
    } catch (error) {
      console.error(`❌ Error updating ${filePath}:`, error.message);
    }
  } else {
    console.log(`⚠️  File not found: ${filePath}`);
  }
});

console.log('\n🎉 Content block reference updates complete!');
