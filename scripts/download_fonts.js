const fs = require('fs');
const path = require('path');
const https = require('https');

const fonts = {
  'Lexend-Thin.ttf': 'https://raw.githubusercontent.com/googlefonts/lexend/main/fonts/lexend/ttf/Lexend-Thin.ttf',
  'Lexend-Light.ttf': 'https://raw.githubusercontent.com/googlefonts/lexend/main/fonts/lexend/ttf/Lexend-Light.ttf',
  'Lexend-Regular.ttf': 'https://raw.githubusercontent.com/googlefonts/lexend/main/fonts/lexend/ttf/Lexend-Regular.ttf',
  'Lexend-Medium.ttf': 'https://raw.githubusercontent.com/googlefonts/lexend/main/fonts/lexend/ttf/Lexend-Medium.ttf',
  'Lexend-SemiBold.ttf': 'https://raw.githubusercontent.com/googlefonts/lexend/main/fonts/lexend/ttf/Lexend-SemiBold.ttf',
  'Lexend-Bold.ttf': 'https://raw.githubusercontent.com/googlefonts/lexend/main/fonts/lexend/ttf/Lexend-Bold.ttf',
  'Lexend-ExtraBold.ttf': 'https://raw.githubusercontent.com/googlefonts/lexend/main/fonts/lexend/ttf/Lexend-ExtraBold.ttf',
  'Lexend-Black.ttf': 'https://raw.githubusercontent.com/googlefonts/lexend/main/fonts/lexend/ttf/Lexend-Black.ttf',
  // Also Deca variants in case
  'LexendDeca-Regular.ttf': 'https://raw.githubusercontent.com/googlefonts/lexend/main/fonts/deca/ttf/LexendDeca-Regular.ttf',
  'LexendDeca-Medium.ttf': 'https://raw.githubusercontent.com/googlefonts/lexend/main/fonts/deca/ttf/LexendDeca-Medium.ttf',
  'LexendDeca-SemiBold.ttf': 'https://raw.githubusercontent.com/googlefonts/lexend/main/fonts/deca/ttf/LexendDeca-SemiBold.ttf',
  'LexendDeca-Bold.ttf': 'https://raw.githubusercontent.com/googlefonts/lexend/main/fonts/deca/ttf/LexendDeca-Bold.ttf',
  'LexendDeca-ExtraBold.ttf': 'https://raw.githubusercontent.com/googlefonts/lexend/main/fonts/deca/ttf/LexendDeca-ExtraBold.ttf',
};

const dirs = [
  path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'fonts'),
  path.join(__dirname, '..', 'apps', 'customer', 'src', 'assets', 'fonts'),
  path.join(__dirname, '..', 'src', 'fonts'),
];

dirs.forEach(d => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
});

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed with status ${res.statusCode} for ${url}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', reject);
  });
}

async function run() {
  for (const [name, url] of Object.entries(fonts)) {
    const primaryDest = path.join(dirs[0], name);
    try {
      console.log(`Downloading ${name}...`);
      await downloadFile(url, primaryDest);
      console.log(`Saved ${name} (${fs.statSync(primaryDest).size} bytes)`);
      for (let i = 1; i < dirs.length; i++) {
        fs.copyFileSync(primaryDest, path.join(dirs[i], name));
      }
    } catch (e) {
      console.error(`Error downloading ${name}: ${e.message}`);
    }
  }
  console.log('Finished font weight operations.');
}

run().catch(console.error);
