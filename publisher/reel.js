// AI Reels: each scene is a full-bleed brand frame (1080x1920), animated with a slow push-in,
// joined into a 9:16 MP4 with a silent audio track. No face, no voice, no third-party music.
// reel = { id, lang, scenes: [{ text, sub?, ground: 'signal'|'lime'|'blue'|'ink'|'paper'|'pink'|'myth', seconds, stamp? }] }
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const T = require('../poster-engine/src/tokens');

const C = T.color;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const onGround = (g) => (['ink', 'blue', 'myth'].includes(g) ? C.paper : C.ink);
const wm = (tone) => fs.readFileSync(path.join(__dirname, '..', 'poster-engine', 'assets', `postr-wordmark-${tone}.svg`)).toString('base64');

function sceneHtml(reel, scene, i, total) {
  const ground = C[scene.ground] || C.ink;
  const text = onGround(scene.ground);
  const tone = text === C.ink ? 'ink' : 'paper';
  const deva = reel.lang === 'hi' || reel.lang === 'mr';
  const size = scene.size || (scene.text.length > 60 ? 96 : scene.text.length > 30 ? 120 : 150);
  const progress = Array.from({ length: total }, (_, k) => `<div style="flex:1;height:10px;border-radius:5px;background:${text};opacity:${k <= i ? 0.9 : 0.25}"></div>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${T.fonts.googleCss}">
<style>*{margin:0;box-sizing:border-box}html,body{width:1080px;height:1920px}
body{background:${ground};color:${text};font-family:${deva ? T.fonts.deva : T.fonts.text};-webkit-font-smoothing:antialiased}
.p{width:1080px;height:1920px;padding:250px 80px 340px;display:flex;flex-direction:column;position:relative;overflow:hidden}
.bar{position:absolute;top:150px;left:80px;right:80px;display:flex;gap:12px}
h1{font-family:${deva ? T.fonts.deva : T.fonts.display};font-weight:${deva ? 800 : 900};font-size:${size}px;line-height:${deva ? 1.15 : 1.0};letter-spacing:${deva ? 0 : -4}px;margin-top:auto}
.sub{font-size:52px;font-weight:700;line-height:1.3;margin-top:48px;opacity:.9}
.stamp{align-self:flex-start;font-family:${T.fonts.display};font-weight:900;font-size:40px;letter-spacing:4px;padding:16px 28px;border-radius:16px;background:${C.signal};color:${C.ink};margin-bottom:40px}
.foot{margin-top:auto;display:flex;justify-content:space-between;align-items:center;font-size:36px;font-weight:800}
.foot img{width:200px}
.num{position:absolute;right:-40px;bottom:260px;font-family:${T.fonts.display};font-weight:900;font-size:640px;line-height:.8;opacity:.07}
</style></head><body><div class="p">
<div class="bar">${progress}</div>
<div class="num">${String(i + 1).padStart(2, '0')}</div>
${scene.stamp ? `<span class="stamp">${esc(scene.stamp)}</span>` : ''}
<h1>${esc(scene.text)}</h1>
${scene.sub ? `<p class="sub">${esc(scene.sub)}</p>` : ''}
<div class="foot"><span>${esc(reel.sourceShort || '')}</span><img src="data:image/svg+xml;base64,${wm(tone)}"></div>
</div></body></html>`;
}

async function renderReel(reel, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const work = path.resolve(fs.mkdtempSync(path.join(outDir, `${reel.id}-`)));
  const browser = await chromium.launch();
  const frames = [];
  try {
    for (let i = 0; i < reel.scenes.length; i++) {
      const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
      await page.setContent(sceneHtml(reel, reel.scenes[i], i, reel.scenes.length), { waitUntil: 'load', timeout: 15000 }).catch(() => {});
      await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 6000))]));
      const f = path.join(work, `s${i}.png`);
      await page.screenshot({ path: f });
      await page.close();
      frames.push(f);
    }
  } finally {
    await browser.close();
  }
  // One clip per scene with a gentle 4% push-in, then concatenate.
  const fps = 30;
  const clips = frames.map((f, i) => {
    const secs = reel.scenes[i].seconds || 3;
    const n = Math.round(secs * fps);
    const out = path.join(work, `c${i}.mp4`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-i', f, '-vf',
      `scale=2160:3840,zoompan=z='min(1+0.04*on/${n},1.04)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${n}:s=1080x1920:fps=${fps},format=yuv420p`,
      '-frames:v', String(n), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', out]);
    return out;
  });
  const list = path.join(work, 'list.txt');
  fs.writeFileSync(list, clips.map((c) => `file '${c}'`).join('\n'));
  const file = path.join(outDir, `${reel.id}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list,
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-shortest', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', file]);
  return { file, frames };
}

module.exports = { renderReel, sceneHtml };
