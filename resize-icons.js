const sharp = require('sharp');
const fs = require('fs');

async function resizeIcons() {
  const inputFile = 'public/icons/icon16.png';
  const sizes = [16, 48, 128];
  
  for (const size of sizes) {
    const outputFile = `public/icons/icon${size}.png`;
    await sharp(inputFile)
      .resize(size, size, { fit: 'cover', kernel: 'lanczos3' })
      .png()
      .toFile(outputFile);
    console.log(`Created: ${outputFile} (${size}x${size})`);
  }
  console.log('Done!');
}

resizeIcons().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
