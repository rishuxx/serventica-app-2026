const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const buffer = fs.readFileSync(path.resolve(__dirname, '../data/Serventica_Service_Pricing_Data.xlsx'));

function extractEntry(name) {
  let pos = 0;
  while (pos < buffer.length - 4) {
    if (buffer.readUInt32LE(pos) === 0x04034b50) {
      const compMethod = buffer.readUInt16LE(pos + 8);
      const compSize = buffer.readUInt32LE(pos + 18);
      const uncompSize = buffer.readUInt32LE(pos + 22);
      const fileNameLen = buffer.readUInt16LE(pos + 26);
      const extraLen = buffer.readUInt16LE(pos + 28);
      const fileName = buffer.slice(pos + 30, pos + 30 + fileNameLen).toString('utf8');
      const dataStart = pos + 30 + fileNameLen + extraLen;
      if (fileName === name) {
        const compressedData = buffer.slice(dataStart, dataStart + compSize);
        if (compMethod === 8) {
          return zlib.inflateRawSync(compressedData).toString('utf8');
        } else if (compMethod === 0) {
          return compressedData.toString('utf8');
        }
      }
      pos = dataStart + compSize;
    } else {
      pos++;
    }
  }
  return null;
}

console.log('Workbook XML:', extractEntry('xl/workbook.xml'));
