const fs = require('fs');
const path = require('path');

// Comprehensive title and description mappings
const titleUpdates = {
  // Keep true rooms as "Room"
  'Start Room': 'Start Room', // This is a true room
  'Middle Stairs Room': 'Middle Stairs Room', // This is a true room
  'Stairs Room': 'Stairs Room', // This is a true room
  'Room Factory': 'Room Factory', // This is a factory
  'Shaped Shell Room': 'Shaped Shell Room', // This is a true room
  
  // Update demo rooms to be more descriptive
  'Component Showcase Room': 'Component Showcase Demo',
  'Clean Breakable Room': 'Clean Breakable Demo',
  
  // Update descriptions to be more accurate
  'A room showcasing various components': 'A demo showcasing various components',
  'A room with clean breakable objects': 'A demo with clean breakable objects',
  'A room with stairs in the middle': 'A room with stairs in the middle',
  'A room with stairs': 'A room with stairs',
  'A factory for creating rooms': 'A factory for creating rooms',
  'A room with a unique shell shape': 'A room with a unique shell shape',
  
  // Update element descriptions
  'Structural walls for room boundaries': 'Structural walls for room boundaries'
};

const filePath = 'src/components/ThreeDEditor.tsx';

console.log('🔄 Updating all 3D Editor titles and descriptions...\n');

if (fs.existsSync(filePath)) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Update titles and descriptions
    Object.entries(titleUpdates).forEach(([oldText, newText]) => {
      if (oldText !== newText) {
        const pattern = new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        if (pattern.test(content)) {
          content = content.replace(pattern, newText);
          hasChanges = true;
          console.log(`✅ Updated: "${oldText}" → "${newText}"`);
        }
      }
    });
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content);
      console.log(`\n✅ Updated 3D Editor titles and descriptions`);
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
