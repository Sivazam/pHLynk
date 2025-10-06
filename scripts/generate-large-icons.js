#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Generate large notification icons using logo.png (keeping background)
async function generateLargeIcons() {
  const publicDir = path.join(__dirname, '..', 'public');
  const sourceImage = path.join(__dirname, '..', 'public', 'logo.png');
  
  console.log('🎨 Generating large notification icons using logo.png (keeping background)...');
  
  try {
    // Check if source image exists
    if (!fs.existsSync(sourceImage)) {
      console.error(`❌ Source image not found: ${sourceImage}`);
      return;
    }
    
    // Generate large icons
    const sizes = [
      { name: 'notification-large-192x192', size: 192 },
      { name: 'notification-large-2x-384x384', size: 384 }
    ];
    
    for (const { name, size } of sizes) {
      const outputPath = path.join(publicDir, `${name}.png`);
      
      console.log(`📱 Generating ${name} (${size}x${size})...`);
      
      // Use logo.png directly without removing background
      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 1 } // Keep original background
        })
        .png({ 
          compressionLevel: 6,
          quality: 90
        })
        .toFile(outputPath);
      
      console.log(`✅ Generated: ${outputPath}`);
    }
    
    console.log('\n🎉 Large notification icons generated successfully!');
    console.log('✅ Using logo.png with original background for right side icons');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error);
  }
}

generateLargeIcons();