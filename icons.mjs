// Renders the app icons from src/icon.svg into src/icons/ (run after changing the icon; needs Playwright).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(ROOT, 'src', 'icons');
fs.mkdirSync(OUT, { recursive: true });
const svg = fs.readFileSync(path.join(ROOT, 'src', 'icon.svg'), 'utf8');
// rounded for browser tabs and "any" icons; full-bleed square for maskable and Apple (the OS crops those)
const rounded = svg
  .replace('<rect id="bg"', '<defs><clipPath id="r"><rect width="512" height="512" rx="112"/></clipPath></defs><g clip-path="url(#r)"><rect id="bg"')
  .replace('</svg>', '</g></svg>');
fs.writeFileSync(path.join(OUT, 'icon.svg'), rounded);
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
async function png(markup, size, out) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${markup.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: path.join(OUT, out), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}
await png(rounded, 192, 'icon-192.png');
await png(rounded, 512, 'icon-512.png');
await png(svg, 512, 'maskable-512.png');
await png(svg, 180, 'apple-touch-icon.png');
await browser.close();
console.log('icons written to src/icons');
