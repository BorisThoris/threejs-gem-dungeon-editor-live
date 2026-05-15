const fs = require('fs');
const path = require('path');

// We'll generate the textures directly here since we can't import TS files in Node.js

// Generate textures
const textures = generateThemeTextures();

// Create metadata
const metadata = {
  version: "1.0.0",
  description: "Procedurally generated texture definitions using theme colors",
  totalTextures: textures.length,
  lastUpdated: new Date().toISOString().split('T')[0],
  categories: [...new Set(textures.map(t => t.category))],
  sizes: [...new Set(textures.map(t => `${t.width}x${t.height}`))]
};

// Create the complete texture definitions file
const textureDefinitions = {
  metadata,
  textures
};

// Ensure assets directory exists
const assetsDir = path.join(__dirname, '..', 'assets', 'textures');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Write the texture definitions
const outputPath = path.join(assetsDir, 'textureDefinitions.json');
fs.writeFileSync(outputPath, JSON.stringify(textureDefinitions, null, 2));

console.log(`✅ Generated ${textures.length} textures in ${outputPath}`);
console.log(`📊 Categories: ${metadata.categories.join(', ')}`);
console.log(`📏 Sizes: ${metadata.sizes.join(', ')}`);

// Create individual texture files for each texture
textures.forEach(texture => {
  const texturePath = path.join(assetsDir, `${texture.id}.json`);
  fs.writeFileSync(texturePath, JSON.stringify(texture, null, 2));
});

console.log(`📁 Created individual texture files in ${assetsDir}`);
