// Builds the offline web app (PWA) into dist/ from the same page source the Claude artifact uses.
//   npm run build   ->  dist/ is a static site: push it to the gh-pages branch.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.dirname(new URL(import.meta.url).pathname);
const SRC = path.join(ROOT, 'src', 'kzuna.html');
const DIST = path.join(ROOT, 'dist');

const NAME = 'תרגול חוברת קצונה';
const SHORT = 'קצונה';
const DESC = 'תרגול חוברת ההכנה לקצונה (בה״ד 1): שיעורים, תרגול חכם, מבחנים ומפה אילמת. עובד גם בלי אינטרנט.';
const THEME = '#EDEFE6', THEME_DARK = '#121811', BG = '#EDEFE6';

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'fonts', 'files'), { recursive: true });
fs.mkdirSync(path.join(DIST, 'icons'), { recursive: true });

/* ---------- fonts: self-hosted woff2, only the subsets and weights the page uses ---------- */
const FONTS = [
  { pkg: 'karantina', weights: [400, 700], subsets: ['hebrew', 'latin'] },
  { pkg: 'ibm-plex-sans-hebrew', weights: [400, 500, 600, 700], subsets: ['hebrew', 'latin'] },
  { pkg: 'ibm-plex-mono', weights: [400, 500], subsets: ['latin'] },
];
let fontCss = '';
const fontFiles = [];
for (const f of FONTS) {
  const dir = path.dirname(require.resolve(`@fontsource/${f.pkg}/package.json`));
  for (const w of f.weights) {
    const css = fs.readFileSync(path.join(dir, `${w}.css`), 'utf8');
    for (const block of css.split('/* ').slice(1)) {
      const label = block.slice(0, block.indexOf(' */'));
      if (!f.subsets.some(s => label === `${f.pkg}-${s}-${w}-normal`)) continue;
      const file = `${label}.woff2`;
      fs.copyFileSync(path.join(dir, 'files', file), path.join(DIST, 'fonts', 'files', file));
      fontFiles.push(`fonts/files/${file}`);
      fontCss += '/* ' + block.replace(/src: [^;]+;/, `src: url(./files/${file}) format('woff2');`).trim() + '\n\n';
    }
  }
}
fs.writeFileSync(path.join(DIST, 'fonts', 'fonts.css'), fontCss);

/* ---------- icons (rendered by icons.mjs into src/icons) ---------- */
for (const f of fs.readdirSync(path.join(ROOT, 'src', 'icons'))) fs.copyFileSync(path.join(ROOT, 'src', 'icons', f), path.join(DIST, 'icons', f));

/* ---------- manifest ---------- */
fs.writeFileSync(path.join(DIST, 'manifest.webmanifest'), JSON.stringify({
  id: './', name: NAME, short_name: SHORT, description: DESC, lang: 'he', dir: 'rtl',
  start_url: './', scope: './', display: 'standalone',
  background_color: BG, theme_color: THEME,
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
  ],
}, null, 2));

/* ---------- page: same source, real <head>, local fonts, offline flag, service worker ---------- */
let src = fs.readFileSync(SRC, 'utf8');
const take = re => { const m = src.match(re); if (!m) throw new Error('build: missing ' + re); src = src.replace(m[0], ''); return m[0]; };
const title = take(/<title>[\s\S]*?<\/title>/);
const style = take(/<style>[\s\S]*?<\/style>/);
take(/<meta name="claude:viewport-fit-sides"[^>]*>\s*/);
src = src.replace(/<link rel="preconnect"[^>]*>\s*/g, '').replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\s*/, '');
if (/fonts\.googleapis|fonts\.gstatic|window\.claude\.(db|room|sample)\b/.test(src)) throw new Error('build: unexpected remote reference left in body');

const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${title}
<meta name="description" content="${DESC}">
<meta name="theme-color" content="${THEME}" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="${THEME_DARK}" media="(prefers-color-scheme: dark)">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="${SHORT}">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="stylesheet" href="fonts/fonts.css">
<style>
:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
body{margin:0;font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
img{max-width:100%}
[hidden]{display:none!important}
</style>
${style}
</head>
<body>
<script>window.KZUNA_PWA = true;</script>
${src.trim()}
<script>
(function(){
  if ('serviceWorker' in navigator){
    var hadController = !!navigator.serviceWorker.controller, reloading = false;
    // a new version took over: reload once so the page and its cache match
    navigator.serviceWorker.addEventListener('controllerchange', function(){
      if (!hadController || reloading) return;
      reloading = true; location.reload();
    });
    window.addEventListener('load', function(){ navigator.serviceWorker.register('sw.js').catch(function(){}); });
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function(){});
})();
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(DIST, 'index.html'), html);

/* ---------- service worker: precache everything, serve from cache first ---------- */
const assets = ['index.html', 'manifest.webmanifest', 'fonts/fonts.css', ...fontFiles,
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'];
const hash = crypto.createHash('sha256');
for (const a of assets) hash.update(fs.readFileSync(path.join(DIST, a)));
const VERSION = 'kzuna-' + hash.digest('hex').slice(0, 12);
fs.writeFileSync(path.join(DIST, 'sw.js'), `// ${VERSION} — generated by build.mjs
const VERSION = '${VERSION}';
const ASSETS = ${JSON.stringify(assets, null, 2)};

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('kzuna-') && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// cache first, so the app opens instantly with no reception; a new deploy changes VERSION and replaces the cache
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('index.html').then(hit => hit || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  })));
});
`);
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');

const size = assets.reduce((n, a) => n + fs.statSync(path.join(DIST, a)).size, 0);
console.log(`built ${VERSION}: ${assets.length} files, ${(size / 1024).toFixed(0)} KB precached`);
