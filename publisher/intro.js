// The first Postr News post: a brand introduction, not news, so nothing in it can be wrong.
// Usage: node publisher/intro.js <outDir>   → writes intro-feed.png (1080x1350)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const T = require('../poster-engine/src/tokens');

const C = T.color;
const wm = fs.readFileSync(path.join(__dirname, '..', 'poster-engine', 'assets', 'postr-wordmark-paper.svg')).toString('base64');

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="${T.fonts.googleCss}">
<style>
*{box-sizing:border-box;margin:0}
html,body{width:1080px;height:1350px}
body{background:${C.ink};color:${C.paper};font-family:${T.fonts.text};-webkit-font-smoothing:antialiased}
.p{width:1080px;height:1350px;padding:72px;display:flex;flex-direction:column}
.top{display:flex;justify-content:space-between;align-items:center}
.wm{width:260px;height:auto}
.tag{font-family:${T.fonts.display};font-weight:700;font-size:28px;letter-spacing:4px;padding:16px 28px;border-radius:999px;border:6px solid ${C.lime};color:${C.lime};line-height:1}
h1{font-family:${T.fonts.display};font-weight:900;font-size:150px;line-height:.95;letter-spacing:-5px;margin-top:140px}
h1 span{color:${C.lime}}
.sub{font-size:44px;font-weight:700;line-height:1.3;margin-top:56px;max-width:860px;color:${C.mutedOnInk}}
.chips{display:flex;flex-wrap:wrap;gap:14px;margin-top:14px}.chips:first-of-type{margin-top:auto}.lang .chip{background:transparent;border:3px solid #3A3A3F}
.chip{font-size:30px;font-weight:800;padding:14px 26px;border-radius:999px;background:#1C1C1F}
.deva{font-family:${T.fonts.deva}}
.foot{display:flex;justify-content:space-between;font-size:28px;font-weight:800;margin-top:40px;color:${C.mutedOnInk}}
</style></head><body><div class="p">
<div class="top"><img class="wm" src="data:image/svg+xml;base64,${wm}" alt="postr."><span class="tag">HELLO</span></div>
<h1>News,<br>designed<span>.</span></h1>
<p class="sub">Every story as one poster: what changed, what it means for you, and where it came from.</p>
<div class="chips"><span class="chip">Mumbai</span><span class="chip">Pune</span><span class="chip">Delhi NCR</span><span class="chip">Bengaluru</span></div>
<div class="chips lang"><span class="chip">English</span><span class="chip deva">हिंदी</span></div>
<div class="foot"><span>Every poster names its source</span><span>@postr.news</span></div>
</div></body></html>`;

const CAPTION = [
  'News, designed.',
  '',
  'Postr News turns each story into one poster: what changed, what it means for you, and where it came from. Every poster names its source, and corrections are shown, never hidden.',
  '',
  'Starting with Mumbai, Pune, Delhi NCR and Bengaluru, in English and हिंदी.',
  '',
  'Follow to get the day in posters.',
  '',
  '#PostrNews #NewsDesigned #Mumbai #Bengaluru #DelhiNCR',
].join('\n');

async function renderIntro(outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
    await page.setContent(html, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
    await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 8000))]));
    const file = path.join(outDir, 'intro-feed.png');
    await page.screenshot({ path: file });
    return file;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  renderIntro(process.argv[2] || 'out').then((f) => console.log(f));
}

module.exports = { renderIntro, CAPTION };
