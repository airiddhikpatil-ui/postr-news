// Hype Reels: 12-second, 120 bpm, seamlessly looping kinetic Reels (1080x1920, 30 fps).
// Fixed timeline so every cut lands on the beat of the pre-made soundtracks in assets/hype:
//   0–2 s   subject slams in, strip 1 counts up        2 s strip 2      3 s strip 3
//   4–5.8 s circle + scribble on the subject           5.5 s strips fly out
//   6–8 s   strobe: 4 words, one per beat              8–10 s check strip, scrolling tape, label
//   10 s    stamp                                      11.4–12 s everything exits → loops to frame 0
// Spec (story.hype): see publisher/reels/queue.json.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const A = path.join(__dirname, '..', 'assets');
const b64 = (f) => fs.readFileSync(f).toString('base64');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FONTS = 'https://fonts.googleapis.com/css2?family=Anton&family=Instrument+Serif:ital@0;1&family=Space+Mono:wght@400;700&family=Manrope:wght@600;800&display=block';

const PAL = {
  yellow: { bg: '#F2B705', s: [['#111', '#F2B705'], ['#E8432E', '#111'], ['#F4F1EA', '#111']], ring: '#E8432E', burst: 'rgba(232,67,46,.22)' },
  red: { bg: '#E8432E', s: [['#111', '#F4F1EA'], ['#F2B705', '#111'], ['#F4F1EA', '#111']], ring: '#111', burst: 'rgba(17,17,17,.16)' },
  mint: { bg: '#8FD6B4', s: [['#111', '#8FD6B4'], ['#F4F1EA', '#111'], ['#E8432E', '#111']], ring: '#E8432E', burst: 'rgba(17,17,17,.12)' },
  cream: { bg: '#EAE3D2', s: [['#111', '#EAE3D2'], ['#E8432E', '#F4F1EA'], ['#F2B705', '#111']], ring: '#E8432E', burst: 'rgba(232,67,46,.18)' },
  violet: { bg: '#B9A6E8', s: [['#111', '#B9A6E8'], ['#F4F1EA', '#111'], ['#E8432E', '#111']], ring: '#E8432E', burst: 'rgba(17,17,17,.14)' },
  blue: { bg: '#4D7CFE', s: [['#111', '#F4F1EA'], ['#F2B705', '#111'], ['#F4F1EA', '#111']], ring: '#F2B705', burst: 'rgba(17,17,17,.16)' },
};

function html(h) {
  const P = PAL[h.palette] || PAL.yellow;
  const who = { h: 1150, right: -120, top: 720, ...(h.who || {}) };
  const c = h.circle; // {x,y,w,h} on the 1080x1920 canvas, optional
  const sc = h.scribble || {}; // {text,x,y}
  const strobeBg = ['#111', P.s[1][0], '#F4F1EA', '#111'];
  const strobeFg = [P.bg === '#111' ? '#F2B705' : P.bg, P.s[1][1], '#111', '#F4F1EA'];
  const wm = b64(path.join(A, 'postr-wordmark-ink.svg'));
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>
*{margin:0;box-sizing:border-box}html,body{width:1080px;height:1920px;overflow:hidden;background:${P.bg};font-family:Manrope}
#cam{position:absolute;inset:0;transform-origin:50% 55%}
#tex{position:absolute;left:-60px;top:-60px;width:1200px;height:2040px;mix-blend-mode:multiply;opacity:.3}
#grain{position:absolute;left:-120px;top:-120px;width:1320px;height:2160px;mix-blend-mode:multiply;opacity:.16;pointer-events:none}
.kick{position:absolute;top:230px;left:70px;right:70px;display:flex;justify-content:space-between;align-items:center;font:700 26px 'Space Mono';letter-spacing:3px;color:#111;z-index:20;text-transform:uppercase}
.kick img{width:170px}.dot{display:inline-block;width:16px;height:16px;border-radius:50%;background:#E8432E;margin-right:14px;vertical-align:middle}
#burst{position:absolute;left:540px;top:1250px;width:2400px;height:2400px;margin:-1200px 0 0 -1200px;border-radius:50%;background:repeating-conic-gradient(${P.burst} 0 9deg,transparent 9deg 18deg);-webkit-mask:radial-gradient(circle,#000 30%,transparent 70%)}
#who{position:absolute;right:${who.right}px;top:${who.top}px;height:${who.h}px;filter:grayscale(1) contrast(1.15) brightness(1.03) drop-shadow(9px 0 0 #fff) drop-shadow(-9px 0 0 #fff) drop-shadow(0 9px 0 #fff) drop-shadow(0 -9px 0 #fff) drop-shadow(18px 28px 30px rgba(0,0,0,.35));transform-origin:60% 100%}
.strip{position:absolute;padding:10px 34px 4px;font:400 150px/1 Anton;letter-spacing:-1px;text-transform:uppercase;white-space:nowrap;transform-origin:left center}
#s1{left:50px;top:400px;background:${P.s[0][0]};color:${P.s[0][1]}}
#s2{left:70px;top:590px;background:${P.s[1][0]};color:${P.s[1][1]};font-size:132px}
#s3{left:60px;top:760px;background:${P.s[2][0]};color:${P.s[2][1]};font-size:96px}
#circle{position:absolute;left:${c ? c.x : 0}px;top:${c ? c.y : 0}px;width:${c ? c.w : 10}px;height:${c ? c.h : 10}px;overflow:visible}
#scr{position:absolute;left:${sc.x || 250}px;top:${sc.y || 1120}px;font:italic 400 120px/1 'Instrument Serif';color:#111;transform-origin:center;white-space:nowrap}
#flash{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:15;opacity:0}
#fw{font:400 250px/0.9 Anton;text-transform:uppercase;text-align:center;letter-spacing:-3px;padding:0 40px}
#c1{left:50px;top:560px;background:${P.s[0][0]};color:${P.s[0][1]};font-size:120px}
#tape{position:absolute;left:-100px;width:1400px;top:760px;height:170px;background:#F4F1EA;transform:rotate(-3deg);overflow:hidden;box-shadow:0 14px 30px rgba(0,0,0,.25)}
#tapein{position:absolute;top:22px;white-space:nowrap;font:400 120px/1 Anton;color:#111;letter-spacing:2px}
#lab{position:absolute;left:70px;top:960px;font:700 30px 'Space Mono';letter-spacing:3px;background:#111;color:${P.bg};padding:12px 20px;text-transform:uppercase}
#stamp{position:absolute;left:110px;top:1080px;width:760px;border:12px solid ${P.ring};color:${P.ring};font:400 104px/0.95 Anton;text-align:center;padding:26px 20px;text-transform:uppercase;background:rgba(244,241,234,.94);z-index:16}
.src{position:absolute;left:70px;bottom:330px;width:800px;font:700 22px/1.5 'Space Mono';letter-spacing:2px;color:#111;z-index:20;text-transform:uppercase}
</style></head><body>
<div id="cam">
<img id="tex" src="data:image/jpeg;base64,${b64(path.join(A, 'hype', 'crumple.jpg'))}">
<div id="burst"></div>
<img id="who" src="${h.plate ? `data:image/png;base64,${b64(path.join(A, 'plates', `${h.plate}-alpha.png`))}` : 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='}">
<div id="s1" class="strip torn"></div>
<div id="s2" class="strip torn">${esc(h.s2)}</div>
<div id="s3" class="strip torn">${esc(h.s3)}</div>
<svg id="circle" viewBox="0 0 600 460" preserveAspectRatio="none"><path id="cpath" d="M300 30 C 470 25, 585 120, 570 240 C 555 370, 420 440, 280 430 C 130 420, 25 330, 35 210 C 45 95, 170 30, 330 40" fill="none" stroke="${P.ring}" stroke-width="14" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>
<div id="scr">${esc(sc.text || '')}</div>
<div id="c1" class="strip torn">${esc(h.check)}</div>
<div id="tape"><div id="tapein">${esc(`${h.tape}  ★  `).repeat(8)}</div></div>
<div id="lab">${esc(h.label || '')}</div>
<div id="stamp">${esc(h.stamp)}</div>
</div>
<div id="flash"><div id="fw"></div></div>
<div class="kick"><span><span class="dot"></span>POSTR FILES · ${esc(h.kicker)}</span><img id="wm" src="data:image/svg+xml;base64,${wm}"></div>
<div class="src">SOURCE · ${esc(h.source)}${h.ai ? '<br>IMAGE · AI ILLUSTRATION' : ''}</div>
<img id="grain" src="data:image/png;base64,${b64(path.join(A, 'hype', 'grain.png'))}">
<script>
(()=>{
document.querySelectorAll('.torn').forEach((el,k)=>{const p=[];const n=40;let s=11+k*7;const r=()=>{s=(s*9301+49297)%233280;return s/233280};
for(let i=0;i<=n;i++)p.push((i/n*100).toFixed(2)+'% '+(r()*6).toFixed(2)+'%');
for(let i=n;i>=0;i--)p.push((i/n*100).toFixed(2)+'% '+(100-r()*6).toFixed(2)+'%');
el.style.clipPath='polygon('+p.join(',')+')';});
const H=${JSON.stringify({ count: h.count || null, s1: h.s1 || '', strobe: h.strobe, hasCircle: !!c, hasScr: !!sc.text, strobeBg, strobeFg, label: !!h.label })};
const $=(id)=>document.getElementById(id);
const clamp=(x)=>Math.max(0,Math.min(1,x)), p=(t,a,b)=>clamp((t-a)/(b-a));
const oCubic=(x)=>1-Math.pow(1-x,3), iCubic=(x)=>x*x*x, oBack=(x)=>{const c=1.9;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
const B=0.5, impacts=[0.15,2.0,3.0,6.0,6.5,7.0,7.5,8.0,10.0];
const plen=$('cpath').getTotalLength();$('cpath').style.strokeDasharray=plen;
// shrink strips that are too wide
const fit=(el,max)=>{let f=parseFloat(getComputedStyle(el).fontSize);while(el.getBoundingClientRect().width>max&&f>40){f-=2;el.style.fontSize=f+'px';}};
const fmt=(v)=>{const c=H.count;const n=c.decimals?v.toFixed(c.decimals):Math.round(v).toLocaleString('en-IN');return (c.prefix||'')+n+(c.suffix||'');};
$('s1').textContent=H.count?fmt(H.count.to):H.s1;
window.__init=()=>{$('s1').textContent=H.count?fmt(H.count.to):H.s1; fit($('s1'),900); fit($('s2'),940); fit($('s3'),920); fit($('c1'),920); fit($('stamp'),760);};
window.__frame=(t)=>{
  const ph=(t%B)/B; let sc=1+0.022*Math.exp(-ph*9), sx=0, sy=0, rot=0;
  for(const a of impacts){const d=t-a; if(d>=0&&d<0.25){const k=1-d/0.25; sx+=Math.sin(d*90)*14*k; sy+=Math.cos(d*77)*10*k; rot+=Math.sin(d*60)*0.6*k; sc+=0.04*k;}}
  $('cam').style.transform='translate('+sx+'px,'+sy+'px) rotate('+rot+'deg) scale('+sc+')';
  $('tex').style.transform='translate('+Math.sin(t*0.9)*25+'px,'+Math.cos(t*0.7)*25+'px)';
  const f=Math.floor(t*30); $('grain').style.transform='translate('+((f*37)%120-60)+'px,'+((f*53)%120-60)+'px)';
  const ex=oCubic(p(t,11.4,11.85));
  let wy=1300*(1-oBack(p(t,0.05,0.65))), wo=1;
  if(t>=5.8&&t<8){wy=0;wo=1-p(t,5.8,6.0);} if(t>=8){wy=1300*(1-oBack(p(t,8.0,8.45)));wo=1;}
  wy+=1400*ex;
  $('who').style.transform='translateY('+wy+'px) scale('+(1+0.012*Math.sin(t*Math.PI))+') rotate('+Math.sin(t*1.3)*0.8+'deg)'; $('who').style.opacity=wo;
  $('burst').style.transform='rotate('+(t*24)+'deg) scale('+((1+0.05*Math.exp(-ph*6))*(1-ex))+')';
  $('burst').style.opacity=(t>=5.8&&t<8.2)?0:oCubic(p(t,0,0.6));
  if(H.count) $('s1').textContent=fmt(H.count.to*oCubic(p(t,0.3,1.9)));
  const jit=(H.count&&t>0.3&&t<1.9)?Math.sin(t*120)*3:0;
  $('s1').style.transform='translate('+(-1300*(1-oBack(p(t,0.1,0.45))))+'px,'+(-900*iCubic(p(t,5.5,5.9))+jit)+'px) rotate(-4deg)';
  $('s2').style.transform='translate('+(1300*(1-oBack(p(t,2.0,2.3))))+'px,'+(-1000*iCubic(p(t,5.55,5.95)))+'px) rotate(-4deg) scale('+(1+0.25*(1-p(t,2.0,2.2)))+')';
  $('s3').style.transform='translate('+(-1300*(1-oBack(p(t,3.0,3.3))))+'px,'+(-1100*iCubic(p(t,5.6,6.0)))+'px) rotate(-4deg)';
  $('cpath').style.strokeDashoffset=plen*(1-oCubic(p(t,4.0,4.7))); $('circle').style.opacity=(H.hasCircle&&t>=4&&t<5.8)?1:0;
  $('scr').style.opacity=(H.hasScr&&t>=4.7&&t<5.8)?1:0; $('scr').style.transform='scale('+oBack(p(t,4.7,5.0))+') rotate('+(-8+Math.sin(t*6)*3)+'deg)';
  if(t>=6&&t<8){const i=Math.min(3,Math.floor((t-6)/B)); const lp=((t-6)%B)/B; const w=H.strobe[i]||'';
    $('flash').style.opacity=1; $('flash').style.background=H.strobeBg[i]; $('fw').style.color=H.strobeFg[i]; $('fw').textContent=w;
    $('fw').style.fontSize=(w.length>9?170:w.length>6?210:250)+'px';
    $('fw').style.transform='scale('+(1.35-0.35*oCubic(clamp(lp*2.2)))+') rotate('+[-3,2,-2,3][i]+'deg)';
  } else $('flash').style.opacity=0;
  $('c1').style.opacity=t>=8?1:0; $('c1').style.transform='translate('+(-1300*(1-oBack(p(t,8.0,8.3))))+'px,'+(-1000*ex)+'px) rotate(-4deg)';
  $('tape').style.opacity=t>=8.5?1:0; $('tape').style.transform='translateX('+(1400*(1-oCubic(p(t,8.5,8.8))))+'px) translateY('+(-1000*ex)+'px) rotate(-3deg)';
  $('tapein').style.transform='translateX('+(-((Math.max(0,t-8.5))*420)%700)+'px)';
  $('lab').style.opacity=(H.label&&t>=9)?1:0; $('lab').style.transform='translateY('+(-1500*ex)+'px) scale('+oBack(p(t,9.0,9.25))+')';
  const st=p(t,10.0,10.18); $('stamp').style.opacity=t>=10?1:0;
  $('stamp').style.transform='translateY('+(1200*ex)+'px) rotate('+(-10+4*(1-st))+'deg) scale('+(2.2-1.2*oCubic(st))+')';
  const dark=(t>=6&&t<8)?['#F2B705','#111','#111','#F4F1EA'][Math.min(3,Math.floor((t-6)/B))]:'#111';
  document.querySelector('.kick').style.color=dark; document.querySelector('.src').style.color=dark;
  $('wm').style.filter=dark==='#111'?'none':'invert(1)';
};
window.__frame(0);
})();
</script></body></html>`;
}

async function renderHype(reel, outDir, { fps = 30, seconds = 12 } = {}) {
  const h = reel.hype;
  fs.mkdirSync(outDir, { recursive: true });
  const work = fs.mkdtempSync(path.join(outDir, `${reel.id}-frames-`));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    await page.setContent(html(h), { waitUntil: 'load', timeout: 30000 }).catch(() => {});
    await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 8000))]));
    await page.evaluate(() => { window.__init(); window.__frame(0); });
    for (let i = 0; i < fps * seconds; i++) {
      await page.evaluate((t) => window.__frame(t), i / fps);
      await page.screenshot({ path: path.join(work, `${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 });
    }
  } finally {
    await browser.close();
  }
  const file = path.join(outDir, `${reel.id}.mp4`);
  const beat = path.join(A, 'hype', `beat${h.beat || 1}.wav`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(work, '%04d.jpg'), '-i', beat,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', file]);
  fs.rmSync(work, { recursive: true, force: true });
  return { file };
}

module.exports = { renderHype, hypeHtml: html };
