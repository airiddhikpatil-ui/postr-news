// Motion covers: turns a Postr Lab cover into a short looping video (1080x1350, 30 fps).
// The poster floats in 3D over a moving background, gets a light sweep, and its big number counts up.
// Frames are driven by window.__frame(t) so every render is identical (no real-time timing).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const { labPages } = require('./lab');

const MOTION = `<style>

#stage{position:fixed;inset:0;overflow:hidden;background:#0b0b0d}
#bg{position:absolute;inset:-20%;background:
 radial-gradient(40% 40% at 20% 30%, rgba(255,90,31,.55), transparent 70%),
 radial-gradient(35% 35% at 80% 70%, rgba(43,75,255,.55), transparent 70%),
 radial-gradient(30% 30% at 60% 20%, rgba(212,255,58,.35), transparent 70%);filter:blur(30px)}
#grid{position:absolute;left:-50%;right:-50%;bottom:-10%;height:70%;transform:perspective(600px) rotateX(70deg);
 background-image:linear-gradient(rgba(255,255,255,.18) 2px,transparent 2px),linear-gradient(90deg,rgba(255,255,255,.18) 2px,transparent 2px);background-size:80px 80px}
#card{position:absolute;inset:0;transform-style:preserve-3d}
#card>.pg{box-shadow:0 60px 120px rgba(0,0,0,.6);border-radius:18px;overflow:hidden}
#sweep{position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.35) 50%,transparent 60%);mix-blend-mode:overlay;border-radius:18px}
</style>
<script>
(() => {
  const body = document.body, pg = document.querySelector('.pg');
  const cs = getComputedStyle(body);
  pg.style.backgroundColor = cs.backgroundColor; pg.style.backgroundImage = cs.backgroundImage; pg.style.backgroundSize = cs.backgroundSize; pg.style.color = cs.color;
  const stage = document.createElement('div'); stage.id = 'stage';
  stage.innerHTML = '<div id="bg"></div><div id="grid"></div><div id="card"></div>';
  body.appendChild(stage);
  const card = stage.querySelector('#card'); card.appendChild(pg);
  const sweep = document.createElement('div'); sweep.id = 'sweep'; pg.appendChild(sweep);
  // Count-up on the big number: animate the first number in the .big element, keep its formatting.
  const big = pg.querySelector('.big');
  const original = big ? big.textContent : '';
  const m = original.match(/[0-9][0-9,]*(\\.[0-9]+)?/);
  const parsed = m ? parseFloat(m[0].replace(/,/g, '')) : null;
  const target = parsed !== null && parsed >= 10 ? parsed : null;
  const decimals = m && m[1] ? m[1].length - 1 : 0;
  const indian = m && /,[0-9]{2},/.test(m[0]);
  const fmt = (v) => indian ? v.toLocaleString('en-IN', { maximumFractionDigits: decimals, minimumFractionDigits: decimals }) : (m[0].includes(',') ? v.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals }) : v.toFixed(decimals));
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  window.__frame = (t, dur) => {
    const p = t / dur, w = 2 * Math.PI * p;
    card.style.transform = 'perspective(1800px) translateZ(0) scale(' + (0.86 + 0.015 * Math.sin(w)) + ') rotateY(' + (7 * Math.sin(w)) + 'deg) rotateX(' + (4 * Math.cos(w)) + 'deg)';
    document.getElementById('bg').style.transform = 'translate(' + (40 * Math.sin(w)) + 'px,' + (30 * Math.cos(w)) + 'px) rotate(' + (8 * Math.sin(w)) + 'deg)';
    document.getElementById('grid').style.backgroundPosition = '0 ' + (p * 320) + 'px';
    sweep.style.transform = 'translateX(' + (-120 + 240 * ((p * 1.6) % 1)) + '%)';
    if (big && target !== null) {
      const k = Math.min(1, t / Math.min(1.6, dur * 0.35));
      big.textContent = k >= 1 ? original : original.replace(m[0], fmt(target * ease(k)));
    }
  };
})();
</script>`;

async function renderMotionCover(story, style, outDir, { seconds = 6, fps = 30, scale = 1 } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const work = path.resolve(fs.mkdtempSync(path.join(outDir, `${story.id}-motion-`)));
  const html = labPages(story, style)[0].replace('</body>', `${MOTION}</body>`);
  const browser = await chromium.launch();
  const n = Math.round(seconds * fps);
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: scale });
    await page.setContent(html, { waitUntil: 'load', timeout: 20000 }).catch(() => {});
    await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 8000))]));
    await page.evaluate(() => window.__fit && window.__fit());
    for (let i = 0; i < n; i++) {
      await page.evaluate(([t, d]) => window.__frame(t, d), [i / fps, seconds]);
      await page.screenshot({ path: path.join(work, `f${String(i).padStart(4, '0')}.png`) });
    }
  } finally {
    await browser.close();
  }
  const file = path.join(outDir, `${story.id}-motion.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(work, 'f%04d.png'),
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100', '-shortest',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', file]);
  fs.rmSync(work, { recursive: true, force: true });
  return file;
}

module.exports = { renderMotionCover };
