const fs = require('fs');
const path = require('path');

// Read the texture definitions
const textureDefinitions = JSON.parse(fs.readFileSync('src/data/textureDefinitions.json', 'utf8'));

// Create output directory
const outputDir = 'public/textures';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Function to convert hex color to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Function to create PNG from pixel data with scaling
function createPNGFromPixels(pixels, originalWidth, originalHeight, scaleFactor = 8) {
  const canvas = require('canvas');
  const width = originalWidth * scaleFactor;
  const height = originalHeight * scaleFactor;
  const canvasInstance = canvas.createCanvas(width, height);
  const ctx = canvasInstance.getContext('2d');
  
  // Enable image smoothing for better scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Create a small canvas with the original pattern
  const smallCanvas = canvas.createCanvas(originalWidth, originalHeight);
  const smallCtx = smallCanvas.getContext('2d');
  const imageData = smallCtx.createImageData(originalWidth, originalHeight);
  
  for (let i = 0; i < pixels.length; i++) {
    const pixelIndex = i * 4;
    const color = hexToRgb(pixels[i]);
    
    if (color) {
      imageData.data[pixelIndex] = color.r;     // Red
      imageData.data[pixelIndex + 1] = color.g; // Green
      imageData.data[pixelIndex + 2] = color.b; // Blue
      imageData.data[pixelIndex + 3] = 255;     // Alpha
    }
  }
  
  smallCtx.putImageData(imageData, 0, 0);
  
  // Scale up the small canvas to the target size
  ctx.drawImage(smallCanvas, 0, 0, originalWidth, originalHeight, 0, 0, width, height);
  
  return canvasInstance.toBuffer('image/png');
}

// Export each texture with 8x scaling (16x16 -> 128x128)
textureDefinitions.forEach(texture => {
  try {
    console.log(`Exporting ${texture.name} (${texture.width}x${texture.height} -> ${texture.width * 8}x${texture.height * 8})...`);
    
    const pngBuffer = createPNGFromPixels(texture.pixels, texture.width, texture.height, 8);
    const filename = `${texture.id}.png`;
    const filepath = path.join(outputDir, filename);
    
    fs.writeFileSync(filepath, pngBuffer);
    console.log(`✅ Exported ${filename} (${texture.width * 8}x${texture.height * 8})`);
  } catch (error) {
    console.error(`❌ Failed to export ${texture.name}:`, error.message);
  }
});

console.log(`\n🎨 Exported ${textureDefinitions.length} textures to ${outputDir}/`);
