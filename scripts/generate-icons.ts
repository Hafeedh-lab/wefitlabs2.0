/**
 * PWA Icon Generator for WeFit Labs
 * Generates all required icon sizes for PWA installation
 */

import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join } from 'path';

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUTPUT_DIR = join(process.cwd(), 'public', 'icons');

// WeFit Labs brand colors
const COLORS = {
  background: '#111214', // Dark background
  primary: '#FFC84A',    // Energy Yellow
  secondary: '#00C875',  // Success Green
};

/**
 * Generates an SVG icon for WeFit Labs
 * Features: Pickleball paddle with "W" monogram
 */
function generateSVG(size: number): string {
  const padding = size * 0.15; // 15% padding for maskable icons
  const iconSize = size - (padding * 2);
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = iconSize / 2.5;

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="${size}" height="${size}" fill="${COLORS.background}"/>

      <!-- Circle background for icon -->
      <circle
        cx="${centerX}"
        cy="${centerY}"
        r="${radius}"
        fill="${COLORS.primary}"
      />

      <!-- "W" letter -->
      <text
        x="${centerX}"
        y="${centerY}"
        font-family="Arial, sans-serif"
        font-size="${iconSize * 0.5}"
        font-weight="bold"
        fill="${COLORS.background}"
        text-anchor="middle"
        dominant-baseline="central"
      >W</text>

      <!-- Accent dot (like a pickleball) -->
      <circle
        cx="${centerX + radius * 0.6}"
        cy="${centerY - radius * 0.6}"
        r="${radius * 0.15}"
        fill="${COLORS.secondary}"
      />
    </svg>
  `.trim();
}

/**
 * Main function to generate all icon sizes
 */
async function generateIcons() {
  console.log('🎨 Generating WeFit Labs PWA icons...\n');

  // Create icons directory if it doesn't exist
  try {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✓ Created directory: ${OUTPUT_DIR}\n`);
  } catch (error) {
    console.log(`✓ Directory already exists: ${OUTPUT_DIR}\n`);
  }

  // Generate each icon size
  for (const size of ICON_SIZES) {
    try {
      const svg = generateSVG(size);
      const outputPath = join(OUTPUT_DIR, `icon-${size}x${size}.png`);

      await sharp(Buffer.from(svg))
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`✓ Generated: icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`✗ Failed to generate ${size}x${size}:`, error);
      throw error;
    }
  }

  console.log('\n🎉 All PWA icons generated successfully!');
  console.log(`📁 Location: ${OUTPUT_DIR}`);
  console.log('\n📱 Your PWA is now installable on all devices!');
}

// Run the generator
generateIcons().catch((error) => {
  console.error('❌ Icon generation failed:', error);
  process.exit(1);
});
