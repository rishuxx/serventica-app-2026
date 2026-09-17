const fs = require('fs');
const path = require('path');
const https = require('https');

const xlsxUrl = 'https://docs.google.com/spreadsheets/d/1MrrJc4r36WvGcdeiXhzlAwzrnXJCiIOYeHOgKyxXXeY/export?format=xlsx';
const outputDir = path.resolve(__dirname, '../data');
const outputFile = path.join(outputDir, 'Serventica_Service_Pricing_Data.xlsx');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        console.log(`Redirecting to: ${response.headers.location}`);
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        return reject(new Error(`Failed with HTTP status ${response.statusCode}`));
      }

      const fileStream = fs.createWriteStream(dest);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Saved XLSX to ${dest}`);
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    }).on('error', reject);
  });
}

download(xlsxUrl, outputFile)
  .then(() => {
    const stats = fs.statSync(outputFile);
    console.log(`Download complete! Size: ${(stats.size / 1024).toFixed(2)} KB`);
  })
  .catch((err) => {
    console.error('Error downloading XLSX:', err);
    process.exit(1);
  });
