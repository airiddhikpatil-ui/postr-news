// Postr Lab: art-directed house styles for carousels. Each style has its own cover and matching inside pages.
// The style is picked per story (story.style overrides), and never repeats the previous post's style.
// Facts come only from the story; styles change the look, never the content.
const fs = require('fs');
const path = require('path');

const FONTS = 'https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Instrument+Serif:ital@0;1&family=Space+Mono:wght@400;700&family=Unbounded:wght@700;900&family=Manrope:wght@500;600;700;800&display=block';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wm = (tone) => `data:image/svg+xml;base64,${fs.readFileSync(path.join(__dirname, '..', 'assets', `postr-wordmark-${tone}.svg`)).toString('base64')}`;
const NOISE = `<svg class="noise" width="1080" height="1350"><filter id="nz"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0"/></filter><rect width="100%" height="100%" filter="url(#nz)"/></svg>`;

// Fit script: shrink any [data-fit] box until its text fits both ways.
const FIT = `<script>window.__fit=()=>{
const tall=(el)=>{const r=document.createRange();r.selectNodeContents(el);const tops=[];[...r.getClientRects()].forEach(x=>{if(x.width>1&&!tops.some(t=>Math.abs(t-x.top)<4))tops.push(x.top)});const cs=getComputedStyle(el);const lh=parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.2;return tops.length*lh;};
const wide=(el)=>{const r=document.createRange();r.selectNodeContents(el);const a=r.getBoundingClientRect(),b=el.getBoundingClientRect();const t=parseFloat(getComputedStyle(el).fontSize)*0.06;return a.right>b.right+t||a.left<b.left-t;};
const over=(el)=>el.scrollWidth>el.clientWidth+1||wide(el)||tall(el)>el.clientHeight+2;
let bad=0;document.querySelectorAll('[data-fit]').forEach(el=>{let px=parseFloat(getComputedStyle(el).fontSize);const min=+(el.dataset.min||22);let g=0;while(over(el)&&px>min&&g++<400){px-=2;el.style.fontSize=px+'px';}if(over(el))bad++;});return bad;}</script>`;

// What the cover shows, derived from the story's format.
function coverData(s) {
  const d = { big: '', sub: '', hook: s.coverHook || s.captionHeadline || s.headline || '', meta: s.place || s.date || '', source: s.source, old: null };
  switch (s.format) {
    case 'number': d.big = s.value + (s.unit || ''); d.sub = s.caption; break;
    case 'impact': d.big = s.figure; d.sub = `${s.headline}${s.unit ? ` · ${s.unit}` : ''}`; break;
    case 'tracker': d.big = s.now.value; d.old = s.then.value; d.sub = `${s.then.label}: ${s.then.value} → ${s.now.label}: ${s.now.value}`; break;
    case 'alert': d.big = s.headline; d.sub = s.note || ''; d.meta = `${s.place || ''}${s.time ? ` · ${s.time}` : ''}`; break;
    case 'myth': d.big = s.verdict; d.sub = s.evidence; d.claim = s.claim; break;
    default: d.big = s.headline; d.sub = s.note || '';
  }
  if (s.coverBig) { d.big = s.coverBig; if (s.format === 'number') d.sub = `${s.value}${s.unit || ''} ${s.caption}`; }
  if (s.coverOld) d.old = s.coverOld;
  d.facts = factsOf(s);
  d.stats = d.facts.filter(([, v]) => v);
  return d;
}

// Up to 4 short fact rows for receipts, tickers and indexes.
function factsOf(s) {
  for (const sl of s.slides || []) if (sl.stats && sl.stats.length) return sl.stats.slice(0, 4).map((x) => [x.label, x.value]);
  for (const sl of s.slides || []) if (sl.points && sl.points.length) return sl.points.slice(0, 3).map((p) => [p, '']);
  return [];
}

const pageShell = (cls, css, body) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>
*{margin:0;box-sizing:border-box}html,body{width:1080px;height:1350px}body{overflow:hidden;position:relative;-webkit-font-smoothing:antialiased;font-family:Manrope,sans-serif}
.noise{position:absolute;inset:0;pointer-events:none;mix-blend-mode:multiply;opacity:.32}
.pg{position:absolute;inset:0;overflow:hidden}
${css}</style></head><body class="${cls}"><div class="pg">${body}</div>${FIT}</body></html>`;

// Shared inner-page markup; each style themes it with CSS.
function inner(story, sl, i, total, o) {
  let content = '';
  if (sl.kind === 'share') {
    content = `<div class="sharebox"><div class="sh-k">FOLLOW FOR NEWS THAT HITS DIFFERENT</div><div class="sh-h">@postr.news</div><div class="sh-acts"><span>SAVE</span><span>SEND</span><span>FOLLOW</span></div></div>`;
  } else if (sl.stats) {
    const max = Math.max(...sl.stats.map((x) => (typeof x.num === 'number' ? x.num : 0)));
    content = `<div class="stats">${sl.stats.map((x) => `<div class="st${x.hi ? ' hi' : ''}"><div class="st-l">${esc(x.label)}</div><div class="st-v">${esc(x.value)}</div>${max > 0 && typeof x.num === 'number' ? `<div class="st-b"><i style="width:${Math.max(4, (x.num / max) * 100)}%"></i></div>` : ''}</div>`).join('')}</div>${sl.statsNote ? `<div class="snote">${esc(sl.statsNote)}</div>` : ''}`;
  } else if (sl.points) {
    content = `<div class="pts">${sl.points.map((p, k) => `<div class="pt"><span class="pn">${String(k + 1).padStart(2, '0')}</span><span class="px">${esc(p)}</span></div>`).join('')}</div>`;
  }
  const body = sl.body ? `<div class="bd">${esc(sl.body)}</div>` : '';
  return `${o.deco || ''}
<div class="hdr"><span class="lbl">${esc(sl.label)}</span><span class="mt">${esc(o.meta || '')}</span><span class="pgn">${String(i).padStart(2, '0')}/${String(total).padStart(2, '0')}</span></div>
<h2 data-fit data-min="40">${esc(sl.title)}</h2>${body}<div class="cnt">${content}</div>
<div class="ft"><span>SOURCE · ${esc(story.source)}</span><span class="sw">${i < total ? 'SWIPE →' : 'SHARE ↗'}</span><img src="${wm(o.tone)}"></div>`;
}

// Base inner layout used by every style (positions); style CSS adds the look.
const INNER_BASE = `.hdr{position:absolute;top:56px;left:64px;right:64px;display:flex;justify-content:space-between;align-items:center;font:700 22px 'Space Mono';letter-spacing:3px;text-transform:uppercase}
h2{position:absolute;top:140px;left:64px;right:64px;height:300px;display:flex;flex-direction:column;justify-content:flex-end}
.bd{position:absolute;top:470px;left:64px;right:64px;font-size:34px;line-height:1.4;font-weight:600}
.cnt{position:absolute;left:64px;right:64px;bottom:150px;top:480px;display:flex;flex-direction:column;justify-content:flex-end}
.bd+.cnt{top:700px}
.pts{display:flex;flex-direction:column;gap:18px}.pt{display:flex;gap:22px;align-items:center;padding:22px 26px;font-size:30px;font-weight:700;line-height:1.3}
.pn{font:400 44px Anton;min-width:62px}
.stats{display:flex;flex-direction:column;gap:30px}.st{display:grid;grid-template-columns:1fr auto;align-items:end;gap:6px 20px}
.st-l{font:700 22px 'Space Mono';text-transform:uppercase;letter-spacing:1px;line-height:1.3}.st-v{font:400 76px/1 Anton;text-align:right;white-space:nowrap}
.st-b{grid-column:1/3;height:14px}.st-b i{display:block;height:100%}
.snote{margin-top:18px;font:700 20px 'Space Mono'}
.sharebox{padding:48px;display:flex;flex-direction:column;gap:20px}.sh-k{font:700 24px 'Space Mono';letter-spacing:3px}.sh-h{font:400 118px/1 Anton}
.sh-acts{display:flex;gap:16px}.sh-acts span{font:700 24px 'Space Mono';padding:12px 22px;border:3px solid currentColor}
.ft{position:absolute;left:64px;right:64px;bottom:44px;display:flex;justify-content:space-between;align-items:center;gap:24px;font:700 17px 'Space Mono';text-transform:uppercase}
.ft span:first-child{max-width:560px;line-height:1.35}.ft img{width:150px}.sw{white-space:nowrap}`;

// ---------- STYLES ----------
const STYLES = {
  // 1. Front page of a special edition: breaking alerts and big events.
  extra: {
    tone: 'ink',
    cover: (s, d) => pageShell('extra', `body{background:#F1ECE0;color:#111}
.mast{position:absolute;top:44px;left:56px;right:56px;border-top:6px solid #111;border-bottom:2px solid #111;padding:10px 0 6px;display:flex;justify-content:space-between;align-items:center}
.mast .nm{font:400 128px/1 Anton;letter-spacing:2px}.mast .ex{font:400 52px/1 Anton;color:#fff;background:#E2231A;padding:10px 18px;transform:rotate(-3deg)}
.dl{position:absolute;top:212px;left:56px;right:56px;border-bottom:6px double #111;padding:8px 0;display:flex;justify-content:space-between;font:700 20px 'Space Mono';letter-spacing:2px;text-transform:uppercase}
.big{position:absolute;top:276px;left:50px;right:50px;height:420px;font:400 250px/0.92 Anton;text-transform:uppercase;letter-spacing:-2px;display:flex;align-items:center}
.hook{position:absolute;top:720px;left:56px;right:56px;height:230px;font:italic 400 76px/1.02 'Instrument Serif';border-top:2px solid #111;padding-top:18px}
.cols{position:absolute;top:980px;left:56px;right:56px;height:230px;display:grid;grid-template-columns:1.4fr 1fr;gap:36px;border-top:2px solid #111;padding-top:20px}
.lead{font:600 27px/1.42 Manrope}.lead:first-letter{font:400 92px/0.8 Anton;float:left;margin:6px 10px 0 0;color:#E2231A}
.side{font:700 21px/1.6 'Space Mono';border-left:2px solid #111;padding-left:24px;overflow:hidden}.side b{color:#E2231A}
.ft2{position:absolute;left:56px;right:56px;bottom:36px;display:flex;justify-content:space-between;align-items:center;font:700 17px 'Space Mono'}.ft2 img{width:150px}`,
    `${NOISE}<div class="mast"><span class="nm">POSTR</span><span class="ex">EXTRA</span></div>
<div class="dl"><span>${esc(d.meta)}</span><span>LATE EDITION</span><span>NEWS, DESIGNED</span></div>
<div class="big" data-fit data-min="80">${esc(d.big)}</div>
<div class="hook" data-fit data-min="40">${esc(d.hook)}</div>
<div class="cols"><div class="lead" data-fit data-min="15">${esc(s.summary || d.sub)}</div><div class="side">${d.facts.slice(0, 4).map(([l, v]) => `${esc(l)}${v ? ` <b>${esc(v)}</b>` : ''}`).join('<br>')}</div></div>
<div class="ft2"><span>SOURCE · ${esc(s.source)}</span><span>SWIPE →</span><img src="${wm('ink')}"></div>`),
    css: `body{background:#F1ECE0;color:#111}.hdr{border-bottom:6px double #111;padding-bottom:12px}.lbl{color:#E2231A}
h2{font:400 104px/0.95 Anton;text-transform:uppercase}.bd{font-family:'Instrument Serif';font-style:italic;font-weight:400;font-size:46px;line-height:1.15}
.pt{border-top:2px solid #111;padding-left:0;font-family:Manrope}.pn{color:#E2231A}
.st{border-bottom:2px dotted #111;padding-bottom:12px}.st.hi .st-v{color:#E2231A}.st-b{background:rgba(17,17,17,.1)}.st-b i{background:#111}.st.hi .st-b i{background:#E2231A}
.sharebox{border:6px double #111}.sh-h{color:#E2231A}`,
    deco: NOISE,
  },
  // 2. Evidence-board collage: scams, overcharging, money traps.
  exposed: {
    tone: 'ink',
    cover: (s, d) => pageShell('exposed', `body{background:#ECE6D8;color:#111}
.band{position:absolute;top:0;left:0;right:0;height:120px;background:#111;color:#ECE6D8;display:flex;align-items:center;justify-content:space-between;padding:0 56px;font:700 28px 'Space Mono';letter-spacing:6px;clip-path:polygon(0 0,100% 0,100% 82%,96% 100%,90% 86%,83% 100%,74% 84%,66% 100%,57% 85%,48% 100%,40% 86%,31% 100%,22% 84%,14% 100%,6% 86%,0 100%)}
.band b{background:#FF2E1F;color:#111;padding:4px 14px}
.old{position:absolute;top:170px;left:56px;font:400 200px/1 Anton;letter-spacing:-3px}
.strike{position:absolute;top:220px;left:30px}
.big{position:absolute;top:${d.old ? 390 : 200}px;left:40px;width:1000px;height:${d.old ? 330 : 500}px;font:400 ${d.old ? 290 : d.big.length <= 3 ? 640 : 330}px/0.9 Anton;color:#FF2E1F;transform:rotate(-4deg);letter-spacing:-5px;text-shadow:8px 8px 0 #111;display:flex;align-items:center;text-transform:uppercase}
.tag{position:absolute;top:${d.old ? 360 : 180}px;right:50px;font:700 28px 'Space Mono';transform:rotate(7deg);border:4px solid #111;padding:10px 18px;background:#FFE14D}
.hook{position:absolute;left:56px;top:790px;width:500px;height:370px;font:italic 400 78px/1 'Instrument Serif'}
.receipt{position:absolute;left:600px;top:800px;width:420px;background:#fff;padding:30px 28px 44px;font:400 21px/1.6 'Space Mono';transform:rotate(3deg);box-shadow:0 18px 40px rgba(0,0,0,.25);clip-path:polygon(0 0,100% 0,100% 94%,95% 100%,90% 94%,85% 100%,80% 94%,75% 100%,70% 94%,65% 100%,60% 94%,55% 100%,50% 94%,45% 100%,40% 94%,35% 100%,30% 94%,25% 100%,20% 94%,15% 100%,10% 94%,5% 100%,0 94%)}
.receipt .h{font-weight:700;border-bottom:3px dashed #111;padding-bottom:8px;margin-bottom:8px;letter-spacing:3px}.r{display:flex;justify-content:space-between;gap:12px}.r b{white-space:nowrap}.r:last-child{color:#FF2E1F;font-weight:700}
.tape{position:absolute;left:740px;top:772px;width:180px;height:56px;background:rgba(255,225,77,.75);transform:rotate(-8deg)}
.ft2{position:absolute;left:56px;right:56px;bottom:40px;display:flex;justify-content:space-between;align-items:center;font:700 17px 'Space Mono'}.ft2 img{width:150px}.ft2 .sw{background:#111;color:#ECE6D8;padding:8px 16px}`,
    `${NOISE}<div class="band"><span>POSTR <b>EXPOSED</b></span><span>${esc(d.meta).toUpperCase()}</span></div>
${d.old ? `<div class="old">${esc(d.old)}</div><svg class="strike" width="900" height="140"><path d="M10 90 C 220 40, 460 120, 860 50" stroke="#FF2E1F" stroke-width="24" fill="none" stroke-linecap="round"/></svg>` : ''}
<div class="big" data-fit data-min="90">${esc(d.big)}</div><div class="tag">${s.format === 'alert' ? 'WARNING' : 'THE RECEIPT'}</div>
<div class="hook" data-fit data-min="38">${esc(d.hook)}</div>
${d.facts.length ? `<div class="tape"></div><div class="receipt"><div class="h">FILE · POSTR</div>${d.facts.map(([l, v]) => `<div class="r"><span>${esc(l)}</span><b>${esc(v)}</b></div>`).join('')}</div>` : ''}
<div class="ft2"><span>SOURCE · ${esc(s.source)}</span><span class="sw">SWIPE →</span><img src="${wm('ink')}"></div>`),
    css: `body{background:#ECE6D8;color:#111}.lbl{background:#111;color:#ECE6D8;padding:6px 14px}
h2{font:400 108px/0.95 Anton;text-transform:uppercase}
.pt{background:#111;color:#ECE6D8;font-family:'Space Mono';font-size:26px}.pt:nth-child(odd){transform:rotate(-1deg)}.pt:nth-child(even){transform:rotate(1deg)}.pn{color:#FF2E1F}
.stats{background:#fff;padding:36px;box-shadow:0 14px 30px rgba(0,0,0,.2);transform:rotate(-1deg)}.st{border-bottom:3px dashed #111;padding-bottom:14px}.st.hi .st-v{color:#FF2E1F}.st-b{display:none}
.sharebox{background:#FFE14D;border:5px solid #111;transform:rotate(-2deg)}.bd{font-family:'Instrument Serif';font-style:italic;font-weight:400;font-size:48px;line-height:1.1}`,
    deco: NOISE,
  },
  // 3. Live terminal feed: markets, rupee, numbers that move.
  feed: {
    tone: 'paper',
    cover: (s, d) => pageShell('feed', `body{background:#07080A;color:#D7FF3A;font-family:'Space Mono'}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(215,255,58,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(215,255,58,.07) 1px,transparent 1px);background-size:54px 54px}
.scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.35) 0 2px,transparent 2px 5px);pointer-events:none}
.top{position:absolute;top:50px;left:56px;right:56px;display:flex;justify-content:space-between;font-size:22px;letter-spacing:3px;text-transform:uppercase}
.dot{display:inline-block;width:18px;height:18px;border-radius:50%;background:#FF2E1F;box-shadow:0 0 20px #FF2E1F;margin-right:12px;vertical-align:-2px}
.sub{position:absolute;top:150px;left:56px;right:56px;height:90px;font-size:28px;letter-spacing:2px;color:#F4F1EA;text-transform:uppercase;line-height:1.35}
.big{position:absolute;top:240px;left:46px;right:70px;height:420px;font:400 400px/1 Anton;letter-spacing:-8px;white-space:nowrap;display:flex;align-items:center;text-shadow:-10px 0 0 rgba(255,46,31,.85),10px 0 0 rgba(0,200,255,.6);text-transform:uppercase}
.gl{position:absolute;top:470px;left:0;right:0;height:22px;background:#07080A}.gl2{position:absolute;top:580px;left:120px;width:560px;height:12px;background:#D7FF3A;opacity:.85}
.hook{position:absolute;top:700px;left:56px;right:56px;height:290px;font:400 92px/1.02 'Archivo Black';color:#F4F1EA;letter-spacing:-2px}
.rows{position:absolute;top:1010px;left:56px;right:56px;font-size:24px;color:#F4F1EA}.rows div{display:flex;justify-content:space-between;border-bottom:1px solid rgba(215,255,58,.35);padding:8px 0}.rows b{color:#D7FF3A}
.tick{position:absolute;bottom:96px;left:0;right:0;background:#D7FF3A;color:#07080A;font-weight:700;font-size:24px;white-space:nowrap;padding:12px 0;letter-spacing:2px;overflow:hidden}
.ft2{position:absolute;left:56px;right:56px;bottom:28px;display:flex;justify-content:space-between;align-items:center;font-size:17px;color:#F4F1EA}.ft2 img{width:150px}`,
    `<div class="grid"></div><div class="top"><span><span class="dot"></span>LIVE FEED</span><span>${esc(d.meta)}</span><span>POSTR/DATA</span></div>
<div class="sub" data-fit data-min="18">${esc(d.sub)}</div>
<div class="big" data-fit data-min="90">${esc(d.big)}</div><div class="gl"></div><div class="gl2"></div>
<div class="hook" data-fit data-min="40">${esc(d.hook)}</div>
<div class="rows">${d.facts.slice(0, 3).map(([l, v]) => `<div><span>${esc(l)}</span><b>${esc(v)}</b></div>`).join('')}</div>
<div class="tick">&nbsp;${(s.tags || []).map((t) => `#${esc(t).toUpperCase()}`).join(' ▲ ')} ▲ POSTR.NEWS ▲ ${(s.tags || []).map((t) => `#${esc(t).toUpperCase()}`).join(' ▲ ')}</div>
<div class="ft2"><span>SOURCE · ${esc(s.source)} · SWIPE →</span><img src="${wm('paper')}"></div><div class="scan"></div>`),
    css: `body{background:#07080A;color:#F4F1EA;background-image:linear-gradient(rgba(215,255,58,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(215,255,58,.06) 1px,transparent 1px);background-size:54px 54px}
.hdr{color:#D7FF3A}.lbl:before{content:'● ';color:#FF2E1F}
h2{font:400 96px/1 'Archivo Black';letter-spacing:-2px}.bd{font-family:'Space Mono';font-size:30px;color:#D7FF3A}
.pt{border:2px solid #D7FF3A;font-family:'Space Mono';font-size:26px;color:#F4F1EA}.pn{color:#D7FF3A}.pn:before{content:'>';margin-right:6px}
.st-l{color:#F4F1EA}.st-v{color:#D7FF3A;text-shadow:-4px 0 0 rgba(255,46,31,.7),4px 0 0 rgba(0,200,255,.5)}.st-b{border:2px solid #D7FF3A}.st-b i{background:repeating-linear-gradient(90deg,#D7FF3A 0 12px,transparent 12px 18px)}
.sharebox{border:3px solid #D7FF3A}.sh-h{color:#D7FF3A}.ft{color:#F4F1EA}`,
    deco: `<div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.3) 0 2px,transparent 2px 5px);pointer-events:none;z-index:9"></div>`,
  },
  // 4. Swiss gallery poster: one giant number, editorial calm.
  swiss: {
    tone: 'ink',
    cover: (s, d) => pageShell('swiss', `body{background:#F2EEE3;color:#111}
.vl{position:absolute;top:0;bottom:0;width:1px;background:rgba(17,17,17,.18)}.hl{position:absolute;left:0;right:0;height:1px;background:rgba(17,17,17,.18)}
.reg{position:absolute;width:44px;height:44px;border:2px solid #111;border-radius:50%}.reg:before,.reg:after{content:'';position:absolute;background:#111}.reg:before{left:50%;top:-12px;bottom:-12px;width:2px;margin-left:-1px}.reg:after{top:50%;left:-12px;right:-12px;height:2px;margin-top:-1px}
.kick{position:absolute;left:96px;top:44px;z-index:2;background:#F2EEE3;padding:4px 10px;font:700 22px 'Space Mono';letter-spacing:6px;text-transform:uppercase}
.big{position:absolute;left:-20px;right:-60px;top:110px;height:700px;font:400 760px/0.82 Anton;color:#FF3B1F;letter-spacing:-20px;white-space:nowrap;display:flex;align-items:center;text-transform:uppercase}
.hook{position:absolute;left:60px;right:60px;top:850px;height:270px;font:italic 400 110px/0.95 'Instrument Serif'}
.sub{position:absolute;left:60px;top:1140px;width:600px;height:110px;font-size:27px;font-weight:600;line-height:1.35}
.idx{position:absolute;left:700px;top:1140px;right:60px;font:700 20px/1.6 'Space Mono';text-transform:uppercase}.idx b{color:#FF3B1F}
.ft2{position:absolute;left:60px;right:60px;bottom:36px;display:flex;justify-content:space-between;align-items:center;font:700 17px 'Space Mono'}.ft2 img{width:150px}`,
    `<div class="vl" style="left:60px"></div><div class="vl" style="left:540px"></div><div class="vl" style="left:1020px"></div><div class="hl" style="top:830px"></div><div class="hl" style="top:1125px"></div>
<div class="reg" style="left:30px;top:30px"></div><div class="reg" style="right:30px;top:30px"></div><div class="reg" style="right:30px;bottom:110px"></div>
<div class="kick">POSTR LAB · ${esc(d.meta)}</div>
<div class="big" data-fit data-min="120">${esc(d.big)}</div>
<div class="hook" data-fit data-min="44">${esc(d.hook)}</div>
<div class="sub" data-fit data-min="18">${esc(d.sub)}</div>
<div class="idx">${d.stats.slice(0, 3).map(([l, v]) => `${esc(l).slice(0, 28)} <b>${esc(v)}</b>`).join('<br>')}</div>
<div class="ft2"><span>SOURCE · ${esc(s.source)}</span><span>SWIPE →</span><img src="${wm('ink')}"></div>`),
    css: `body{background:#F2EEE3;color:#111;background-image:linear-gradient(90deg,transparent 539px,rgba(17,17,17,.15) 539px,rgba(17,17,17,.15) 540px,transparent 540px)}
.lbl{color:#FF3B1F}h2{font:italic 400 120px/0.95 'Instrument Serif'}.bd{font-size:34px}
.pt{border-top:3px solid #111;background:#F2EEE3}.pn{color:#FF3B1F;font-size:56px}
.st-v{font-size:96px}.st.hi .st-v{color:#FF3B1F}.st-b{background:rgba(17,17,17,.08)}.st-b i{background:#111}.st.hi .st-b i{background:#FF3B1F}
.sharebox{border-top:8px solid #FF3B1F;padding-left:0}.sh-h{font-size:130px}`,
  },
  // 5. Case file on manila paper: world events, conflict, investigations.
  dossier: {
    tone: 'ink',
    cover: (s, d) => pageShell('dossier', `body{background:#2B2A26;color:#1A1A1A}
.folder{position:absolute;left:40px;right:40px;top:90px;bottom:40px;background:#D8C69B;border-radius:6px 6px 0 0;box-shadow:0 20px 50px rgba(0,0,0,.5)}
.tab{position:absolute;left:40px;top:44px;width:330px;height:70px;background:#D8C69B;border-radius:14px 14px 0 0;font:700 24px 'Space Mono';letter-spacing:4px;padding:18px 26px}
.paper{position:absolute;left:84px;right:70px;top:150px;bottom:90px;background:#F5F0E4;transform:rotate(-1.2deg);box-shadow:0 8px 24px rgba(0,0,0,.2)}
.fields{position:absolute;left:120px;right:110px;top:190px;font:700 22px/1.8 'Space Mono';text-transform:uppercase;border-bottom:3px solid #1A1A1A;padding-bottom:12px;transform:rotate(-1.2deg)}
.big{position:absolute;left:120px;right:110px;top:330px;height:360px;font:400 ${d.big.length <= 4 ? 320 : 150}px/0.95 'Archivo Black';letter-spacing:-4px;text-transform:uppercase;transform:rotate(-1.2deg);display:flex;align-items:center}
.stamp{position:absolute;right:90px;top:640px;font:400 70px/1 Anton;color:#C8102E;border:8px solid #C8102E;padding:10px 26px;transform:rotate(-12deg);opacity:.85;letter-spacing:4px}
.hook{position:absolute;left:120px;right:110px;top:770px;height:220px;font:italic 400 64px/1.05 'Instrument Serif';transform:rotate(-1.2deg)}
.red{position:absolute;left:120px;top:1020px;transform:rotate(-1.2deg);font:400 22px/2 'Space Mono';width:840px}.red span{background:#1A1A1A;color:#1A1A1A}
.clip{position:absolute;left:560px;top:120px;width:60px;height:150px;border:8px solid #9A9A9A;border-radius:30px}
.ft2{position:absolute;left:120px;right:110px;bottom:120px;display:flex;justify-content:space-between;align-items:center;font:700 17px 'Space Mono';transform:rotate(-1.2deg)}.ft2 img{width:140px}`,
    `<div class="tab">CASE FILE</div><div class="folder"></div><div class="paper"></div><div class="clip"></div>
<div class="fields">LOCATION: ${esc(s.place || d.meta)}<br>STATUS: DEVELOPING · POSTR DESK</div>
<div class="big" data-fit data-min="56">${esc(d.big)}</div><div class="stamp">${s.format === 'alert' ? 'ALERT' : 'FILED'}</div>
<div class="hook" data-fit data-min="34">${esc(d.hook)}</div>
<div class="red">${d.facts.slice(0, 2).map(([l, v]) => `${esc(l)} ${esc(v)}`).join(' · ')}</div>
<div class="ft2"><span>SOURCE · ${esc(s.source)}</span><span>SWIPE →</span><img src="${wm('ink')}"></div>`),
    css: `body{background:#F5F0E4;color:#1A1A1A;font-family:'Space Mono'}.hdr{border-bottom:3px solid #1A1A1A;padding-bottom:12px}.lbl{color:#C8102E}
h2{font:400 92px/1 'Archivo Black';letter-spacing:-3px;text-transform:uppercase}.bd{font-family:'Instrument Serif';font-style:italic;font-weight:400;font-size:48px;line-height:1.1}
.pt{border:3px solid #1A1A1A;font-family:'Space Mono';font-size:25px;background:#fff}.pn{color:#C8102E}.pn:before{content:'#'}
.st{border-bottom:3px solid #1A1A1A;padding-bottom:12px}.st-v{font-family:'Archivo Black';font-size:64px}.st.hi .st-v{color:#C8102E}.st-b{background:#E6DCC4}.st-b i{background:#1A1A1A}.st.hi .st-b i{background:#C8102E}
.sharebox{border:6px solid #C8102E;color:#C8102E;transform:rotate(-3deg)}`,
    deco: `<div style="position:absolute;right:60px;top:520px;font:400 46px Anton;color:rgba(200,16,46,.18);border:6px solid rgba(200,16,46,.18);padding:6px 18px;transform:rotate(-14deg)">POSTR DESK</div>`,
  },
  // 6. The forwarded message, stamped: fact checks.
  forward: {
    tone: 'paper',
    cover: (s, d) => pageShell('forward', `body{background:#111214;color:#F4F1EA}
.top{position:absolute;top:56px;left:56px;right:56px;display:flex;justify-content:space-between;font:700 22px 'Space Mono';letter-spacing:4px;color:#9FA3A8}
.bub{position:absolute;left:56px;width:820px;top:150px;height:520px;background:#1F2C26;border-radius:6px 40px 40px 40px;padding:40px 44px}
.fw{font:italic 600 26px Manrope;color:#9FB7A8;margin-bottom:16px}
.claim{height:400px;font:600 64px/1.15 Manrope;color:#E8F3EC}
.time{position:absolute;left:760px;top:630px;font:600 22px Manrope;color:#9FB7A8}
.stamp{position:absolute;left:30px;right:30px;top:520px;height:300px;display:flex;align-items:center;justify-content:center;transform:rotate(-9deg)}
.stamp div{font:400 190px/0.9 Anton;color:#FF2E1F;border:14px solid #FF2E1F;padding:10px 40px;text-transform:uppercase;letter-spacing:4px;background:rgba(17,18,20,.6);text-align:center;width:960px;height:280px;display:flex;align-items:center;justify-content:center}
.ev{position:absolute;left:56px;right:56px;top:880px;height:150px;background:#D7FF3A;color:#111;font:700 40px/1.2 Manrope;padding:26px 30px}
.hook{position:absolute;left:56px;right:56px;top:1060px;height:150px;font:italic 400 58px/1.05 'Instrument Serif'}
.ft2{position:absolute;left:56px;right:56px;bottom:36px;display:flex;justify-content:space-between;align-items:center;font:700 17px 'Space Mono';color:#9FA3A8}.ft2 img{width:150px}`,
    `<div class="top"><span>FORWARD RECEIVED</span><span>POSTR FACT CHECK</span></div>
<div class="bub"><div class="fw">↪ Forwarded</div><div class="claim" data-fit data-min="30">${esc(d.claim || d.hook)}</div></div><div class="time">9:41 PM ✓✓</div>
<div class="stamp"><div data-fit data-min="70">${esc(d.big)}</div></div>
<div class="ev" data-fit data-min="22">${esc(d.sub)}</div>
<div class="hook" data-fit data-min="30">${esc(d.hook)}</div>
<div class="ft2"><span>SOURCE · ${esc(s.source)}</span><span>SWIPE →</span><img src="${wm('paper')}"></div>`),
    css: `body{background:#111214;color:#F4F1EA}.hdr{color:#9FA3A8}.lbl{color:#FF2E1F}
h2{font:400 100px/1 Anton;text-transform:uppercase}.bd{font-size:34px;color:#D7FF3A}
.pt{background:#1F2C26;border-radius:4px 30px 30px 30px;color:#E8F3EC;font-size:30px}.pt:nth-child(even){background:#2A2D33;border-radius:30px 4px 30px 30px;margin-left:80px}.pn{color:#D7FF3A}
.st{background:#1F2C26;border-radius:4px 30px 30px 30px;padding:22px 28px}.st-l{color:#9FB7A8}.st.hi .st-v{color:#D7FF3A}.st-b{display:none}
.sharebox{background:#D7FF3A;color:#111;border-radius:6px 40px 40px 40px}`,
  },
  // 7. Risograph pop: health, society, explainers.
  riso: {
    tone: 'ink',
    cover: (s, d) => pageShell('riso', `body{background:#F5EFE3;color:#1B1B3A}
.dots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,72,176,.35) 3px,transparent 3.5px);background-size:22px 22px;mask-image:linear-gradient(160deg,#000 0%,transparent 55%)}
.blob{position:absolute;right:-160px;top:-120px;width:760px;height:760px;border-radius:50%;background:#FF48B0;mix-blend-mode:multiply;opacity:.9}
.blob2{position:absolute;left:-200px;top:520px;width:620px;height:620px;border-radius:50%;background:#0078BF;mix-blend-mode:multiply;opacity:.55}
.kick{position:absolute;top:56px;left:56px;font:700 24px 'Space Mono';letter-spacing:5px;color:#1B1B3A;text-transform:uppercase}
.bigw{position:absolute;left:40px;right:40px;top:150px;height:520px}
.big{position:absolute;inset:0;font:400 420px/0.9 Anton;letter-spacing:-8px;white-space:nowrap;display:flex;align-items:center;text-transform:uppercase}
.b1{color:#0078BF;mix-blend-mode:multiply}.b2{color:#FF48B0;mix-blend-mode:multiply;transform:translate(14px,10px)}
.hook{position:absolute;left:56px;right:56px;top:720px;height:300px;font:400 84px/1.02 'Archivo Black';color:#1B1B3A;letter-spacing:-2px}
.sub{position:absolute;left:56px;right:300px;top:1050px;height:150px;font:700 30px/1.35 Manrope}
.sticker{position:absolute;right:60px;top:1040px;width:200px;height:200px;border-radius:50%;background:#FFE14D;display:flex;align-items:center;justify-content:center;text-align:center;font:400 40px/1 Anton;transform:rotate(12deg);color:#1B1B3A}
.ft2{position:absolute;left:56px;right:56px;bottom:36px;display:flex;justify-content:space-between;align-items:center;font:700 17px 'Space Mono'}.ft2 img{width:150px}`,
    `<div class="dots"></div><div class="blob"></div><div class="blob2"></div><div class="kick">POSTR LAB · ${esc(d.meta)}</div>
<div class="bigw"><div class="big b1" data-fit data-min="100">${esc(d.big)}</div><div class="big b2" data-fit data-min="100">${esc(d.big)}</div></div>
<div class="hook" data-fit data-min="38">${esc(d.hook)}</div><div class="sub" data-fit data-min="18">${esc(d.sub)}</div>
<div class="sticker">SWIPE<br>TO<br>KNOW</div>
<div class="ft2"><span>SOURCE · ${esc(s.source)}</span><img src="${wm('ink')}"></div>`),
    css: `body{background:#F5EFE3;color:#1B1B3A;background-image:radial-gradient(rgba(255,72,176,.22) 3px,transparent 3.5px);background-size:22px 22px}
.lbl{background:#FF48B0;color:#fff;padding:6px 14px}h2{font:400 108px/0.95 Anton;text-transform:uppercase;color:#0078BF;text-shadow:6px 5px 0 rgba(255,72,176,.8)}
.bd{font-size:36px}.pt{background:#0078BF;color:#fff;border-radius:16px}.pt:nth-child(even){background:#FF48B0}.pn{color:#FFE14D}
.st-v{color:#0078BF;text-shadow:5px 4px 0 rgba(255,72,176,.7)}.st-b{background:rgba(0,120,191,.15);border-radius:8px}.st-b i{background:#0078BF;border-radius:8px}.st.hi .st-b i{background:#FF48B0}
.sharebox{background:#FFE14D;border-radius:30px}.sh-h{color:#0078BF}`,
  },
  // 8. Stadium scoreboard: sport.
  scoreboard: {
    tone: 'paper',
    cover: (s, d) => pageShell('score', `body{background:#0B0B0D;color:#FFB000}
.led{position:absolute;inset:0;background-image:radial-gradient(rgba(255,176,0,.08) 2px,transparent 2.5px);background-size:12px 12px}
.board{position:absolute;left:44px;right:44px;top:120px;height:640px;border:6px solid #2A2A2E;background:#111114;box-shadow:inset 0 0 60px rgba(0,0,0,.8)}
.top{position:absolute;top:50px;left:56px;right:56px;display:flex;justify-content:space-between;font:700 24px 'Space Mono';letter-spacing:5px;color:#F4F1EA}
.big{position:absolute;left:70px;right:70px;top:170px;height:520px;font:700 330px/1 'Space Mono';color:#FFB000;text-shadow:0 0 24px rgba(255,176,0,.65);display:flex;align-items:center;justify-content:center;white-space:nowrap;letter-spacing:-10px;text-transform:uppercase}
.hook{position:absolute;left:56px;right:56px;top:800px;height:260px;font:400 92px/1 Anton;color:#F4F1EA;text-transform:uppercase}
.cells{position:absolute;left:56px;right:56px;top:1080px;display:flex;gap:14px}.cells div{flex:1;border:3px solid #FFB000;padding:12px;font:700 20px/1.3 'Space Mono';color:#F4F1EA;text-transform:uppercase}.cells b{display:block;color:#FFB000;font-size:30px}
.ft2{position:absolute;left:56px;right:56px;bottom:36px;display:flex;justify-content:space-between;align-items:center;font:700 17px 'Space Mono';color:#F4F1EA}.ft2 img{width:150px}`,
    `<div class="led"></div><div class="top"><span>● LIVE · POSTR SPORT</span><span>${esc(d.meta)}</span></div><div class="board"></div>
<div class="big" data-fit data-min="80">${esc(d.big)}</div>
<div class="hook" data-fit data-min="40">${esc(d.hook)}</div>
<div class="cells">${d.facts.slice(0, 3).map(([l, v]) => `<div>${esc(l)}<b>${esc(v)}</b></div>`).join('')}</div>
<div class="ft2"><span>SOURCE · ${esc(s.source)} · SWIPE →</span><img src="${wm('paper')}"></div>`),
    css: `body{background:#0B0B0D;color:#F4F1EA;background-image:radial-gradient(rgba(255,176,0,.07) 2px,transparent 2.5px);background-size:12px 12px}
.hdr{color:#FFB000}h2{font:400 104px/1 Anton;text-transform:uppercase}.bd{font-size:34px}
.pt{border:3px solid #FFB000;font-family:'Space Mono';font-size:26px}.pn{color:#FFB000;text-shadow:0 0 14px rgba(255,176,0,.6)}
.st{border:3px solid #2A2A2E;background:#111114;padding:20px 24px}.st-v{font-family:'Space Mono';font-weight:700;font-size:64px;color:#FFB000;text-shadow:0 0 18px rgba(255,176,0,.6)}.st-b{display:none}
.sharebox{border:4px solid #FFB000}.sh-h{color:#FFB000}`,
  },
  // 9. Bank passbook: money that belongs to people (deposits, savings, refunds).
  passbook: {
    tone: 'ink',
    cover: (s, d) => pageShell('passbook', `body{background:#1F3A5F;color:#13233A}
.book{position:absolute;left:44px;right:44px;top:44px;bottom:44px;background:#E9F0E6;border-radius:10px;box-shadow:0 24px 60px rgba(0,0,0,.45);overflow:hidden}
.book:before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 47px,rgba(31,58,95,.18) 47px 48px)}
.bank{position:absolute;left:44px;right:44px;top:44px;height:118px;background:#13233A;color:#E9F0E6;display:flex;justify-content:space-between;align-items:center;padding:0 40px;font:700 26px 'Space Mono';letter-spacing:4px;border-radius:10px 10px 0 0}
.bank b{font:400 44px Anton;letter-spacing:2px}
.cols{position:absolute;left:84px;right:84px;top:196px;display:grid;grid-template-columns:1fr 260px;font:700 20px 'Space Mono';letter-spacing:2px;color:#1F3A5F;border-bottom:3px solid #13233A;padding-bottom:10px}
.rows{position:absolute;left:84px;right:84px;top:250px;font:400 24px/48px 'Space Mono'}
.rows div{display:grid;grid-template-columns:1fr 260px}.rows b{text-align:right}
.bal{position:absolute;left:84px;right:84px;top:480px;height:260px;border:5px double #13233A;padding:18px 28px;background:rgba(255,255,255,.55)}
.bal span{font:700 22px 'Space Mono';letter-spacing:4px}
.big{height:190px;font:700 150px/1.2 'Space Mono';letter-spacing:-6px;white-space:nowrap;color:#13233A}
.stamp{position:absolute;right:70px;top:430px;font:400 76px/1 Anton;color:#C8102E;border:9px solid #C8102E;border-radius:14px;padding:6px 26px;transform:rotate(-14deg);opacity:.88;letter-spacing:6px;mix-blend-mode:multiply}
.hook{position:absolute;left:84px;right:84px;top:790px;height:300px;font:italic 400 78px/1.02 'Instrument Serif'}
.ft2{position:absolute;left:84px;right:84px;bottom:80px;display:flex;justify-content:space-between;align-items:center;font:700 17px 'Space Mono'}.ft2 img{width:140px}`,
    `<div class="book"></div><div class="bank"><b>POSTR BANK</b><span>SAVINGS · PASSBOOK</span></div>
<div class="cols"><span>PARTICULARS</span><span style="text-align:right">BALANCE</span></div>
<div class="rows">${d.stats.slice(1, 4).map(([l, v]) => `<div><span>${esc(l).slice(0, 34)}</span><b>${esc(v)}</b></div>`).join('')}</div>
<div class="bal"><span>BALANCE NOBODY CLAIMED</span><div class="big" data-fit data-min="60">${esc(d.big)}</div></div><div class="stamp">UNCLAIMED</div>
<div class="hook" data-fit data-min="38">${esc(d.hook)}</div>
<div class="ft2"><span>SOURCE · ${esc(s.source)}</span><span>SWIPE →</span><img src="${wm('ink')}"></div>`),
    css: `body{background:#E9F0E6;color:#13233A;background-image:repeating-linear-gradient(0deg,transparent 0 47px,rgba(31,58,95,.16) 47px 48px)}
.hdr{background:#13233A;color:#E9F0E6;margin:-56px -64px 0;padding:22px 64px}.hdr{position:absolute;top:56px}
h2{font:700 76px/1.05 'Space Mono';letter-spacing:-3px}.bd{font-family:'Space Mono';font-size:30px}
.pt{border-bottom:2px solid #13233A;font-family:'Space Mono';font-size:25px;background:transparent;padding-left:0}.pn{color:#C8102E}
.st{border-bottom:2px solid #13233A;padding-bottom:12px}.st-v{font-family:'Space Mono';font-weight:700;font-size:60px}.st.hi .st-v{color:#C8102E}.st-b{display:none}
.sharebox{border:5px double #13233A;background:rgba(255,255,255,.5)}`,
  },
  // 10. Pharmacy: medicines, health products, drug safety.
  pharmacy: {
    tone: 'ink',
    cover: (s, d) => pageShell('pharmacy', `body{background:#F4F7F5;color:#0F2E25}
.top{position:absolute;top:56px;left:64px;right:64px;display:flex;justify-content:space-between;align-items:center;font:700 22px 'Space Mono';letter-spacing:3px}
.cross{width:64px;height:64px;position:relative}.cross:before,.cross:after{content:'';position:absolute;background:#0E9F6E;border-radius:6px}.cross:before{left:22px;top:0;width:20px;height:64px}.cross:after{top:22px;left:0;height:20px;width:64px}
.pack{position:absolute;left:64px;right:64px;top:160px;height:430px;border-radius:36px;background:linear-gradient(135deg,#E3E8EA,#C9D1D6);box-shadow:inset 0 0 0 3px rgba(15,46,37,.15),0 20px 40px rgba(0,0,0,.12);display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(2,1fr);gap:22px;padding:40px}
.pill{border-radius:60px;background:linear-gradient(160deg,#fff,#DDE3E7);box-shadow:inset 0 -6px 12px rgba(0,0,0,.12),0 6px 10px rgba(0,0,0,.08);position:relative}
.pill.bad{background:linear-gradient(160deg,#FFD9D4,#F26B5B)}.pill.bad:after{content:'✕';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:400 70px Anton;color:#7A0E06}
.big{position:absolute;left:64px;right:64px;top:620px;height:180px;font:400 170px/1 Anton;color:#D7261E;white-space:nowrap;display:flex;align-items:center;text-transform:uppercase}
.rx{position:absolute;left:64px;right:64px;top:820px;height:300px;border-top:4px solid #0F2E25;padding-top:20px;display:flex;gap:26px}
.rx b{font:italic 400 120px/0.9 'Instrument Serif';color:#0E9F6E}
.hook{flex:1;height:270px;font:700 52px/1.15 Manrope}
.ft2{position:absolute;left:64px;right:64px;bottom:44px;display:flex;justify-content:space-between;align-items:center;font:700 17px 'Space Mono'}.ft2 img{width:150px}`,
    `<div class="top"><span class="cross"></span><span>POSTR PHARMACY CHECK</span><span>${esc(d.meta)}</span></div>
<div class="pack">${Array.from({ length: 10 }, (_, k) => `<div class="pill${[1, 4, 7].includes(k) ? ' bad' : ''}"></div>`).join('')}</div>
<div class="big" data-fit data-min="80">${esc(d.big)}</div>
<div class="rx"><b>Rx</b><div class="hook" data-fit data-min="28">${esc(d.hook)}</div></div>
<div class="ft2"><span>SOURCE · ${esc(s.source)}</span><span>SWIPE →</span><img src="${wm('ink')}"></div>`),
    css: `body{background:#F4F7F5;color:#0F2E25}.hdr{color:#0E9F6E}.lbl{background:#0E9F6E;color:#fff;padding:6px 14px;border-radius:30px}
h2{font:800 84px/1.02 Manrope;letter-spacing:-3px}.bd{font-size:34px}
.pt{background:#fff;border-radius:60px;box-shadow:0 6px 16px rgba(0,0,0,.08);font-size:28px}.pn{color:#D7261E}
.st{background:#fff;border-radius:24px;padding:22px 28px;box-shadow:0 6px 16px rgba(0,0,0,.08)}.st.hi .st-v{color:#D7261E}.st-b{display:none}
.sharebox{background:#0E9F6E;color:#fff;border-radius:36px}`,
    deco: `<div style="position:absolute;right:-80px;top:-80px;width:320px;height:320px;border-radius:50%;background:rgba(14,159,110,.08)"></div>`,
  },
  // 11. Headcount: one-in-N facts shown as people.
  headcount: {
    tone: 'paper',
    cover: (s, d) => {
      const t = s.tally || { of: 4, hit: 3, hitLabel: '', restLabel: '' };
      const person = (hit) => `<svg viewBox="0 0 100 200" class="pp"><circle cx="50" cy="34" r="28" fill="${hit ? '#FF3B1F' : '#3A3A40'}"/><path d="M12 200 V110 Q12 74 50 74 Q88 74 88 110 V200 Z" fill="${hit ? '#FF3B1F' : '#3A3A40'}"/></svg>`;
      return pageShell('headcount', `body{background:#111113;color:#F4F1EA}
.top{position:absolute;top:56px;left:64px;right:64px;display:flex;justify-content:space-between;font:700 22px 'Space Mono';letter-spacing:4px;color:#9A9AA2}
.crowd{position:absolute;left:64px;right:64px;top:140px;height:440px;display:flex;justify-content:space-between;align-items:flex-end}
.pp{width:${Math.floor(900 / t.of)}px;height:420px}
.legend{position:absolute;left:64px;right:64px;top:600px;display:flex;gap:40px;font:700 22px 'Space Mono';letter-spacing:2px}.legend i{display:inline-block;width:22px;height:22px;margin-right:10px;vertical-align:-3px}
.big{position:absolute;left:56px;right:56px;top:650px;height:230px;font:400 230px/1 Anton;color:#FF3B1F;white-space:nowrap;text-transform:uppercase}
.hook{position:absolute;left:64px;right:64px;top:900px;height:250px;font:italic 400 76px/1.02 'Instrument Serif'}
.ft2{position:absolute;left:64px;right:64px;bottom:44px;display:flex;justify-content:space-between;align-items:center;font:700 17px 'Space Mono';color:#9A9AA2}.ft2 img{width:150px}`,
      `<div class="top"><span>POSTR HEADCOUNT</span><span>${esc(d.meta)}</span></div>
<div class="crowd">${Array.from({ length: t.of }, (_, k) => person(k < t.hit)).join('')}</div>
<div class="legend"><span><i style="background:#FF3B1F"></i>${esc(t.hitLabel)}</span><span><i style="background:#3A3A40"></i>${esc(t.restLabel)}</span></div>
<div class="big" data-fit data-min="90">${esc(d.big)}</div>
<div class="hook" data-fit data-min="34">${esc(d.hook)}</div>
<div class="ft2"><span>SOURCE · ${esc(s.source)}</span><span>SWIPE →</span><img src="${wm('paper')}"></div>`);
    },
    css: `body{background:#111113;color:#F4F1EA}.hdr{color:#9A9AA2}.lbl{color:#FF3B1F}
h2{font:italic 400 110px/0.95 'Instrument Serif'}.bd{font-size:34px}
.pt{border-left:8px solid #FF3B1F;background:#1C1C20;font-size:28px}.pn{color:#FF3B1F}
.st-v{font-size:96px}.st.hi .st-v{color:#FF3B1F}.st-b{background:#26262B}.st-b i{background:#9A9AA2}.st.hi .st-b i{background:#FF3B1F}
.sharebox{border:3px solid #FF3B1F}.sh-h{color:#FF3B1F}`,
  },
  // 12. Calendar: delays, waits, deadlines, anniversaries.
  calendar: {
    tone: 'ink',
    cover: (s, d) => pageShell('calendar', `body{background:#E4DDD0;color:#1A1A1A}
.cal{position:absolute;left:150px;right:150px;top:70px;height:640px;background:#FBF8F1;box-shadow:0 26px 50px rgba(0,0,0,.25);border-radius:14px;overflow:hidden;transform:rotate(-2deg)}
.cal .hd{background:#D7261E;color:#fff;height:130px;display:flex;align-items:center;justify-content:center;font:400 64px Anton;letter-spacing:10px}
.rings{position:absolute;left:150px;right:150px;top:50px;display:flex;justify-content:space-around;transform:rotate(-2deg);z-index:2}.rings i{width:26px;height:60px;border-radius:13px;background:linear-gradient(#777,#333)}
.yr{font:400 300px/1 Anton;text-align:center;margin-top:30px;color:#1A1A1A}
.cap{font:700 26px 'Space Mono';text-align:center;letter-spacing:6px;color:#D7261E}
.torn{position:absolute;left:150px;right:150px;top:690px;height:40px;background:#FBF8F1;clip-path:polygon(0 0,100% 0,100% 40%,95% 100%,90% 30%,84% 90%,78% 20%,72% 100%,66% 35%,60% 95%,54% 25%,48% 100%,42% 30%,36% 90%,30% 20%,24% 100%,18% 35%,12% 90%,6% 25%,0 100%);transform:rotate(-2deg)}
.big{position:absolute;left:64px;right:64px;top:770px;height:200px;font:400 210px/1 Anton;white-space:nowrap;color:#D7261E;text-transform:uppercase}
.hook{position:absolute;left:64px;right:64px;top:990px;height:200px;font:italic 400 72px/1.02 'Instrument Serif'}
.ft2{position:absolute;left:64px;right:64px;bottom:44px;display:flex;justify-content:space-between;align-items:center;font:700 17px 'Space Mono'}.ft2 img{width:150px}`,
    `<div class="rings">${'<i></i>'.repeat(6)}</div><div class="cal"><div class="hd">${esc(s.calendarLabel || 'STILL PENDING')}</div><div class="yr">${esc(s.calendarYear || '')}</div><div class="cap">${esc(s.calendarCaption || '')}</div></div><div class="torn"></div>
<div class="big" data-fit data-min="90">${esc(d.big)}</div>
<div class="hook" data-fit data-min="34">${esc(d.hook)}</div>
<div class="ft2"><span>SOURCE · ${esc(s.source)}</span><span>SWIPE →</span><img src="${wm('ink')}"></div>`),
    css: `body{background:#FBF8F1;color:#1A1A1A}.hdr{background:#D7261E;color:#fff;position:absolute;top:0;left:0;right:0;padding:28px 64px}
h2{font:400 104px/0.95 Anton;text-transform:uppercase}.bd{font-family:'Instrument Serif';font-style:italic;font-weight:400;font-size:46px;line-height:1.1}
.pt{border:3px solid #1A1A1A;border-top:14px solid #D7261E;font-size:28px;background:#fff}.pn{color:#D7261E}
.st{border-bottom:3px solid #1A1A1A;padding-bottom:12px}.st.hi .st-v{color:#D7261E}.st-b{background:#E4DDD0}.st-b i{background:#1A1A1A}.st.hi .st-b i{background:#D7261E}
.sharebox{border-top:14px solid #D7261E;background:#fff;box-shadow:0 10px 30px rgba(0,0,0,.15)}`,
  },
  // 13. Highway: roads, travel, transport, safety.
  highway: {
    tone: 'paper',
    cover: (s, d) => pageShell('highway', `body{background:#2B2D30;color:#fff}
.lane{position:absolute;left:520px;top:0;bottom:0;width:40px;background:repeating-linear-gradient(180deg,#F2C200 0 90px,transparent 90px 170px);opacity:.9}
.edge{position:absolute;top:0;bottom:0;width:14px;background:#EDEDED}
.sign{position:absolute;left:70px;right:70px;top:110px;height:560px;background:#0B6E3B;border:10px solid #fff;border-radius:34px;box-shadow:0 0 0 6px #0B6E3B,0 30px 60px rgba(0,0,0,.5);padding:40px 50px;display:flex;flex-direction:column}
.sign .k{font:700 30px 'Space Mono';letter-spacing:6px;opacity:.9}
.big{flex:1;font:400 260px/1 'Archivo Black';letter-spacing:-8px;white-space:nowrap;display:flex;align-items:center;text-transform:uppercase}
.sign .s{font:700 34px/1.25 Manrope;height:90px;overflow:hidden}
.warn{position:absolute;left:70px;top:740px;width:220px;height:220px;transform:rotate(45deg);background:#F2C200;border:10px solid #111;border-radius:22px}
.warn b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transform:rotate(-45deg);font:400 150px Anton;color:#111}
.hook{position:absolute;left:340px;right:44px;top:720px;height:320px;padding:10px 20px;background:#2B2D30;font:700 64px/1.08 'Archivo Black';letter-spacing:-1px}
.ft2{position:absolute;left:64px;right:64px;bottom:44px;display:flex;justify-content:space-between;align-items:center;font:700 17px 'Space Mono'}.ft2 img{width:150px}`,
    `<div class="edge" style="left:20px"></div><div class="edge" style="right:20px"></div><div class="lane"></div>
<div class="sign"><span class="k">${esc(s.signLabel || 'ROAD SAFETY')}</span><div class="big" data-fit data-min="80">${esc(d.big)}</div><div class="s">${esc(d.sub)}</div></div>
<div class="warn"><b>!</b></div><div class="hook" data-fit data-min="34">${esc(d.hook)}</div>
<div class="ft2"><span>SOURCE · ${esc(s.source)}</span><span>SWIPE →</span><img src="${wm('paper')}"></div>`),
    css: `body{background:#2B2D30;color:#fff;background-image:linear-gradient(90deg,transparent 524px,#F2C200 524px,#F2C200 556px,transparent 556px);background-size:100% 170px}
.hdr{color:#F2C200}h2{font:400 92px/1 'Archivo Black';letter-spacing:-2px;background:#0B6E3B;border:6px solid #fff;border-radius:22px;padding:24px 30px;height:auto}
.bd{font-size:34px;background:#2B2D30}
.pt{background:#0B6E3B;border:4px solid #fff;border-radius:16px;font-size:28px}.pn{color:#F2C200}
.st{background:#2B2D30;border-bottom:3px dashed #F2C200;padding-bottom:12px}.st.hi .st-v{color:#F2C200}.st-b{display:none}
.sharebox{background:#F2C200;color:#111;border:8px solid #111;border-radius:22px}`,
  },
  // 14. Ballot paper: elections, voting, politics (non-partisan facts only).
  ballot: {
    tone: 'ink',
    cover: (s, d) => pageShell('ballot', `body{background:#F7F5EE;color:#1B1B1B}
.top{position:absolute;top:44px;left:56px;right:56px;border:4px solid #1B1B1B;padding:16px 24px;display:flex;justify-content:space-between;font:700 22px 'Space Mono';letter-spacing:3px}
.grid{position:absolute;left:56px;right:56px;top:140px}
.row{display:grid;grid-template-columns:90px 1fr 120px;height:92px;border:4px solid #1B1B1B;border-top:none}
.row span{border-right:4px solid #1B1B1B;display:flex;align-items:center;justify-content:center;font:700 30px 'Space Mono'}
.row div{padding:0 24px;display:flex;align-items:center;font:700 26px 'Space Mono';color:#555}
.row i{display:flex;align-items:center;justify-content:center;border-left:4px solid #1B1B1B}
.row i:after{content:'';width:46px;height:46px;border-radius:50%;border:4px solid #1B1B1B}
.row.on i:after{background:#5B2A86;border-color:#5B2A86}
.row:first-child{border-top:4px solid #1B1B1B}
.big{position:absolute;left:56px;right:56px;top:560px;height:320px;font:400 330px/1 Anton;white-space:nowrap;color:#5B2A86;text-transform:uppercase}
.hook{position:absolute;left:56px;right:56px;top:900px;height:260px;font:italic 400 76px/1.02 'Instrument Serif'}
.ft2{position:absolute;left:56px;right:56px;bottom:44px;display:flex;justify-content:space-between;align-items:center;font:700 17px 'Space Mono'}.ft2 img{width:150px}`,
    `<div class="top"><span>BALLOT · POSTR FACT</span><span>${esc(d.meta)}</span></div>
<div class="grid">${(d.stats.length ? d.stats : [['', '']]).slice(0, 4).map(([l, v], k, a) => `<div class="row${k === a.length - 1 ? ' on' : ''}"><span>${k + 1}</span><div>${esc(l)}${v ? ` · ${esc(v)}` : ''}</div><i></i></div>`).join('')}</div>
<div class="big" data-fit data-min="90">${esc(d.big)}</div>
<div class="hook" data-fit data-min="34">${esc(d.hook)}</div>
<div class="ft2"><span>SOURCE · ${esc(s.source)}</span><span>SWIPE →</span><img src="${wm('ink')}"></div>`),
    css: `body{background:#F7F5EE;color:#1B1B1B}.hdr{border:4px solid #1B1B1B;padding:12px 18px}.lbl{color:#5B2A86}
h2{font:400 100px/0.98 Anton;text-transform:uppercase}.bd{font-family:'Instrument Serif';font-style:italic;font-weight:400;font-size:46px;line-height:1.1}
.pts{gap:0}.pt{border:4px solid #1B1B1B;border-top:none;font-family:'Space Mono';font-size:25px}.pt:first-child{border-top:4px solid #1B1B1B}.pn{color:#5B2A86}
.st{border:4px solid #1B1B1B;padding:16px 22px}.st.hi .st-v{color:#5B2A86}.st-b{background:#E9E5DA}.st-b i{background:#1B1B1B}.st.hi .st-b i{background:#5B2A86}
.sharebox{border:6px solid #5B2A86}.sh-h{color:#5B2A86}`,
  },
  // 15. Lab report: health data, surveys, test results.
  labreport: {
    tone: 'ink',
    cover: (s, d) => pageShell('labreport', `body{background:#FFFFFF;color:#1B2430}
.hd{position:absolute;left:0;right:0;top:0;height:150px;background:#E8F0F7;border-bottom:4px solid #1B2430;display:flex;justify-content:space-between;align-items:center;padding:0 64px}
.hd b{font:800 40px Manrope;letter-spacing:-1px}.hd span{font:700 20px/1.5 'Space Mono';text-align:right}
.meta{position:absolute;left:64px;right:64px;top:176px;display:grid;grid-template-columns:1fr 1fr;font:400 22px/1.7 'Space Mono';color:#4A5563}
table{position:absolute;left:64px;top:300px;width:952px;border-collapse:collapse;font:400 23px 'Space Mono'}
th{background:#1B2430;color:#fff;text-align:left;padding:12px 14px;font-weight:700;letter-spacing:1px}
td{padding:14px;border-bottom:2px solid #D5DCE3}td.f{color:#D7261E;font-weight:700}td.v{font-weight:700}
.big{position:absolute;left:56px;right:56px;top:640px;height:250px;font:400 260px/1 Anton;white-space:nowrap;color:#D7261E;text-transform:uppercase}
.hook{position:absolute;left:64px;right:64px;top:910px;height:230px;font:800 58px/1.1 Manrope;letter-spacing:-1px}
.sig{position:absolute;right:64px;bottom:110px;font:italic 400 40px 'Instrument Serif';border-top:2px solid #1B2430;padding-top:6px}
.ft2{position:absolute;left:64px;right:64px;bottom:44px;display:flex;justify-content:space-between;align-items:center;font:700 17px 'Space Mono'}.ft2 img{width:150px}`,
    `<div class="hd"><b>POSTR DIAGNOSTICS</b><span>TEST REPORT<br>${esc(d.meta)}</span></div>
<div class="meta"><span>PATIENT: INDIA</span><span>SAMPLE: NATIONAL SURVEY</span></div>
<table><tr><th>TEST</th><th>RESULT</th><th>FLAG</th></tr>${d.stats.slice(0, 3).map(([l, v]) => `<tr><td>${esc(l)}</td><td class="v">${esc(v)}</td><td class="f">${esc(s.labFlag || 'HIGH')}</td></tr>`).join('')}</table>
<div class="big" data-fit data-min="90">${esc(d.big)}</div>
<div class="hook" data-fit data-min="30">${esc(d.hook)}</div>
<div class="sig">Postr Lab</div>
<div class="ft2"><span>SOURCE · ${esc(s.source)}</span><span>SWIPE →</span><img src="${wm('ink')}"></div>`),
    css: `body{background:#fff;color:#1B2430}.hdr{background:#E8F0F7;border-bottom:4px solid #1B2430;margin:0;position:absolute;top:0;left:0;right:0;padding:28px 64px}
h2{font:800 84px/1.02 Manrope;letter-spacing:-3px}.bd{font-family:'Space Mono';font-size:28px}
.pts{gap:0}.pt{border-bottom:2px solid #D5DCE3;font-family:'Space Mono';font-size:25px;padding-left:0}.pn{color:#D7261E}
.st{border-bottom:2px solid #D5DCE3;padding-bottom:12px}.st-l{color:#4A5563}.st.hi .st-v{color:#D7261E}.st-b{background:#E8F0F7}.st-b i{background:#1B2430}.st.hi .st-b i{background:#D7261E}
.sharebox{border:4px solid #1B2430;background:#E8F0F7}`,
  },
};

// ---------- COLLAGE (studio cut-out style) ----------
// story.collage = { plate, palette, strips:[3], note, cta, kicker, ai, who:{h,right,bottom}, arrow }
// plate = poster-engine/assets/plates/<plate>-alpha.png (background already removed).
const PALETTES = {
  yellow: { bg: '#F2B705', ink: '#111', strips: [['#111', '#F2B705'], ['#E8432E', '#111'], ['#F4F1EA', '#111']], hi: '#E8432E' },
  red: { bg: '#E8432E', ink: '#111', strips: [['#111', '#F4F1EA'], ['#F2B705', '#111'], ['#F4F1EA', '#111']], hi: '#111' },
  cream: { bg: '#EAE3D2', ink: '#111', strips: [['#111', '#EAE3D2'], ['#E8432E', '#F4F1EA'], ['#F2B705', '#111']], hi: '#E8432E' },
  violet: { bg: '#B9A6E8', ink: '#111', strips: [['#111', '#B9A6E8'], ['#F4F1EA', '#111'], ['#E8432E', '#111']], hi: '#5B2A86' },
  mint: { bg: '#8FD6B4', ink: '#111', strips: [['#111', '#8FD6B4'], ['#F4F1EA', '#111'], ['#E8432E', '#111']], hi: '#E8432E' },
};
const plateCache = {};
const plate = (name) => {
  if (!plateCache[name]) plateCache[name] = `data:image/png;base64,${fs.readFileSync(path.join(__dirname, '..', 'assets', 'plates', `${name}-alpha.png`)).toString('base64')}`;
  return plateCache[name];
};
const CRUMPLE = (op = 0.55) => `<svg class="crumple" style="position:absolute;inset:0;mix-blend-mode:multiply;opacity:${op};pointer-events:none" width="1080" height="1350"><filter id="cr"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="5" seed="7"/><feDiffuseLighting lighting-color="#fff" surfaceScale="9"><feDistantLight azimuth="235" elevation="48"/></feDiffuseLighting></filter><rect width="100%" height="100%" filter="url(#cr)"/></svg>
<svg style="position:absolute;inset:0;mix-blend-mode:multiply;opacity:.16;pointer-events:none" width="1080" height="1350"><filter id="gr"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#gr)"/></svg>`;
// Torn edges for .torn elements and width-fitting for .strip.
const TORN = `<script>
document.querySelectorAll('.torn').forEach((el,k)=>{const p=[];const n=34;let s=11+k*7;const r=()=>{s=(s*9301+49297)%233280;return s/233280};
for(let i=0;i<=n;i++)p.push((i/n*100).toFixed(2)+'% '+(r()*6).toFixed(2)+'%');
for(let i=n;i>=0;i--)p.push((i/n*100).toFixed(2)+'% '+(100-r()*6).toFixed(2)+'%');
el.style.clipPath='polygon('+p.join(',')+')';});
document.querySelectorAll('.strip').forEach(el=>{const max=+el.dataset.max||980;let f=parseFloat(getComputedStyle(el).fontSize);while(el.getBoundingClientRect().width>max&&f>40){f-=2;el.style.fontSize=f+'px';}});
</script>`;
const STICKER = 'filter:grayscale(1) contrast(1.15) brightness(1.03) drop-shadow(7px 0 0 #fff) drop-shadow(-7px 0 0 #fff) drop-shadow(0 7px 0 #fff) drop-shadow(0 -7px 0 #fff) drop-shadow(14px 22px 26px rgba(0,0,0,.35))';

function collageCfg(s) {
  const c = s.collage || {};
  return { ...c, P: PALETTES[c.palette] || PALETTES.yellow, who: { h: 1000, right: -120, bottom: -40, ...(c.who || {}) } };
}

STYLES.collage = {
  tone: 'ink',
  cover: (s, d) => {
    const c = collageCfg(s);
    const P = c.P;
    const strips = (c.strips || [d.big, d.hook]).slice(0, 3);
    const tops = [150, 290, 428];
    const stripCss = strips.map((_, k) => `.s${k}{left:${[46, 70, 58][k]}px;top:${tops[k]}px;background:${P.strips[k][0]};color:${P.strips[k][1]};${k === 2 ? 'font-size:92px;' : ''}}`).join('');
    return pageShell('collage', `body{background:${P.bg};color:${P.ink}}
.who{position:absolute;right:${c.who.right}px;bottom:${c.who.bottom}px;height:${c.who.h}px;${STICKER}}
.strip{position:absolute;padding:6px 26px 2px;font:400 128px/1 Anton;letter-spacing:-1px;text-transform:uppercase;white-space:nowrap;transform:rotate(-4deg);transform-origin:left center}
${stripCss}
.kick{position:absolute;top:58px;left:60px;right:60px;display:flex;justify-content:space-between;align-items:flex-start;font:700 17px/1.4 'Space Mono';letter-spacing:2px;text-transform:uppercase}
.kick img{width:120px}
.note{position:absolute;left:62px;top:720px;width:${c.noteW || 340}px;font:italic 400 46px/1.04 'Instrument Serif'}
.arrow{position:absolute;left:250px;top:850px;width:470px;transform:rotate(-14deg)}
.foot{position:absolute;left:60px;bottom:56px;width:360px;font:700 14px/1.5 'Space Mono';letter-spacing:1.5px;text-transform:uppercase}
.foot b{display:inline-block;margin-top:14px;background:#111;color:${P.bg};padding:10px 16px;font-size:17px;letter-spacing:3px}
${c.band ? `.bandp{position:absolute;left:-30px;right:-30px;top:${c.band.top || 950}px;height:520px;background:#F4F1EA;transform:rotate(-2deg);box-shadow:0 -14px 34px rgba(0,0,0,.22)}
.note{top:${(c.band.top || 950) + 52}px;width:940px;font-size:54px}.foot{width:940px}` : ''}`,
    `${CRUMPLE()}
<img class="who" src="${plate(c.plate)}">
<div class="kick"><span>POSTR FILES · ${esc(c.kicker || d.meta)}<br>${esc(s.date || '')}</span><img src="${wm('ink')}"></div>
${strips.map((t, k) => `<div class="strip torn s${k}" data-max="${k === 2 ? 940 : k === 0 ? 880 : 990}">${esc(t)}</div>`).join('')}
${c.band ? '<div class="bandp torn"></div>' : ''}${c.note ? `<div class="note">${esc(c.note)}</div>` : ''}
${c.arrow ? `<svg class="arrow" viewBox="0 0 330 160"><path d="M8 40 C 90 140, 210 150, 300 70" fill="none" stroke="#111" stroke-width="6" stroke-linecap="round"/><path d="M262 58 L304 66 L292 106" fill="none" stroke="#111" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
<div class="foot">SOURCE · ${esc(c.sourceShort || s.source)}${c.ai !== false ? '<br>AI ILLUSTRATION' : ''}<br><b>SWIPE: ${esc(c.cta || 'THE FULL STORY')} →</b></div>${TORN}`);
  },
  css: '', // built per story in collageInner
};

function collageInner(story, sl, i, total) {
  const c = collageCfg(story);
  const P = c.P;
  const last = i === total;
  const css = `body{background:${P.bg};color:${P.ink}}
.hdr{font-size:19px}.lbl{background:#111;color:${P.bg};padding:6px 14px}.pgn{background:#F4F1EA;padding:6px 12px}
h2{top:150px;height:330px;font:400 92px/1.08 Anton;text-transform:uppercase;transform:rotate(-2.5deg);transform-origin:left bottom}
h2 .hl{background:#111;color:${P.bg};padding:4px 18px;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.bd{top:540px;background:#F4F1EA;padding:34px 38px;font:italic 400 48px/1.15 'Instrument Serif';transform:rotate(1.2deg);box-shadow:0 14px 30px rgba(0,0,0,.18)}
.bd+.cnt{top:820px}
.pt{background:#F4F1EA;box-shadow:0 10px 22px rgba(0,0,0,.16);font-size:31px}.pt:nth-child(odd){transform:rotate(-1.2deg)}.pt:nth-child(even){transform:rotate(1deg)}
.pn{color:${P.hi === '#111' ? '#E8432E' : P.hi}}
.stats{background:#F4F1EA;padding:34px 36px;box-shadow:0 14px 30px rgba(0,0,0,.18);transform:rotate(-1deg)}
.st{border-bottom:2px dashed #111;padding-bottom:14px}.st:last-child{border-bottom:0}.st.hi .st-v{color:${P.hi === '#111' ? '#E8432E' : P.hi}}
.st-b{background:rgba(17,17,17,.12)}.st-b i{background:#111}.st.hi .st-b i{background:${P.hi === '#111' ? '#E8432E' : P.hi}}
.snote{background:#111;color:${P.bg};display:inline-block;padding:6px 12px;align-self:flex-start}
.sharebox{background:#F4F1EA;box-shadow:0 14px 30px rgba(0,0,0,.18);transform:rotate(-1.5deg);width:600px}.sh-h{font-size:88px;color:${P.hi === '#111' ? '#E8432E' : P.hi}}.sh-acts{flex-wrap:wrap}
.ft{font-size:15px}.ft span:first-child{max-width:520px}.sw{background:#111;color:${P.bg};padding:8px 14px}
.who2{position:absolute;right:-160px;bottom:-60px;height:900px;${STICKER}}
${last ? '.cnt{right:420px}h2{right:300px}.ft img,.ft .sw{display:none}' : ''}`;
  let html = inner(story, sl, i, total, { tone: 'ink', meta: c.kicker || '' })
    .replace(/<h2 data-fit data-min="40">([\s\S]*?)<\/h2>/, '<h2 data-fit data-min="40"><span class="hl">$1</span></h2>');
  html = `${CRUMPLE(0.45)}${last ? `<img class="who2" src="${plate(c.plate)}">` : ''}${html}`;
  return pageShell('collage', `${INNER_BASE}${css}`, html);
}

const ORDER = ['extra', 'exposed','feed', 'swiss', 'dossier', 'forward', 'riso', 'scoreboard', 'passbook', 'pharmacy', 'headcount', 'calendar', 'highway', 'ballot', 'labreport'];
const RULES = [
  ['passbook', (s) => /unclaimed|deposit|passbook|savings|refund|pf-|epf/i.test(`${(s.tags || []).join(' ')} ${s.id}`)],
  ['pharmacy', (s) => /medicine|drug|cdsco|pharma|tablet/i.test(`${(s.tags || []).join(' ')} ${s.id}`)],
  ['highway', (s) => /road|highway|traffic|accident|helmet/i.test(`${(s.tags || []).join(' ')} ${s.id}`)],
  ['ballot', (s) => /election|mp|mla|vote|ballot|democracy/i.test(`${(s.tags || []).join(' ')} ${s.id}`)],
  ['labreport', (s) => /anaemia|nfhs|survey|blood|diabetes/i.test(`${(s.tags || []).join(' ')} ${s.id}`)],
  ['calendar', (s) => /pending|years|court|delay|backlog/i.test(`${(s.tags || []).join(' ')} ${s.id}`)],
  ['forward', (s) => s.format === 'myth'],
  ['scoreboard', (s) => /cricket|t20|odi|ipl|football|hockey|olymp|sport|chase/i.test(`${(s.tags || []).join(' ')} ${s.id}`)],
  ['exposed', (s) => /scam|fraud|markup|medicine|overcharg|atm|fee|lpg|aadhaar|digital-arrest/i.test(`${(s.tags || []).join(' ')} ${s.id}`)],
  ['feed', (s) => /sensex|nifty|stock|market|rupee|dollar|kospi|sip|crude|brent|gold|silver|petrol|inflation|rbi|emi|imf|gdp/i.test(`${(s.tags || []).join(' ')} ${s.id}`)],
  ['dossier', (s) => /hormuz|war|attack|black ?sea|missile|world|ship|navy|border/i.test(`${(s.tags || []).join(' ')} ${s.id}`)],
  ['riso', (s) => /health|mental|ageing|family|education|women|wellness/i.test(`${(s.tags || []).join(' ')} ${s.id}`)],
  ['swiss', (s) => s.format === 'number' || /climate|wildlife|himalaya|planet/i.test(`${(s.tags || []).join(' ')} ${s.id}`)],
  ['extra', (s) => s.format === 'alert'],
];

// Pick a style; avoid repeating the previous post's style.
function pickStyle(story, prev) {
  if (story.style && STYLES[story.style]) return story.style;
  const hits = RULES.filter(([, f]) => f(story)).map(([n]) => n);
  const fallback = ORDER[[...story.id].reduce((a, c) => a + c.charCodeAt(0), 0) % ORDER.length];
  const choices = [...new Set([...hits, fallback, ...ORDER])];
  return choices.find((c) => c !== prev) || choices[0];
}

function labPages(story, style) {
  const st = STYLES[style];
  const d = coverData(story);
  const slides = story.slides || [];
  const total = slides.length + 1;
  const pages = [st.cover(story, d)];
  if (style === 'collage') {
    slides.forEach((sl, k) => pages.push(collageInner(story, sl, k + 2, total)));
    return pages;
  }
  slides.forEach((sl, k) => pages.push(pageShell(style, `${INNER_BASE}${st.css}`, inner(story, sl, k + 2, total, { tone: st.tone, deco: st.deco, meta: d.meta }))));
  return pages;
}

module.exports = { labPages, pickStyle, STYLES: ORDER };
