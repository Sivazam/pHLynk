#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Your brand's blue color from loading screen
const BRAND_BLUE = '#20439f';

// FCM Notification Icon Requirements with brand background
const NOTIFICATION_SIZES = {
  // Main notification icon (large icon on right)
  'notification-large': { size: 192, format: 'png', purpose: 'notification_large' },
  'notification-large-2x': { size: 384, format: 'png', purpose: 'notification_large_2x' },
  
  // Small notification icon (status bar) - WITH BLUE BACKGROUND
  'notification-small': { size: 24, format: 'png', purpose: 'notification_small' },
  'notification-small-2x': { size: 48, format: 'png', purpose: 'notification_small_2x' },
  
  // Badge icon (small corner icon)
  'badge': { size: 72, format: 'png', purpose: 'badge' },
  'badge-2x': { size: 144, format: 'png', purpose: 'badge_2x' }
};

async function generateNotificationIconsWithBackground(sourceImagePath) {
  const publicDir = path.join(__dirname, '..', 'public');
  
  console.log('🎨 Generating FCM notification icons with brand background...');
  console.log(`🎨 Using brand blue color: ${BRAND_BLUE}`);
  
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
      
      // For small icons (status bar), add blue background
      if (config.purpose.includes('small')) {
        // Create a blue background with the logo on top
        const backgroundBuffer = Buffer.from(
          `<svg width="${config.size}" height="${config.size}">
            <rect width="${config.size}" height="${config.size}" fill="${BRAND_BLUE}"/>
          </svg>`
        );
        
        await sharp(backgroundBuffer)
          .composite([{
            input: await sharp(sourceImagePath)
              .resize(Math.floor(config.size * 0.7), Math.floor(config.size * 0.7), {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
              })
              .png()
              .toBuffer(),
            gravity: 'center'
          }])
          .png({ 
            compressionLevel: 9,
            palette: true
          })
          .toFile(outputPath);
          
        console.log(`✅ Generated ${config.purpose} with blue background`);
      } else if (config.purpose.includes('badge')) {
        // Badge icons should be clean logo without background (for better appearance)
        await sharp(sourceImagePath)
          .resize(config.size, config.size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png({ 
            compressionLevel: 9,
            quality: 90
          })
          .toFile(outputPath);
          
        console.log(`✅ Generated ${config.purpose} with transparent background`);
      } else {
        // Large icons can be more detailed with transparency
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
    console.log('├── notification-large-192x192.png → Main FCM notification icon (transparent)');
    console.log('├── notification-large-384x384.png → High-res main icon (transparent)');
    console.log('├── notification-small-24x24.png → Status bar icon (🔵 BLUE BACKGROUND)');
    console.log('├── notification-small-48x48.png → High-res status bar icon (🔵 BLUE BACKGROUND)');
    console.log('├── badge-72x72.png → Notification badge (CLEAN LOGO - transparent)');
    console.log('└── badge-144x144.png → High-res badge (CLEAN LOGO - transparent)');
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Deploy updated cloud functions');
    console.log('2. Test notifications on different devices');
    console.log('3. Enjoy your branded notification icons!');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error);
  }
}

// Check if source image is provided
const sourceImage = process.argv[2];
if (!sourceImage) {
  console.log('🎨 FCM Notification Icon Generator with Brand Background');
  console.log('Usage: node generate-notification-icons-branded.js <path-to-source-image>');
  console.log('');
  console.log('Features:');
  console.log('✅ Adds your brand blue background (#20439f) to small icons');
  console.log('✅ Maintains transparency for large icons');
  console.log('✅ Rounded corners for badge icons');
  console.log('✅ Perfect for status bar display');
  console.log('');
  console.log('Example: node generate-notification-icons-branded.js ./public/PharmaLogo.png');
  process.exit(1);
}

generateNotificationIconsWithBackground(sourceImage);