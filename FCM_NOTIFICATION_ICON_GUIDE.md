# FCM Notification Icon Guide

## Icon Requirements for FCM Notifications

### 📱 Notification Icon Types

1. **Large Icon** (Right side of notification)
   - Size: 192x192px (1x) and 384x384px (2x)
   - Format: PNG with transparency
   - Purpose: Main visual representation of your app

2. **Small Icon** (Status bar)
   - Size: 24x24px (1x) and 48x48px (2x)
   - Format: PNG with transparency
   - Purpose: Status bar display

3. **Badge Icon** (Small corner icon)
   - Size: 72x72px (1x) and 144x144px (2x)
   - Format: PNG with transparency
   - Purpose: Small indicator icon

## 🎨 Design Guidelines

### Do's:
- ✅ Use simple, recognizable designs
- ✅ Ensure good contrast (light on dark or dark on light)
- ✅ Use transparent backgrounds
- ✅ Test at small sizes
- ✅ Use your brand colors
- ✅ Keep it clean and minimal

### Don'ts:
- ❌ Don't use complex details
- ❌ Don't use photos or gradients
- ❌ Don't use text (it won't be readable)
- ❌ Don't use full-color logos
- ❌ Don't use icons that blend with status bar

## 📐 Format Specifications

### Large Icon (192x192px)
```json
{
  "size": "192x192px",
  "format": "PNG",
  "colors": "Maximum 3 colors",
  "transparency": "Required",
  "purpose": "Main notification icon"
}
```

### Small Icon (24x24px)
```json
{
  "size": "24x24px", 
  "format": "PNG",
  "colors": "Monochrome or 2 colors max",
  "transparency": "Required",
  "purpose": "Status bar icon"
}
```

### Badge Icon (72x72px)
```json
{
  "size": "72x72px",
  "format": "PNG", 
  "colors": "Monochrome preferred",
  "transparency": "Required",
  "purpose": "Notification badge"
}
```

## 🛠️ Creation Process

### Option 1: Use Your Existing Logo
1. Start with your high-resolution logo (512x512px or larger)
2. Simplify the design for notification use
3. Create a monochrome version for small icons
4. Generate all required sizes

### Option 2: Create Custom Notification Icons
1. Use design tools like Figma, Adobe Illustrator, or Canva
2. Design with small sizes in mind
3. Export as PNG with transparency
4. Generate all required sizes

## 🚀 Quick Setup

### Step 1: Install Sharp for Image Processing
```bash
cd /home/z/my-project
npm install sharp
```

### Step 2: Generate Icons from Your Logo
```bash
# Using your existing logo
node scripts/generate-notification-icons.js ./public/logo.png

# Or create a custom notification icon first, then:
node scripts/generate-notification-icons.js ./my-notification-icon.png
```

### Step 3: Update Cloud Function
The cloud function is already updated to use:
- `notification-large-192x192.png` for main icon
- `badge-72x72.png` for badge icon

### Step 4: Deploy Changes
```bash
cd /home/z/my-project/functions
npm run build
firebase deploy --only functions
```

## 📋 Testing Checklist

- [ ] Icons display correctly on Android
- [ ] Icons display correctly on iOS
- [ ] Small icon is visible in status bar
- [ ] Large icon is clear and recognizable
- [ ] Badge icon shows properly
- [ ] Icons look good on both light and dark themes
- [ ] Icons don't appear pixelated on high-density screens

## 🔧 Troubleshooting

### Icons appear pixelated:
- Ensure source image is high resolution (512x512px+)
- Use vector graphics when possible
- Avoid resizing up from smaller images

### Icons not showing:
- Check file paths in cloud function
- Ensure images are accessible via URL
- Verify PNG format with transparency

### Icons hard to see:
- Improve contrast
- Simplify design
- Test on different background colors

## 📱 Platform-Specific Notes

### Android
- Large icon: Right side of notification
- Small icon: Status bar (must be monochrome)
- Color: Uses your brand color

### iOS
- Large icon: Main notification area
- Small icon: Not used (iOS uses app icon)
- Badge: Small red circle with count

## 🎯 Best Practices

1. **Test on Real Devices**: Emulators don't always show notifications correctly
2. **Multiple Sizes**: Generate all required sizes for best quality
3. **Brand Consistency**: Use your brand colors and style
4. **Simplicity**: Less is more for notification icons
5. **Accessibility**: Ensure good contrast for visibility

---

**Need help?** Check your current icons in `/public/` directory or create new ones using the provided script!