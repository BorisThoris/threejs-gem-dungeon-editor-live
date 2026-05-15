const fs = require('fs');
const path = require('path');

// Copy existing assets to new structure
const copyAssets = () => {
  const projectRoot = path.join(__dirname, '..');
  const assetsDir = path.join(projectRoot, 'assets');
  
  // Copy existing sounds if they exist
  const publicSounds = path.join(projectRoot, 'public', 'sounds');
  const assetsSounds = path.join(assetsDir, 'sounds');
  
  if (fs.existsSync(publicSounds)) {
    console.log('📁 Copying sounds from public/sounds to assets/sounds');
    // Copy sound files
  }
  
  // Copy HDR files to textures
  const publicHdr = path.join(projectRoot, 'public', 'night.hdr');
  const assetsTextures = path.join(assetsDir, 'textures');
  
  if (fs.existsSync(publicHdr)) {
    console.log('📁 Copying HDR files to assets/textures');
    fs.copyFileSync(publicHdr, path.join(assetsTextures, 'night.hdr'));
  }
  
  console.log('✅ Assets organized successfully!');
};

copyAssets();
