import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createPng(width, height, getPixel) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = makeChunk('IHDR', ihdrData);

  const raw = Buffer.alloc(height * (1 + width * 4));
  let pos = 0;
  for (let y = 0; y < height; y++) {
    raw[pos++] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      raw[pos++] = r;
      raw[pos++] = g;
      raw[pos++] = b;
      raw[pos++] = a;
    }
  }
  const idat = makeChunk('IDAT', zlib.deflateSync(raw, { level: 9 }));
  const iend = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([signature, ihdr, idat, iend]);
}

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Create Brand SVG: public/icon.svg
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070A14"/>
      <stop offset="50%" stop-color="#0A1124"/>
      <stop offset="100%" stop-color="#04060B"/>
    </linearGradient>
    <linearGradient id="ringCyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>
    <linearGradient id="ringViolet" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#c084fc"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
    <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#818cf8" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#070A14" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Deep Sovereign Backdrop -->
  <rect width="512" height="512" rx="128" fill="url(#bgGrad)"/>
  <rect width="508" height="508" x="2" y="2" rx="126" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>

  <!-- Core Glow Ambient -->
  <circle cx="256" cy="256" r="160" fill="url(#coreGlow)"/>

  <!-- Orbital Cognitive Graph Rings -->
  <g filter="url(#glow)">
    <!-- Outer Orbital Ellipse -->
    <ellipse cx="256" cy="256" rx="150" ry="68" fill="none" stroke="url(#ringCyan)" stroke-width="6" transform="rotate(-30 256 256)" stroke-dasharray="14 8"/>
    
    <!-- Cross Orbital Ellipse -->
    <ellipse cx="256" cy="256" rx="150" ry="68" fill="none" stroke="url(#ringViolet)" stroke-width="6" transform="rotate(30 256 256)"/>
    
    <!-- Central Sovereign Nucleus -->
    <circle cx="256" cy="256" r="32" fill="#0A1124" stroke="#ffffff" stroke-width="4"/>
    <circle cx="256" cy="256" r="18" fill="#38bdf8"/>
    <circle cx="256" cy="256" r="8" fill="#ffffff"/>

    <!-- Orbital Graph Satellite Nodes -->
    <circle cx="150" cy="195" r="12" fill="#818cf8" stroke="#ffffff" stroke-width="2.5"/>
    <circle cx="362" cy="317" r="12" fill="#38bdf8" stroke="#ffffff" stroke-width="2.5"/>
    <circle cx="362" cy="195" r="10" fill="#c084fc" stroke="#ffffff" stroke-width="2"/>
    <circle cx="150" cy="317" r="10" fill="#34d399" stroke="#ffffff" stroke-width="2"/>
    <circle cx="256" cy="120" r="9" fill="#38bdf8" stroke="#ffffff" stroke-width="2"/>
    <circle cx="256" cy="392" r="9" fill="#818cf8" stroke="#ffffff" stroke-width="2"/>
  </g>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf-8');
console.log('Created public/icon.svg');

// Math helper for rendering Aura Sovereign Icon to PNG pixels
function auraPixel(x, y, w, h, isMaskable = false) {
  // Normalize coords to [-1, 1]
  const scaleFactor = isMaskable ? 0.72 : 0.88; // safe zone margin
  const nx = ((x / w) * 2 - 1) / scaleFactor;
  const ny = ((y / h) * 2 - 1) / scaleFactor;
  const dist = Math.hypot(nx, ny);

  // Background colors
  const bgGrad = 1 - (y / h) * 0.5;
  let r = Math.round(7 * bgGrad + 3 * (1 - dist * 0.3));
  let g = Math.round(10 * bgGrad + 7 * (1 - dist * 0.3));
  let b = Math.round(20 * bgGrad + 18 * (1 - dist * 0.3));
  let a = 255;

  // Clamping
  r = Math.max(4, Math.min(25, r));
  g = Math.max(6, Math.min(30, g));
  b = Math.max(11, Math.min(50, b));

  // Central glow
  if (dist < 0.9) {
    const glow = Math.max(0, 1 - dist / 0.9);
    r += Math.round(30 * glow);
    g += Math.round(90 * glow);
    b += Math.round(180 * glow);
  }

  // Ring 1: rotated -30 deg
  const angle1 = -30 * (Math.PI / 180);
  const cos1 = Math.cos(angle1);
  const sin1 = Math.sin(angle1);
  const rx1 = nx * cos1 - ny * sin1;
  const ry1 = nx * sin1 + ny * cos1;
  const ellipseDist1 = Math.hypot(rx1 / 0.65, ry1 / 0.3);
  if (Math.abs(ellipseDist1 - 1.0) < 0.05) {
    const d1 = 1 - Math.abs(ellipseDist1 - 1.0) / 0.05;
    r = Math.round(r * (1 - d1) + 56 * d1);
    g = Math.round(g * (1 - d1) + 189 * d1);
    b = Math.round(b * (1 - d1) + 248 * d1);
  }

  // Ring 2: rotated +30 deg
  const angle2 = 30 * (Math.PI / 180);
  const cos2 = Math.cos(angle2);
  const sin2 = Math.sin(angle2);
  const rx2 = nx * cos2 - ny * sin2;
  const ry2 = nx * sin2 + ny * cos2;
  const ellipseDist2 = Math.hypot(rx2 / 0.65, ry2 / 0.3);
  if (Math.abs(ellipseDist2 - 1.0) < 0.05) {
    const d2 = 1 - Math.abs(ellipseDist2 - 1.0) / 0.05;
    r = Math.round(r * (1 - d2) + 168 * d2);
    g = Math.round(g * (1 - d2) + 110 * d2);
    b = Math.round(b * (1 - d2) + 245 * d2);
  }

  // Satellite nodes
  const satellites = [
    { x: -0.42, y: -0.24, radius: 0.055, color: [129, 140, 248] },
    { x: 0.42, y: 0.24, radius: 0.055, color: [56, 189, 248] },
    { x: 0.42, y: -0.24, radius: 0.05, color: [192, 132, 252] },
    { x: -0.42, y: 0.24, radius: 0.05, color: [52, 211, 153] },
    { x: 0.0, y: -0.55, radius: 0.045, color: [56, 189, 248] },
    { x: 0.0, y: 0.55, radius: 0.045, color: [129, 140, 248] },
  ];

  for (const s of satellites) {
    const sDist = Math.hypot(nx - s.x, ny - s.y);
    if (sDist < s.radius) {
      const core = 1 - sDist / s.radius;
      if (sDist < s.radius * 0.45) {
        // white center
        return [255, 255, 255, 255];
      }
      return [
        Math.round(s.color[0] * core + 255 * (1 - core)),
        Math.round(s.color[1] * core + 255 * (1 - core)),
        Math.round(s.color[2] * core + 255 * (1 - core)),
        255
      ];
    }
  }

  // Central Core Node
  const coreDist = Math.hypot(nx, ny);
  if (coreDist < 0.14) {
    if (coreDist < 0.04) {
      return [255, 255, 255, 255]; // central white spark
    } else if (coreDist < 0.08) {
      return [56, 189, 248, 255]; // cyan inner glow
    } else if (coreDist < 0.12) {
      return [10, 17, 36, 255]; // dark halo ring
    } else {
      return [255, 255, 255, 255]; // outer hairline ring
    }
  }

  return [Math.min(255, r), Math.min(255, g), Math.min(255, b), a];
}

// Generate PNG icons
const iconsToGenerate = [
  { file: 'pwa-192x192.png', size: 192, maskable: false },
  { file: 'pwa-512x512.png', size: 512, maskable: false },
  { file: 'pwa-maskable-512x512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
  { file: 'favicon.ico', size: 64, maskable: false }, // modern browsers accept PNG favicons
];

for (const icon of iconsToGenerate) {
  const pngData = createPng(icon.size, icon.size, (x, y, w, h) =>
    auraPixel(x, y, w, h, icon.maskable)
  );
  fs.writeFileSync(path.join(publicDir, icon.file), pngData);
  console.log(`Generated public/${icon.file} (${pngData.length} bytes)`);
}
