const fs = require('fs');
const path = require('path');

// Biome title and description mappings
const biomeUpdates = {
  'Coffee Content': 'Coffee Biome',
  'Meditation Content': 'Meditation Biome',
  'Library Upgrade Content': 'Library Upgrade Biome',
  'Coffee content block for rooms': 'Coffee environment biome for rooms',
  'Meditation content block for rooms': 'Meditation environment biome for rooms',
  'Library upgrade content block for rooms': 'Library upgrade environment biome for rooms',
  'Coffee Room': 'Coffee Biome',
  'Meditation Room': 'Meditation Biome',
  'Library Upgrade Room': 'Library Upgrade Biome',
  'A coffee room with coffee and rewards': 'A coffee environment biome with coffee and rewards',
  'A peaceful room for reflection': 'A peaceful meditation environment biome',
  'A room for upgrading your library': 'A library upgrade environment biome',
  'A cozy room with coffee and rewards': 'A cozy coffee environment biome',
  'A peaceful room for reflection': 'A peaceful meditation environment biome',
  'A room for upgrading your library': 'A library upgrade environment biome'
};

const filePath = 'src/components/ThreeDEditor.tsx';

console.log('🔄 Updating 3D Editor titles and descriptions...\n');

if (fs.existsSync(filePath)) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Update titles and descriptions
    Object.entries(biomeUpdates).forEach(([oldText, newText]) => {
      const pattern = new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (pattern.test(content)) {
        content = content.replace(pattern, newText);
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated 3D Editor titles and descriptions`);
    } else {
      console.log(`⚪ No changes needed in 3D Editor`);
    }
  } catch (error) {
    console.error(`❌ Error updating 3D Editor:`, error.message);
  }
} else {
  console.log(`⚠️  File not found: ${filePath}`);
}

console.log('\n🎉 3D Editor title updates complete!');
