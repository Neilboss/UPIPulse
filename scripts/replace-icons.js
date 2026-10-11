const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SRC = path.resolve('C:/Users/shett/.gemini/antigravity/brain/9f564019-da03-4366-9ff9-50cb818d407e/upipulse_app_icon_1791754229481.jpg');
const PROJECT = path.resolve('c:/Users/shett/Desktop/finace');

const targets = [
  // Android mipmap launcher icons
  { out: `${PROJECT}/android/app/src/main/res/mipmap-mdpi/ic_launcher.png`,         size: 48 },
  { out: `${PROJECT}/android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png`,   size: 48 },
  { out: `${PROJECT}/android/app/src/main/res/mipmap-hdpi/ic_launcher.png`,         size: 72 },
  { out: `${PROJECT}/android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png`,   size: 72 },
  { out: `${PROJECT}/android/app/src/main/res/mipmap-xhdpi/ic_launcher.png`,        size: 96 },
  { out: `${PROJECT}/android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png`,  size: 96 },
  { out: `${PROJECT}/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png`,       size: 144 },
  { out: `${PROJECT}/android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png`, size: 144 },
  { out: `${PROJECT}/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`,      size: 192 },
  { out: `${PROJECT}/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png`,size: 192 },
  // Android foreground layer (adaptive icon) — same image, slightly smaller canvas
  { out: `${PROJECT}/android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png`,    size: 48 },
  { out: `${PROJECT}/android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png`,    size: 72 },
  { out: `${PROJECT}/android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png`,   size: 96 },
  { out: `${PROJECT}/android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png`,  size: 144 },
  { out: `${PROJECT}/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png`, size: 192 },
  // Web / PWA public icons
  { out: `${PROJECT}/public/icon.png`,             size: 512 },
  { out: `${PROJECT}/public/icon-192.png`,         size: 192 },
  { out: `${PROJECT}/public/icon-512.png`,         size: 512 },
  { out: `${PROJECT}/public/apple-touch-icon.png`, size: 180 },
];

(async () => {
  for (const { out, size } of targets) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await sharp(SRC)
      .resize(size, size, { fit: 'cover', position: 'centre' })
      .png()
      .toFile(out);
    console.log(`✅ ${size}x${size} → ${path.relative(PROJECT, out)}`);
  }
  console.log('\n🎉 All icons replaced!');
})();
