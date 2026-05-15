// Generate award bag texture using the texture system
// This script creates a magical treasure bag texture

const generateAwardBagTexture = () => {
  console.log("🎒 Generating Award Bag Texture...");
  
  // Create a canvas for the texture
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  
  // Background - dark leather bag color
  ctx.fillStyle = '#2D1810';
  ctx.fillRect(0, 0, 128, 128);
  
  // Add leather texture pattern
  ctx.fillStyle = '#3D2415';
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    const size = Math.random() * 8 + 2;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Add stitching lines
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 2;
  ctx.beginPath();
  // Top stitching
  ctx.moveTo(10, 20);
  ctx.lineTo(118, 20);
  // Bottom stitching
  ctx.moveTo(10, 108);
  ctx.lineTo(118, 108);
  // Side stitching
  ctx.moveTo(20, 10);
  ctx.lineTo(20, 118);
  ctx.moveTo(108, 10);
  ctx.lineTo(108, 118);
  ctx.stroke();
  
  // Add magical glow effect
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
  gradient.addColorStop(0.7, 'rgba(255, 215, 0, 0.1)');
  gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  
  // Add magical sparkles
  ctx.fillStyle = '#FFD700';
  for (let i = 0; i < 15; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    const size = Math.random() * 2 + 1;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Add bag opening (darker area)
  ctx.fillStyle = '#1A0F08';
  ctx.beginPath();
  ctx.ellipse(64, 30, 40, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Add magical runes around the bag
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 1;
  const runes = ['✦', '✧', '✩', '✪', '✫'];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const x = 64 + Math.cos(angle) * 45;
    const y = 64 + Math.sin(angle) * 45;
    ctx.font = '16px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(runes[i % runes.length], x - 8, y + 6);
  }
  
  // Convert to base64
  const dataURL = canvas.toDataURL('image/png');
  console.log("✅ Award bag texture generated!");
  console.log("Data URL:", dataURL.substring(0, 100) + "...");
  
  return dataURL;
};

// Export for use in components
if (typeof window !== 'undefined') {
  window.generateAwardBagTexture = generateAwardBagTexture;
}

// Auto-generate if in browser
if (typeof window !== 'undefined' && window.texturePainter) {
  generateAwardBagTexture();
}
