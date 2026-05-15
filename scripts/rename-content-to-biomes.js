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

const gameRoomsDir = 'src/components/primitives/game-rooms';

console.log('🔄 Renaming content blocks to biomes...\n');

// First, rename the files
Object.entries(contentToBiomeMappings).forEach(([oldName, newName]) => {
  const oldFileName = `${oldName}.tsx`;
  const newFileName = `${newName}.tsx`;
  const oldFilePath = path.join(gameRoomsDir, oldFileName);
  const newFilePath = path.join(gameRoomsDir, newFileName);
  
  if (fs.existsSync(oldFilePath)) {
    try {
      // Read the file content
      let content = fs.readFileSync(oldFilePath, 'utf8');
      
      // Replace component names
      const componentPattern = new RegExp(`const ${oldName}:`, 'g');
      content = content.replace(componentPattern, `const ${newName}:`);
      
      // Replace interface names
      const interfacePattern = new RegExp(`interface ${oldName}Props`, 'g');
      content = content.replace(interfacePattern, `interface ${newName}Props`);
      
      // Replace export default
      const exportPattern = new RegExp(`export default ${oldName};`, 'g');
      content = content.replace(exportPattern, `export default ${newName};`);
      
      // Write the updated content to new file
      fs.writeFileSync(newFilePath, content);
      
      // Remove the old file
      fs.unlinkSync(oldFilePath);
      
      console.log(`✅ ${oldFileName} → ${newFileName}`);
    } catch (error) {
      console.error(`❌ Error processing ${oldFileName}:`, error.message);
    }
  } else {
    console.log(`⚠️  File not found: ${oldFileName}`);
  }
});

console.log('\n🎉 Content block to biome renaming complete!');
