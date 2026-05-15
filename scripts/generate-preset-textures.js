const fs = require('fs');
const path = require('path');

// Create the preset textures directory
const presetDir = path.join(__dirname, '..', 'public', 'preset-textures');
if (!fs.existsSync(presetDir)) {
  fs.mkdirSync(presetDir, { recursive: true });
}

// Import the texture generators (we'll need to adapt them for Node.js)
const { generateWoodTexture, generateCobblestoneTexture, generateBrickTexture, generateGrassTexture, generateWaterTexture, generatePixelCheckerboard, generatePixelBrick, generateDiamondPattern, generateNoiseTexture } = require('../src/components/TextureGenerators');

// Texture definitions
const textureDefinitions = [
  {
    id: "wood",
    name: "Wood Grain",
    category: "Natural",
    description: "Natural wood grain texture",
    width: 256,
    height: 256,
    generator: generateWoodTexture,
  },
  {
    id: "grass",
    name: "Grass",
    category: "Natural",
    description: "Natural grass texture",
    width: 256,
    height: 256,
    generator: generateGrassTexture,
  },
  {
    id: "water",
    name: "Water",
    category: "Natural",
    description: "Water ripple texture",
    width: 256,
    height: 256,
    generator: generateWaterTexture,
  },
  {
    id: "cobblestone",
    name: "Cobblestone",
    category: "Building",
    description: "Stone cobblestone texture",
    width: 256,
    height: 256,
    generator: generateCobblestoneTexture,
  },
  {
    id: "brick",
    name: "Brick",
    category: "Building",
    description: "Red brick texture",
    width: 256,
    height: 256,
    generator: generateBrickTexture,
  },
  {
    id: "pixel_checkerboard",
    name: "Pixel Checkerboard",
    category: "Pixel Art",
    description: "Colorful pixel art checkerboard",
    width: 64,
    height: 64,
    generator: generatePixelCheckerboard,
  },
  {
    id: "pixel_brick",
    name: "Pixel Brick",
    category: "Pixel Art",
    description: "Pixel art brick pattern",
    width: 64,
    height: 64,
    generator: generatePixelBrick,
  },
  {
    id: "diamond_pattern",
    name: "Diamond Pattern",
    category: "Patterns",
    description: "Colorful diamond pattern",
    width: 128,
    height: 128,
    generator: generateDiamondPattern,
  },
  {
    id: "noise",
    name: "Noise",
    category: "Abstract",
    description: "Random noise texture",
    width: 256,
    height: 256,
    generator: generateNoiseTexture,
  }
];

// Generate and save textures
async function generatePresetTextures() {
  console.log('🎨 Generating preset textures...');
  
  const textureManifest = [];
  
  for (const texture of textureDefinitions) {
    try {
      console.log(`Generating ${texture.name}...`);
      
      // Generate the texture
      const canvas = texture.generator(texture.width, texture.height);
      
      // Convert to buffer
      const buffer = canvas.toBuffer('image/png');
      
      // Save the texture file
      const filename = `${texture.id}.png`;
      const filepath = path.join(presetDir, filename);
      fs.writeFileSync(filepath, buffer);
      
      // Generate preview (64x64)
      const previewCanvas = texture.generator(64, 64);
      const previewBuffer = previewCanvas.toBuffer('image/png');
      const previewFilename = `${texture.id}_preview.png`;
      const previewFilepath = path.join(presetDir, previewFilename);
      fs.writeFileSync(previewFilepath, previewBuffer);
      
      // Add to manifest
      textureManifest.push({
        id: texture.id,
        name: texture.name,
        category: texture.category,
        description: texture.description,
        width: texture.width,
        height: texture.height,
        filename: filename,
        previewFilename: previewFilename,
        url: `/preset-textures/${filename}`,
        previewUrl: `/preset-textures/${previewFilename}`
      });
      
      console.log(`✅ Generated ${texture.name}`);
    } catch (error) {
      console.error(`❌ Failed to generate ${texture.name}:`, error.message);
    }
  }
  
  // Save the manifest
  const manifestPath = path.join(presetDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(textureManifest, null, 2));
  
  console.log(`🎉 Generated ${textureManifest.length} preset textures!`);
  console.log(`📁 Saved to: ${presetDir}`);
  console.log(`📋 Manifest saved to: ${manifestPath}`);
}

// Run the generator
generatePresetTextures().catch(console.error);
