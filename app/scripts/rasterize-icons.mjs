// One-off dev utility: regenerate public/apple-touch-icon.png and
// public/icon-{192,512}.png from scripts/icon-source.svg. Requires
// `npm i -D playwright` locally (not a project dependency) and a Chromium
// binary — run `npx playwright install chromium` first if you don't have
// one already. Usage: `node scripts/rasterize-icons.mjs`.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('./icon-source.svg', import.meta.url), 'utf8');
const sizes = [180, 192, 512];

const browser = await chromium.launch();

for (const size of sizes) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`
    <html><body style="margin:0;padding:0;width:${size}px;height:${size}px;">
      <div style="width:${size}px;height:${size}px;">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div>
    </body></html>
  `);
  const target = size === 180 ? '../public/apple-touch-icon.png' : `../public/icon-${size}.png`;
  await page.screenshot({ path: new URL(target, import.meta.url).pathname });
  await page.close();
  console.log('wrote', target, size, 'x', size);
}

await browser.close();
