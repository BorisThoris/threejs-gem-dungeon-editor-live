// Script to generate 4 smoke texture frames using the texture painter API
// This will create a spritesheet for animated smoke

const generateSmokeTextures = () => {
  console.log("🎨 Generating smoke textures...");
  
  // Wait for texture painter to be available
  const checkForPainter = () => {
    if (window.texturePainter) {
      const painter = window.texturePainter;
      
      // Set up for smoke texture generation
      painter.setMode("free");
      painter.setCanvasSize(64, 64); // Small texture for smoke
      
      const smokeFrames = [];
      
      // Generate 4 smoke frames
      for (let frame = 0; frame < 4; frame++) {
        console.log(`Generating smoke frame ${frame + 1}/4...`);
        
        // Clear canvas
        painter.clearLayer();
        
        // Set up brush for smoke
        painter.setBrush({
          id: "soft",
          name: "Soft",
          icon: "○",
          size: 20 + frame * 5, // Increasing size for each frame
          opacity: 0.3 + frame * 0.1, // Increasing opacity
          hardness: 0.2,
          spacing: 0.05,
          color: "#AAAAAA"
        });
        
        // Generate smoke pattern for this frame
        generateSmokeFrame(painter, frame);
        
        // Get the texture data
        const textureData = painter.getCurrentTexture();
        smokeFrames.push({
          frame: frame + 1,
          data: textureData,
          name: `smoke_frame_${frame + 1}`
        });
      }
      
      // Create spritesheet
      createSmokeSpritesheet(smokeFrames);
      
    } else {
      setTimeout(checkForPainter, 100);
    }
  };
  
  checkForPainter();
};

const generateSmokeFrame = (painter, frameIndex) => {
  const centerX = 32;
  const centerY = 32;
  
  // Different smoke patterns for each frame
  switch (frameIndex) {
    case 0: // Small, tight smoke
      drawSmokePattern(painter, centerX, centerY, 8, 0.2);
      break;
    case 1: // Growing smoke
      drawSmokePattern(painter, centerX, centerY, 12, 0.3);
      break;
    case 2: // Larger, more diffuse
      drawSmokePattern(painter, centerX, centerY, 16, 0.4);
      break;
    case 3: // Largest, most diffuse
      drawSmokePattern(painter, centerX, centerY, 20, 0.5);
      break;
  }
};

const drawSmokePattern = (painter, centerX, centerY, radius, intensity) => {
  // Create wavy, organic smoke pattern
  const points = [];
  const numPoints = 16;
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const waveOffset = Math.sin(angle * 3) * 3; // Wavy pattern
    const r = radius + waveOffset + Math.random() * 4;
    
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;
    points.push({ x, y });
  }
  
  // Draw smoke using the points
  points.forEach((point, index) => {
    const nextPoint = points[(index + 1) % points.length];
    
    // Draw wavy line between points
    const steps = 8;
    for (let step = 0; step < steps; step++) {
      const t = step / steps;
      const x = point.x + (nextPoint.x - point.x) * t;
      const y = point.y + (nextPoint.y - point.y) * t;
      
      // Add some randomness for organic feel
      const offsetX = (Math.random() - 0.5) * 2;
      const offsetY = (Math.random() - 0.5) * 2;
      
      painter.drawPoint(x + offsetX, y + offsetY);
    }
  });
  
  // Add some central density
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius * 0.5;
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;
    painter.drawPoint(x, y);
  }
};

const createSmokeSpritesheet = (frames) => {
  console.log("📦 Creating smoke spritesheet...");
  
  // Create a canvas for the spritesheet
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set spritesheet dimensions (4 frames horizontally)
  canvas.width = 64 * 4; // 4 frames
  canvas.height = 64; // 1 row
  
  // Draw each frame
  frames.forEach((frame, index) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, index * 64, 0, 64, 64);
      
      // If this is the last frame, save the spritesheet
      if (index === frames.length - 1) {
        const spritesheetData = canvas.toDataURL('image/png');
        saveSmokeTextures(spritesheetData, frames);
      }
    };
    img.src = frame.data;
  });
};

const saveSmokeTextures = (spritesheetData, frames) => {
  console.log("💾 Saving smoke textures...");
  
  // Save individual frames
  frames.forEach(frame => {
    const link = document.createElement('a');
    link.download = `${frame.name}.png`;
    link.href = frame.data;
    link.click();
  });
  
  // Save spritesheet
  const spritesheetLink = document.createElement('a');
  spritesheetLink.download = 'smoke_spritesheet.png';
  spritesheetLink.href = spritesheetData;
  spritesheetLink.click();
  
  console.log("✅ Smoke textures generated and saved!");
  console.log("Files saved:");
  console.log("- smoke_frame_1.png");
  console.log("- smoke_frame_2.png");
  console.log("- smoke_frame_3.png");
  console.log("- smoke_frame_4.png");
  console.log("- smoke_spritesheet.png");
};

// Export the function
window.generateSmokeTextures = generateSmokeTextures;

console.log("🎨 Smoke texture generator loaded!");
console.log("Run generateSmokeTextures() to create smoke textures");
