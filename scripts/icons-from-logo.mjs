#!/usr/bin/env node
/**
 * Genera tutte le icone prodotto da logo-stillum.png mantenendo le proporzioni
 * (logo inscritto in canvas senza deformare). Usa padding trasparente per canvas quadrati.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Jimp } = require('jimp');
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const pngToIco = require('png-to-ico').default;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const LOGO = path.join(ROOT, 'logo-stillum.png');

/** Scala il logo per entrare in size×size mantenendo proporzioni, con padding trasparente. */
async function logoToSize(size) {
  const logo = await Jimp.read(LOGO);
  const w = logo.bitmap.width;
  const h = logo.bitmap.height;
  const scale = Math.min(size / w, size / h);
  const nw = Math.round(w * scale);
  const nh = Math.round(h * scale);
  const x = Math.round((size - nw) / 2);
  const y = Math.round((size - nh) / 2);

  logo.resize({ w: nw, h: nh });

  const canvas = new Jimp({ width: size, height: size, color: 0x00000000 });
  canvas.composite(logo, x, y);
  return canvas.getBuffer('image/png');
}

async function main() {
  if (!fs.existsSync(LOGO)) {
    console.error('File non trovato:', LOGO);
    process.exit(1);
  }

  const targets = [
    { path: 'resources/server/code-192.png', size: 192 },
    { path: 'resources/server/code-512.png', size: 512 },
    { path: 'resources/win32/code_70x70.png', size: 70 },
    { path: 'resources/win32/code_150x150.png', size: 150 },
    { path: 'resources/linux/code.png', size: 256 },
    { path: 'scripts/appimage/stillum.png', size: 256 },
    { path: 'scripts/appimage/void.png', size: 256 },
    // Icone pagina principale / watermark editor (proporzioni corrette)
    { path: 'src/vs/workbench/browser/parts/editor/media/void_cube_noshadow.png', size: 512 },
    { path: 'src/vs/workbench/browser/media/void-icon-sm.png', size: 64 },
  ];

  console.log('Generazione PNG con proporzioni corrette...');
  for (const { path: rel, size } of targets) {
    const outPath = path.join(ROOT, rel);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const buf = await logoToSize(size);
    fs.writeFileSync(outPath, buf);
    console.log('  ', rel);
  }

  // Favicon: 32x32
  const favicon32 = await logoToSize(32);
  const faviconPath = path.join(ROOT, 'resources/server/favicon.ico');
  const icoFavicon = await pngToIco(favicon32);
  fs.writeFileSync(faviconPath, icoFavicon);
  console.log('  resources/server/favicon.ico');

  // code.ico (Windows) con più risoluzioni
  const icoSizes = [16, 32, 48, 256];
  const icoBuffers = await Promise.all(icoSizes.map((s) => logoToSize(s)));
  const codeIco = await pngToIco(icoBuffers);
  fs.writeFileSync(path.join(ROOT, 'resources/win32/code.ico'), codeIco);
  console.log('  resources/win32/code.ico');

  // macOS .icns: creare iconset e chiamare iconutil (solo su darwin)
  if (process.platform === 'darwin') {
    const iconsetDir = path.join(ROOT, 'resources/darwin/code.iconset');
    fs.mkdirSync(iconsetDir, { recursive: true });
    const icnsSizes = [
      [16, 'icon_16x16.png'],
      [32, 'icon_16x16@2x.png'],
      [32, 'icon_32x32.png'],
      [64, 'icon_32x32@2x.png'],
      [128, 'icon_128x128.png'],
      [256, 'icon_128x128@2x.png'],
      [256, 'icon_256x256.png'],
      [512, 'icon_256x256@2x.png'],
      [512, 'icon_512x512.png'],
      [1024, 'icon_512x512@2x.png'],
    ];
    for (const [size, name] of icnsSizes) {
      const buf = await logoToSize(size);
      fs.writeFileSync(path.join(iconsetDir, name), buf);
    }
    const { execSync } = await import('child_process');
    const icnsOut = path.join(ROOT, 'resources/darwin/code.icns');
    execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsOut}"`, {
      stdio: 'inherit',
      cwd: ROOT,
    });
    fs.rmSync(iconsetDir, { recursive: true });
    console.log('  resources/darwin/code.icns');
  } else {
    console.log('  (salto code.icns: eseguire su macOS per generarlo)');
  }

  console.log('Icone generate con proporzioni corrette.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
