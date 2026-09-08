const fs = require('fs');
const zlib = require('zlib');

function getTrueRGB() {
  const buffer = fs.readFileSync('apps/customer/src/assets/images/serventica-hero-gardener.png');
  let offset = 8;
  let width = 0, height = 0, colorType = 0;
  let idatChunks = [];
  
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    if (type === 'IHDR') {
      width = buffer.readUInt32BE(offset + 8);
      height = buffer.readUInt32BE(offset + 12);
      colorType = buffer.readUInt8(offset + 17);
    } else if (type === 'IDAT') {
      idatChunks.push(buffer.slice(offset + 8, offset + 8 + length));
    } else if (type === 'IEND') break;
    offset += 12 + length;
  }
  
  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const bpp = colorType === 6 ? 4 : 3;
  const stride = 1 + width * bpp;
  
  // Reconstruct un-filtered scanlines
  const uncompressed = Buffer.alloc(width * height * bpp);
  let prevRow = null;
  
  for (let y = 0; y < height; y++) {
    const filter = raw[y * stride];
    const row = Buffer.alloc(width * bpp);
    for (let i = 0; i < width * bpp; i++) {
      const rawByte = raw[y * stride + 1 + i];
      const left = (i >= bpp) ? row[i - bpp] : 0;
      const up = prevRow ? prevRow[i] : 0;
      const upLeft = (prevRow && i >= bpp) ? prevRow[i - bpp] : 0;
      
      let val = 0;
      if (filter === 0) val = rawByte;
      else if (filter === 1) val = (rawByte + left) & 0xFF;
      else if (filter === 2) val = (rawByte + up) & 0xFF;
      else if (filter === 3) val = (rawByte + Math.floor((left + up) / 2)) & 0xFF;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        const pr = (pa <= pb && pa <= pc) ? left : (pb <= pc ? up : upLeft);
        val = (rawByte + pr) & 0xFF;
      }
      row[i] = val;
    }
    row.copy(uncompressed, y * width * bpp);
    prevRow = row;
  }
  
  console.log('Successfully decoded true PNG pixels!');
  
  // Analyze dominant green / garden palette
  const buckets = {};
  for (let y = 0; y < Math.floor(height * 0.45); y += 8) {
    for (let x = 0; x < width; x += 8) {
      const idx = (y * width + x) * bpp;
      const r = uncompressed[idx];
      const g = uncompressed[idx + 1];
      const b = uncompressed[idx + 2];
      
      // Filter out pure black / pure white
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < 25 || lum > 225) continue;
      
      const qr = Math.min(255, Math.floor(r / 16) * 16);
      const qg = Math.min(255, Math.floor(g / 16) * 16);
      const qb = Math.min(255, Math.floor(b / 16) * 16);
      
      const key = `${qr},${qg},${qb}`;
      buckets[key] = (buckets[key] || 0) + 1;
    }
  }
  
  const top = Object.entries(buckets).sort((a, b) => b[1] - a[1]).slice(0, 15);
  console.log('Top true color clusters:');
  top.forEach(([k, cnt]) => {
    const [r, g, b] = k.split(',').map(Number);
    const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    console.log(`  ${hex} (RGB ${r},${g},${b}) : ${cnt}`);
  });
}

getTrueRGB();
