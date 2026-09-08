const fs = require('fs');

// Simple PNG decoder for RGBA pixel analysis
function parsePNG(filePath) {
  const zlib = require('zlib');
  const buffer = fs.readFileSync(filePath);
  
  // Verify PNG signature
  if (buffer.readUInt32BE(0) !== 0x89504E47) {
    throw new Error('Not a PNG');
  }
  
  let offset = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  let idatChunks = [];
  
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    if (type === 'IHDR') {
      width = buffer.readUInt32BE(offset + 8);
      height = buffer.readUInt32BE(offset + 12);
      bitDepth = buffer.readUInt8(offset + 16);
      colorType = buffer.readUInt8(offset + 17);
    } else if (type === 'IDAT') {
      idatChunks.push(buffer.slice(offset + 8, offset + 8 + length));
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }
  
  console.log(`PNG Info: ${width}x${height}, bitDepth: ${bitDepth}, colorType: ${colorType}`);
  
  const idatBuffer = Buffer.concat(idatChunks);
  const decompressed = zlib.inflateSync(idatBuffer);
  
  // For 8-bit RGBA (colorType 6) or RGB (colorType 2)
  const bytesPerPixel = colorType === 6 ? 4 : colorType === 2 ? 3 : 4;
  const scanlineLength = 1 + width * bytesPerPixel;
  
  // Sample pixels, focusing on upper & middle portions to determine dominant background theme
  const samples = [];
  
  for (let y = 0; y < Math.floor(height * 0.4); y += 15) {
    const rowOffset = y * scanlineLength;
    const filterType = decompressed[rowOffset];
    // approximate sample from scanline directly
    for (let x = 0; x < width; x += 15) {
      const pOffset = rowOffset + 1 + x * bytesPerPixel;
      if (pOffset + 2 < decompressed.length) {
        const r = decompressed[pOffset];
        const g = decompressed[pOffset + 1];
        const b = decompressed[pOffset + 2];
        samples.push({ r, g, b });
      }
    }
  }
  
  return { width, height, samples };
}

try {
  const { samples } = parsePNG('apps/customer/src/assets/images/serventica-hero-gardener.png');
  console.log(`Extracted ${samples.length} samples.`);
  
  // Cluster colors
  const buckets = {};
  for (const s of samples) {
    // Filter out near-white and near-black noise
    const brightness = (s.r * 299 + s.g * 587 + s.b * 114) / 1000;
    if (brightness < 30 || brightness > 230) continue;
    
    // Quantize into buckets
    const qr = Math.round(s.r / 20) * 20;
    const qg = Math.round(s.g / 20) * 20;
    const qb = Math.round(s.b / 20) * 20;
    const key = `${qr},${qg},${qb}`;
    buckets[key] = (buckets[key] || 0) + 1;
  }
  
  const sorted = Object.entries(buckets).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log('Top color clusters (RGB):');
  sorted.forEach(([k, count]) => {
    const [r, g, b] = k.split(',').map(Number);
    const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    console.log(`  ${hex} (RGB ${k}) : count ${count}`);
  });
} catch(e) {
  console.error('Error analyzing:', e.message);
}
