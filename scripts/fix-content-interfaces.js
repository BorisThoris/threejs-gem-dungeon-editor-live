const fs = require('fs');
const path = require('path');

// Content block interface mappings
const interfaceMappings = {
  'ArenaRoomProps': 'ArenaContentProps',
  'BossRoomProps': 'BossContentProps',
  'ChallengeRoomProps': 'ChallengeContentProps',
  'CoffeeRoomProps': 'CoffeeContentProps',
  'CryptRoomProps': 'CryptContentProps',
  'EndRoomProps': 'EndContentProps',
  'EnemyRoomProps': 'EnemyContentProps',
  'PortalRoomProps': 'PortalContentProps',
  'PuzzleRoomProps': 'PuzzleContentProps',
  'SpecialRoomProps': 'SpecialContentProps',
  'TrapRoomProps': 'TrapContentProps',
  'TreasureRoomProps': 'TreasureContentProps',
  'LibraryUpgradeRoomProps': 'LibraryUpgradeContentProps'
};

const gameRoomsDir = 'src/components/primitives/game-rooms';

console.log('🔄 Fixing content block interface mismatches...\n');

// Get all content files
const contentFiles = fs.readdirSync(gameRoomsDir)
  .filter(file => file.endsWith('Content.tsx'))
  .map(file => path.join(gameRoomsDir, file));

contentFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Fix interface mismatches
    Object.entries(interfaceMappings).forEach(([oldInterface, newInterface]) => {
      const pattern = new RegExp(`\\b${oldInterface}\\b`, 'g');
      if (pattern.test(content)) {
        content = content.replace(pattern, newInterface);
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed interfaces in: ${path.basename(filePath)}`);
    } else {
      console.log(`⚪ No changes needed: ${path.basename(filePath)}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log('\n🎉 Interface fixes complete!');
