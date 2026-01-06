const sharp = require('sharp');
const fs = require('fs');

async function resizeIcons() {
  const inputFile = 'public/icons/icon128.png';  // 使用 128 作为源文件
  const sizes = [16, 48, 128];

  for (const size of sizes) {
    const tempFile = `public/icons/icon${size}_new.png`;
    const finalFile = `public/icons/icon${size}.png`;

    await sharp(inputFile)
      .resize(size, size, { fit: 'cover', kernel: 'lanczos3' })
      .png()
      .toFile(tempFile);

    // 替换原文件
    fs.renameSync(tempFile, finalFile);
    console.log(`Created: ${finalFile} (${size}x${size})`);
  }
  console.log('Done!');
}

resizeIcons().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
