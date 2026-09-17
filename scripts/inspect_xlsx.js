const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Node 18+ has crypto and buffer support. We can use unzipper or inspect zip structures
// Or read with yauzl / standard zip central directory
const buffer = fs.readFileSync(path.resolve(__dirname, '../data/Serventica_Service_Pricing_Data.xlsx'));

console.log('XLSX file size:', buffer.length);
// Find central directory in ZIP
let pos = 0;
const entries = [];
while (pos < buffer.length - 4) {
  if (buffer.readUInt32LE(pos) === 0x04034b50) { // Local file header signature
    const fileNameLen = buffer.readUInt16LE(pos + 26);
    const extraLen = buffer.readUInt16LE(pos + 28);
    const fileName = buffer.slice(pos + 30, pos + 30 + fileNameLen).toString('utf8');
    entries.push(fileName);
    pos += 30 + fileNameLen + extraLen;
  } else {
    pos++;
  }
}
console.log('Zip entries found:', entries);
