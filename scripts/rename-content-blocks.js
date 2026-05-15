const fs = require('fs');
const path = require('path');

// Content blocks that should be renamed from *Room to *Content
const contentBlocks = [
  'LibraryRoom',
  'ShopRoom', 
  'TreasureRoom',
  'PuzzleRoom',
  'BossRoom',
  'CoffeeRoom',
  'MeditationRoom',
  'BenchPressRoom',
  'PortalRoom',
  'ArenaRoom',
  'EnemyRoom',
  'EndRoom',
  'SpecialRoom',
  'ChallengeRoom',
  'LibraryUpgradeRoom',
  'TrapRoom',
  'CryptRoom',
  'SpiderLair',
  'TreasureVault'
];

// True rooms that should keep their names
const trueRooms = [
  'StartRoom',
  'CorridorRoom', 
  'ColosseumRoom',
  'StairsRoom',
  'MiddleStairsRoom'
];

const gameRoomsDir = 'src/components/primitives/game-rooms';

console.log('🔄 Renaming content blocks from *Room to *Content...\n');

contentBlocks.forEach(roomName => {
  const oldFileName = `${roomName}.tsx`;
  const newFileName = `${roomName.replace('Room', 'Content')}.tsx`;
  const oldFilePath = path.join(gameRoomsDir, oldFileName);
  const newFilePath = path.join(gameRoomsDir, newFileName);
  
  if (fs.existsSync(oldFilePath)) {
    try {
      // Read the file content
      let content = fs.readFileSync(oldFilePath, 'utf8');
      
      // Replace interface names
      const interfacePattern = new RegExp(`interface ${roomName}Props`, 'g');
      content = content.replace(interfacePattern, `interface ${roomName.replace('Room', 'Content')}Props`);
      
      // Replace component names
      const componentPattern = new RegExp(`const ${roomName}:`, 'g');
      content = content.replace(componentPattern, `const ${roomName.replace('Room', 'Content')}:`);
      
      // Replace export default
      const exportPattern = new RegExp(`export default ${roomName};`, 'g');
      content = content.replace(exportPattern, `export default ${roomName.replace('Room', 'Content')};`);
      
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

console.log('\n🏠 True rooms (keeping *Room naming):');
trueRooms.forEach(roomName => {
  const fileName = `${roomName}.tsx`;
  const filePath = path.join(gameRoomsDir, fileName);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${fileName} (kept as room)`);
  } else {
    console.log(`⚠️  File not found: ${fileName}`);
  }
});

console.log('\n🎉 Content block renaming complete!');
