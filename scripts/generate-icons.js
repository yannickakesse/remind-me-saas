const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const iconsDir = path.join(__dirname, "..", "public", "icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Crisp SVG Vector Definition of the Remind Me brand icon
const svgBuffer = Buffer.from(`
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop stop-color="#1E1E24" />
      <stop offset="1" stop-color="#0B0F17" />
    </linearGradient>
    <linearGradient id="goldGlow" x1="102" y1="102" x2="410" y2="410" gradientUnits="userSpaceOnUse">
      <stop stop-color="#F59E0B" />
      <stop offset="1" stop-color="#D97706" />
    </linearGradient>
    <linearGradient id="amberGlow" x1="307" y1="307" x2="460" y2="460" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FCD34D" />
      <stop offset="1" stop-color="#E5A91E" />
    </linearGradient>
    <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#000000" flood-opacity="0.5" />
    </filter>
  </defs>

  <!-- Background Squircle with dark navy styling -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />

  <!-- Connecting orbital arcs -->
  <path
    d="M 164 230 A 143 143 0 0 1 215 143"
    stroke="#F59E0B"
    stroke-width="26"
    stroke-linecap="round"
    opacity="0.9"
  />
  <path
    d="M 348 184 A 143 143 0 0 1 389 287"
    stroke="#FCD34D"
    stroke-width="26"
    stroke-linecap="round"
    opacity="0.85"
  />
  <path
    d="M 338 358 A 143 143 0 0 1 184 348"
    stroke="#D97706"
    stroke-width="26"
    stroke-linecap="round"
    opacity="0.95"
  />

  <!-- Center black metallic core sphere -->
  <circle cx="256" cy="256" r="51" fill="#0B0F19" stroke="#334155" stroke-width="8" />
  <circle cx="241" cy="241" r="18" fill="#E5A91E" opacity="0.8" />

  <!-- Top Node: Activity/Calendar Sphere -->
  <circle cx="256" cy="123" r="56" fill="url(#goldGlow)" filter="url(#nodeShadow)" />
  <circle cx="241" cy="108" r="18" fill="#FEF3C7" opacity="0.9" />

  <!-- Bottom-Left Node: Semicircle Finance/Income -->
  <path
    d="M 118 328 A 61 61 0 0 1 230 328 Z"
    fill="url(#goldGlow)"
    filter="url(#nodeShadow)"
  />

  <!-- Bottom-Right Node: Rounded Square Tasks/Organization -->
  <rect
    x="317"
    y="276"
    width="102"
    height="102"
    rx="31"
    fill="url(#amberGlow)"
    filter="url(#nodeShadow)"
  />
</svg>
`);

// SVG for Maskable and Badge icons
const badgeSvg = Buffer.from(`
<svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="36" cy="36" r="32" fill="#0B0F17" />
  <circle cx="36" cy="20" r="8" fill="#F59E0B" />
  <path d="M 20 48 A 10 10 0 0 1 36 48 Z" fill="#F59E0B" />
  <rect x="42" y="38" width="14" height="14" rx="4" fill="#FCD34D" />
</svg>
`);

async function generate() {
  console.log("Generating Remind Me PWA and Apple Touch icons...");

  // 1. Apple Touch Icon (180x180) for iPhone Home Screen
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(iconsDir, "apple-touch-icon.png"));
  console.log("✓ apple-touch-icon.png (180x180)");

  // Also root apple-touch-icon for Safari direct lookup
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(__dirname, "..", "public", "apple-touch-icon.png"));
  console.log("✓ /public/apple-touch-icon.png (180x180)");

  // 2. Standard PWA Icon (192x192)
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, "icon-192x192.png"));
  console.log("✓ icon-192x192.png (192x192)");

  // 3. High-res PWA Icon (512x512)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, "icon-512x512.png"));
  console.log("✓ icon-512x512.png (512x512)");

  // 4. Maskable PWA Icon (512x512 with safe padding)
  await sharp(svgBuffer)
    .resize(410, 410)
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: { r: 11, g: 15, b: 23, alpha: 1 },
    })
    .png()
    .toFile(path.join(iconsDir, "icon-maskable-512x512.png"));
  console.log("✓ icon-maskable-512x512.png (512x512)");

  // 5. Push Badge Icon (72x72)
  await sharp(badgeSvg)
    .resize(72, 72)
    .png()
    .toFile(path.join(iconsDir, "badge-72x72.png"));
  console.log("✓ badge-72x72.png (72x72)");

  // 6. Favicon (32x32)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(iconsDir, "favicon-32x32.png"));
  console.log("✓ favicon-32x32.png (32x32)");

  console.log("All icons generated successfully!");
}

generate().catch(console.error);
