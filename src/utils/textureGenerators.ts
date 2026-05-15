// Texture generators that can be used in both browser and Node.js environments

// Wood texture generator
export const generateWoodTexture = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Base wood color
  const baseColor = "#8B4513";
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  // Wood grain lines
  for (let i = 0; i < 20; i++) {
    const y = (height / 20) * i + Math.random() * 10 - 5;
    const alpha = 0.1 + Math.random() * 0.2;
    const lineWidth = 1 + Math.random() * 3;
    
    ctx.strokeStyle = `rgba(139, 69, 19, ${alpha})`;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y + Math.sin(i * 0.5) * 5);
    ctx.stroke();
  }

  // Add some darker wood rings
  for (let i = 0; i < 5; i++) {
    const centerX = width * (0.3 + Math.random() * 0.4);
    const centerY = height * (0.3 + Math.random() * 0.4);
    const radius = 20 + Math.random() * 40;
    
    ctx.strokeStyle = `rgba(101, 67, 33, 0.3)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  return canvas;
};

// Cobblestone texture generator
export const generateCobblestoneTexture = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Base stone color
  ctx.fillStyle = "#696969";
  ctx.fillRect(0, 0, width, height);

  // Generate irregular stone shapes
  const stoneSize = 20 + Math.random() * 15;
  const stonesX = Math.ceil(width / stoneSize);
  const stonesY = Math.ceil(height / stoneSize);

  for (let x = 0; x < stonesX; x++) {
    for (let y = 0; y < stonesY; y++) {
      const offsetX = (Math.random() - 0.5) * stoneSize * 0.3;
      const offsetY = (Math.random() - 0.5) * stoneSize * 0.3;
      const stoneWidth = stoneSize * (0.7 + Math.random() * 0.6);
      const stoneHeight = stoneSize * (0.7 + Math.random() * 0.6);
      
      const stoneX = x * stoneSize + offsetX;
      const stoneY = y * stoneSize + offsetY;

      // Stone color variation
      const gray = 80 + Math.random() * 40;
      ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
      
      // Draw rounded stone
      ctx.beginPath();
      ctx.roundRect(stoneX, stoneY, stoneWidth, stoneHeight, 3);
      ctx.fill();

      // Add stone highlight
      ctx.fillStyle = `rgba(255, 255, 255, 0.1)`;
      ctx.beginPath();
      ctx.roundRect(stoneX + 2, stoneY + 2, stoneWidth - 4, stoneHeight / 3, 2);
      ctx.fill();

      // Add stone shadow
      ctx.fillStyle = `rgba(0, 0, 0, 0.2)`;
      ctx.beginPath();
      ctx.roundRect(
        stoneX + 2,
        stoneY + stoneHeight - 4,
        stoneWidth - 4,
        stoneHeight / 3,
        2
      );
      ctx.fill();
    }
  }

  return canvas;
};

// Brick texture generator
export const generateBrickTexture = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Base brick color
  ctx.fillStyle = "#B22222";
  ctx.fillRect(0, 0, width, height);

  const brickWidth = 60;
  const brickHeight = 20;
  const mortarWidth = 3;

  // Draw bricks in offset pattern
  for (let y = 0; y < height; y += brickHeight + mortarWidth) {
    const offset =
      (y / (brickHeight + mortarWidth)) % 2 === 0 ? 0 : brickWidth / 2;

    for (
      let x = -brickWidth;
      x < width + brickWidth;
      x += brickWidth + mortarWidth
    ) {
      const brickX = x + offset;
      const brickY = y;

      // Brick color variation
      const red = 150 + Math.random() * 50;
      const green = 20 + Math.random() * 20;
      const blue = 20 + Math.random() * 20;

      ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
      ctx.fillRect(brickX, brickY, brickWidth, brickHeight);

      // Add brick highlight
      ctx.fillStyle = `rgba(255, 255, 255, 0.1)`;
      ctx.fillRect(brickX + 2, brickY + 2, brickWidth - 4, 3);

      // Add brick shadow
      ctx.fillStyle = `rgba(0, 0, 0, 0.2)`;
      ctx.fillRect(brickX + 2, brickY + brickHeight - 3, brickWidth - 4, 3);
    }
  }

  // Add mortar lines
  ctx.fillStyle = "#8B7355";
  for (let y = 0; y < height; y += brickHeight + mortarWidth) {
    ctx.fillRect(0, y + brickHeight, width, mortarWidth);
  }

  return canvas;
};

// Grass texture generator
export const generateGrassTexture = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Base grass color
  ctx.fillStyle = "#228B22";
  ctx.fillRect(0, 0, width, height);

  // Add grass blades
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const length = 5 + Math.random() * 15;
    const angle = Math.random() * Math.PI * 2;

    const green = 20 + Math.random() * 60;
    ctx.strokeStyle = `rgb(0, ${green}, 0)`;
    ctx.lineWidth = 1 + Math.random() * 2;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.stroke();
  }

  return canvas;
};

// Water texture generator
export const generateWaterTexture = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Base water color
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#87CEEB");
  gradient.addColorStop(1, "#4682B4");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add water ripples
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = 10 + Math.random() * 30;

    ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  return canvas;
};

// Pixel art checkerboard
export const generatePixelCheckerboard = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const pixelSize = 8;
  const colors = ["#FF0000", "#0000FF", "#00FF00", "#FFFF00"];

  for (let x = 0; x < width; x += pixelSize) {
    for (let y = 0; y < height; y += pixelSize) {
      const colorIndex = (x / pixelSize + y / pixelSize) % colors.length;
      ctx.fillStyle = colors[colorIndex];
      ctx.fillRect(x, y, pixelSize, pixelSize);
    }
  }

  return canvas;
};

// Pixel art brick pattern
export const generatePixelBrick = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const pixelSize = 4;
  const brickWidth = 8;
  const brickHeight = 4;

  // Base color
  ctx.fillStyle = "#8B4513";
  ctx.fillRect(0, 0, width, height);

  for (let y = 0; y < height; y += brickHeight * pixelSize) {
    const offset =
      (y / (brickHeight * pixelSize)) % 2 === 0
        ? 0
        : (brickWidth * pixelSize) / 2;

    for (
      let x = -brickWidth * pixelSize;
      x < width + brickWidth * pixelSize;
      x += brickWidth * pixelSize
    ) {
      const brickX = x + offset;
      const brickY = y;

      // Draw brick
      ctx.fillStyle = "#A0522D";
      ctx.fillRect(
        brickX,
        brickY,
        brickWidth * pixelSize,
        brickHeight * pixelSize
      );

      // Add highlight
      ctx.fillStyle = "#CD853F";
      for (let px = 0; px < brickWidth; px++) {
        for (let py = 0; py < 1; py++) {
          ctx.fillRect(
            brickX + px * pixelSize,
            brickY + py * pixelSize,
            pixelSize,
            pixelSize
          );
        }
      }
    }
  }

  return canvas;
};

// Diamond pattern
export const generateDiamondPattern = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const diamondSize = 20;
  const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"];

  for (let x = 0; x < width + diamondSize; x += diamondSize) {
    for (let y = 0; y < height + diamondSize; y += diamondSize) {
      const colorIndex = (x / diamondSize + y / diamondSize) % colors.length;
      ctx.fillStyle = colors[colorIndex];

      ctx.beginPath();
      ctx.moveTo(x, y - diamondSize / 2);
      ctx.lineTo(x + diamondSize / 2, y);
      ctx.lineTo(x, y + diamondSize / 2);
      ctx.lineTo(x - diamondSize / 2, y);
      ctx.closePath();
      ctx.fill();
    }
  }

  return canvas;
};

// Noise texture
export const generateNoiseTexture = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = Math.random() * 255;
    data[i] = noise; // Red
    data[i + 1] = noise; // Green
    data[i + 2] = noise; // Blue
    data[i + 3] = 255; // Alpha
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
};
