const fs = require('fs');
const path = require('path');

// Biome title and description mappings for AutoThreeDEditor
const biomeUpdates = {
  // Update titles from "Room" to "Biome"
  'Coffee Room': 'Coffee Biome',
  'Meditation Room': 'Meditation Biome',
  'Library Upgrade Room': 'Library Upgrade Biome',
  'Library Room': 'Library Biome',
  'Shop Room': 'Shop Biome',
  'Treasure Room': 'Treasure Biome',
  'Puzzle Room': 'Puzzle Biome',
  'Boss Room': 'Boss Biome',
  'Challenge Room': 'Challenge Biome',
  'Arena Room': 'Arena Biome',
  'Enemy Room': 'Enemy Biome',
  'End Room': 'End Biome',
  'Portal Room': 'Portal Biome',
  'Trap Room': 'Trap Biome',
  'Crypt Room': 'Crypt Biome',
  'Special Room': 'Special Biome',
  
  // Update descriptions
  'A cozy room with coffee and rewards': 'A cozy coffee environment biome',
  'A peaceful room for reflection': 'A peaceful meditation environment biome',
  'A room for upgrading your library': 'A library upgrade environment biome',
  'A room with books and knowledge': 'A library environment biome with books and knowledge',
  'A room with items for sale': 'A shop environment biome with items for sale',
  'A room filled with treasure': 'A treasure environment biome filled with treasure',
  'A room with puzzles to solve': 'A puzzle environment biome with puzzles to solve',
  'A room containing a powerful boss': 'A boss environment biome containing a powerful boss',
  'A room with challenging obstacles': 'A challenge environment biome with challenging obstacles',
  'A combat arena for battles': 'An arena environment biome for combat battles',
  'A room with enemy spawns': 'An enemy environment biome with enemy spawns',
  'The final room of the adventure': 'The end environment biome of the adventure',
  'A room with portal elements': 'A portal environment biome with portal elements',
  'A room with trap elements': 'A trap environment biome with trap elements',
  'A room with crypt elements': 'A crypt environment biome with crypt elements',
  'A room with special elements': 'A special environment biome with special elements',
  
  // Update categories from "room" to "biome"
  'category: "room"': 'category: "biome"'
};

const filePath = 'src/components/AutoThreeDEditor.tsx';

console.log('🔄 Updating AutoThreeDEditor biome titles and descriptions...\n');

if (fs.existsSync(filePath)) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Update titles, descriptions, and categories
    Object.entries(biomeUpdates).forEach(([oldText, newText]) => {
      const pattern = new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (pattern.test(content)) {
        content = content.replace(pattern, newText);
        hasChanges = true;
        console.log(`✅ Updated: "${oldText}" → "${newText}"`);
      }
    });
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content);
      console.log(`\n✅ Updated AutoThreeDEditor biome titles and descriptions`);
    } else {
      console.log(`⚪ No changes needed in AutoThreeDEditor`);
    }
  } catch (error) {
    console.error(`❌ Error updating AutoThreeDEditor:`, error.message);
  }
} else {
  console.log(`⚠️  File not found: ${filePath}`);
}

console.log('\n🎉 AutoThreeDEditor biome updates complete!');
