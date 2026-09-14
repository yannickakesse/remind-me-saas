const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const iconsDir = path.join(__dirname, "..", "public", "icons");
const publicDir = path.join(__dirname, "..", "public");

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. Full-bleed SVG for Apple Touch Icon (Solid 100% background, no transparent rounded corners so iOS masks it perfectly)
const appleSvgBuffer = Buffer.from(`
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop stop-color="#181D27" />
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
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.6" />
    </filter>
  </defs>

  <!-- Solid full-bleed dark navy background for Apple iOS square requirements -->
  <rect width="512" height="512" fill="url(#bgGrad)" />

  <!-- Subtle glow backdrop -->
  <circle cx="256" cy="256" r="180" fill="#F59E0B" opacity="0.08" filter="url(#nodeShadow)" />

  <!-- Connecting orbital arcs -->
  <path
    d="M 164 230 A 143 143 0 0 1 215 143"
    stroke="#F59E0B"
    stroke-width="28"
    stroke-linecap="round"
    opacity="0.95"
  />
  <path
    d="M 348 184 A 143 143 0 0 1 389 287"
    stroke="#FCD34D"
    stroke-width="28"
    stroke-linecap="round"
    opacity="0.9"
  />
  <path
    d="M 338 358 A 143 143 0 0 1 184 348"
    stroke="#D97706"
    stroke-width="28"
    stroke-linecap="round"
    opacity="0.98"
  />

  <!-- Center metallic core sphere -->
  <circle cx="256" cy="256" r="54" fill="#0B0F19" stroke="#475569" stroke-width="8" filter="url(#nodeShadow)" />
  <circle cx="240" cy="240" r="18" fill="#E5A91E" opacity="0.85" />

  <!-- Top Node: Activity/Calendar Sphere -->
  <circle cx="256" cy="120" r="58" fill="url(#goldGlow)" filter="url(#nodeShadow)" />
  <circle cx="240" cy="104" r="18" fill="#FEF3C7" opacity="0.9" />

  <!-- Bottom-Left Node: Semicircle Finance/Income -->
  <path
    d="M 116 332 A 64 64 0 0 1 234 332 Z"
    fill="url(#goldGlow)"
    filter="url(#nodeShadow)"
  />

  <!-- Bottom-Right Node: Rounded Square Tasks/Organization -->
  <rect
    x="315"
    y="272"
    width="106"
    height="106"
    rx="32"
    fill="url(#amberGlow)"
    filter="url(#nodeShadow)"
  />
</svg>
`);

// 2. SVG for Standard PWA icons (with squircle)
const pwaSvgBuffer = appleSvgBuffer;

const badgeSvg = Buffer.from(`
<svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="36" cy="36" r="32" fill="#0B0F17" />
  <circle cx="36" cy="20" r="8" fill="#F59E0B" />
  <path d="M 20 48 A 10 10 0 0 1 36 48 Z" fill="#F59E0B" />
  <rect x="42" y="38" width="14" height="14" rx="4" fill="#FCD34D" />
</svg>
`);

async function generateAll() {
  console.log("Generating Apple Touch Icons & PWA Icons...");

  // Apple Touch Icon variants (Solid background, no transparent margins)
  await sharp(appleSvgBuffer).resize(180, 180).png({ quality: 100 }).toFile(path.join(publicDir, "apple-touch-icon.png"));
  await sharp(appleSvgBuffer).resize(180, 180).png({ quality: 100 }).toFile(path.join(publicDir, "apple-touch-icon-precomposed.png"));
  await sharp(appleSvgBuffer).resize(180, 180).png({ quality: 100 }).toFile(path.join(iconsDir, "apple-touch-icon.png"));
  await sharp(appleSvgBuffer).resize(180, 180).png({ quality: 100 }).toFile(path.join(iconsDir, "apple-touch-icon-180x180.png"));
  await sharp(appleSvgBuffer).resize(152, 152).png({ quality: 100 }).toFile(path.join(iconsDir, "apple-touch-icon-152x152.png"));
  await sharp(appleSvgBuffer).resize(120, 120).png({ quality: 100 }).toFile(path.join(iconsDir, "apple-touch-icon-120x120.png"));

  console.log("✓ Generated all Apple Touch Icon formats (180x180, 152x152, 120x120, precomposed)");

  // Standard PWA Icons
  await sharp(pwaSvgBuffer).resize(192, 192).png().toFile(path.join(iconsDir, "icon-192x192.png"));
  await sharp(pwaSvgBuffer).resize(512, 512).png().toFile(path.join(iconsDir, "icon-512x512.png"));
  await sharp(pwaSvgBuffer).resize(512, 512).png().toFile(path.join(iconsDir, "icon-maskable-512x512.png"));
  await sharp(badgeSvg).resize(72, 72).png().toFile(path.join(iconsDir, "badge-72x72.png"));
  await sharp(appleSvgBuffer).resize(32, 32).png().toFile(path.join(iconsDir, "favicon-32x32.png"));
  await sharp(appleSvgBuffer).resize(32, 32).png().toFile(path.join(publicDir, "favicon.ico"));

  console.log("✓ Generated all PWA and Favicon assets!");
}

generateAll().catch(console.error);
