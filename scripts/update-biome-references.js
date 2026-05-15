const fs = require('fs');
const path = require('path');

// Content block to biome mappings
const contentToBiomeMappings = {
  'LibraryContent': 'LibraryBiome',
  'ShopContent': 'ShopBiome',
  'TreasureContent': 'TreasureBiome',
  'PuzzleContent': 'PuzzleBiome',
  'BossContent': 'BossBiome',
  'CoffeeContent': 'CoffeeBiome',
  'MeditationContent': 'MeditationBiome',
  'BenchPressContent': 'GymBiome',
  'PortalContent': 'PortalBiome',
  'ArenaContent': 'ArenaBiome',
  'EnemyContent': 'EnemyBiome',
  'EndContent': 'EndBiome',
  'SpecialContent': 'SpecialBiome',
  'ChallengeContent': 'ChallengeBiome',
  'LibraryUpgradeContent': 'LibraryUpgradeBiome',
  'TrapContent': 'TrapBiome',
  'CryptContent': 'CryptBiome'
};

// Interface mappings
const interfaceMappings = {
  'LibraryContentProps': 'LibraryBiomeProps',
  'ShopContentProps': 'ShopBiomeProps',
  'TreasureContentProps': 'TreasureBiomeProps',
  'PuzzleContentProps': 'PuzzleBiomeProps',
  'BossContentProps': 'BossBiomeProps',
  'CoffeeContentProps': 'CoffeeBiomeProps',
  'MeditationContentProps': 'MeditationBiomeProps',
  'BenchPressContentProps': 'GymBiomeProps',
  'PortalContentProps': 'PortalBiomeProps',
  'ArenaContentProps': 'ArenaBiomeProps',
  'EnemyContentProps': 'EnemyBiomeProps',
  'EndContentProps': 'EndBiomeProps',
  'SpecialContentProps': 'SpecialBiomeProps',
  'ChallengeContentProps': 'ChallengeBiomeProps',
  'LibraryUpgradeContentProps': 'LibraryUpgradeBiomeProps',
  'TrapContentProps': 'TrapBiomeProps',
  'CryptContentProps': 'CryptBiomeProps'
};

// Files to update
const filesToUpdate = [
  'src/components/primitives/game-rooms/RoomFactory.tsx',
  'src/components/primitives/game-rooms/index.ts',
  'src/components/ThreeDEditor.tsx',
  'src/components/AutoThreeDEditor.tsx',
  'src/components/Room.tsx',
  'src/components/RoomDemo.tsx',
  'src/components/primitives/index.ts',
  'src/components/rooms/index.ts',
  'src/hooks/useRoomActions.ts',
  'src/types/map.ts'
];

console.log('🔄 Updating biome references...\n');

filesToUpdate.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let hasChanges = false;
      
      // Update component names
      Object.entries(contentToBiomeMappings).forEach(([oldName, newName]) => {
        const componentPattern = new RegExp(`\\b${oldName}\\b`, 'g');
        if (componentPattern.test(content)) {
          content = content.replace(componentPattern, newName);
          hasChanges = true;
        }
      });
      
      // Update interface names
      Object.entries(interfaceMappings).forEach(([oldInterface, newInterface]) => {
        const interfacePattern = new RegExp(`\\b${oldInterface}\\b`, 'g');
        if (interfacePattern.test(content)) {
          content = content.replace(interfacePattern, newInterface);
          hasChanges = true;
        }
      });
      
      // Update import paths
      Object.entries(contentToBiomeMappings).forEach(([oldName, newName]) => {
        const importPattern = new RegExp(`from.*${oldName}`, 'g');
        if (importPattern.test(content)) {
          content = content.replace(importPattern, (match) => 
            match.replace(oldName, newName)
          );
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

console.log('\n🎉 Biome reference updates complete!');
