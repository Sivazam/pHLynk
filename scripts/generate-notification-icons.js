#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// FCM Notification Icon Requirements
const NOTIFICATION_SIZES = {
  // Main notification icon (large icon on right)
  'notification-large': { size: 192, format: 'png', purpose: 'notification_large' },
  'notification-large-2x': { size: 384, format: 'png', purpose: 'notification_large_2x' },
  
  // Small notification icon (status bar)
  'notification-small': { size: 24, format: 'png', purpose: 'notification_small' },
  'notification-small-2x': { size: 48, format: 'png', purpose: 'notification_small_2x' },
  
  // Badge icon (small corner icon)
  'badge': { size: 72, format: 'png', purpose: 'badge' },
  'badge-2x': { size: 144, format: 'png', purpose: 'badge_2x' }
};

async function generateNotificationIcons(sourceImagePath) {
  const publicDir = path.join(__dirname, '..', 'public');
  
  console.log('🎨 Generating FCM notification icons...');
  
  try {
    // Check if source image exists
    if (!fs.existsSync(sourceImagePath)) {
      console.error(`❌ Source image not found: ${sourceImagePath}`);
      console.log('💡 Please provide a high-quality source image (at least 512x512px)');
      return;
    }
    
    // Generate each size
    for (const [name, config] of Object.entries(NOTIFICATION_SIZES)) {
      const outputPath = path.join(publicDir, `${name}-${config.size}x${config.size}.${config.format}`);
      
      console.log(`📱 Generating ${config.purpose} (${config.size}x${config.size})...`);
      
      // For notification icons, we need to ensure they're properly sized and have transparency
      if (config.purpose.includes('small') || config.purpose.includes('badge')) {
        // Small icons should be simple and recognizable
        await sharp(sourceImagePath)
          .resize(config.size, config.size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png({ 
            compressionLevel: 9,
            palette: true
          })
          .toFile(outputPath);
      } else {
        // Large icons can be more detailed
        await sharp(sourceImagePath)
          .resize(config.size, config.size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png({ 
            compressionLevel: 6,
            quality: 90
          })
          .toFile(outputPath);
      }
      
      console.log(`✅ Generated: ${outputPath}`);
    }
    
    console.log('\n🎉 All notification icons generated successfully!');
    console.log('\n📋 Icon Usage Guide:');
    console.log('├── notification-large-192x192.png → Main FCM notification icon');
    console.log('├── notification-large-384x384.png → High-res main icon');
    console.log('├── notification-small-24x24.png → Status bar icon');
    console.log('├── notification-small-48x48.png → High-res status bar icon');
    console.log('├── badge-72x72.png → Notification badge');
    console.log('└── badge-144x144.png → High-res badge');
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Update your FCM cloud function to use the new icons');
    console.log('2. Test notifications on different devices');
    console.log('3. Ensure icons are clear and recognizable at small sizes');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error);
  }
}

// Check if source image is provided
const sourceImage = process.argv[2];
if (!sourceImage) {
  console.log('🎨 FCM Notification Icon Generator');
  console.log('Usage: node generate-notification-icons.js <path-to-source-image>');
  console.log('');
  console.log('Requirements for source image:');
  console.log('✅ High quality (at least 512x512px)');
  console.log('✅ PNG format with transparency');
  console.log('✅ Simple, recognizable design');
  console.log('✅ Good contrast for visibility');
  console.log('');
  console.log('Example: node generate-notification-icons.js ./logo.png');
  process.exit(1);
}

generateNotificationIcons(sourceImage);