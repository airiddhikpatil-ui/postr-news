// Profile picture (1080x1080, safe inside Instagram's circle crop) and Facebook cover (1640x624).
// Usage: node publisher/brand-assets.js <outDir>
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const T = require('../poster-engine/src/tokens');

const C = T.color;
const { B, wordmarkB64 } = require('../poster-engine/src/brand');
const wm = wordmarkB64('paper');
const initial = B.name.trim().charAt(0).toUpperCase() || 'N';
const head = `<meta charset="utf-8"><link rel="stylesheet" href="${T.fonts.googleCss}"><style>*{margin:0;box-sizing:border-box}body{background:${C.ink};color:${C.paper};font-family:${T.fonts.text};-webkit-font-smoothing:antialiased}</style>`;

// Your initial in a circle-safe square for the profile picture.
const profile = `<!doctype html><html><head>${head}</head><body style="width:1080px;height:1080px;display:grid;place-items:center">
<svg width="1080" height="1080" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="${C.ink}"/>
<text x="540" y="560" text-anchor="middle" dominant-baseline="middle" font-family="${T.fonts.display}" font-weight="900" font-size="560" fill="${C.paper}">${initial}</text><circle cx="800" cy="760" r="56" fill="${C.lime}"/></svg></body></html>`;

// Facebook crops cover sides on phones, so key content stays in the centre 1200px.
const cover = `<!doctype html><html><head>${head}<style>
.c{width:1640px;height:624px;display:flex;align-items:center;justify-content:center;gap:72px;padding:0 220px}
.wm{width:360px}
h1{font-family:${T.fonts.display};font-weight:900;font-size:96px;line-height:.95;letter-spacing:-3px}
h1 span{color:${C.lime}}
p{font-size:30px;font-weight:700;color:${C.mutedOnInk};margin-top:20px}
</style></head><body><div class="c"><img class="wm" src="data:image/svg+xml;base64,${wm}"><div><h1>${B.tagline}</h1><p>@${B.handle}</p></div></div></body></html>`;

async function render(outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const shots = [['profile-picture.png', profile, 1080, 1080], ['facebook-cover.png', cover, 1640, 624]];
  try {
    for (const [name, html, w, h] of shots) {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await page.setContent(html, { waitUntil: 'load', timeout: 15000 }).catch(() => {});
      await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 6000))]));
      await page.screenshot({ path: path.join(outDir, name) });
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

if (require.main === module) render(process.argv[2] || 'out').then(() => console.log('done'));
module.exports = { render };
