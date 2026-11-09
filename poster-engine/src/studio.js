// Studio style: template-studio editorial layouts (paper, black, one orange accent, real photography,
// outline frames, × marks, vertical type, CTA bars). Every page of a carousel uses a different layout.
// story.studio = { photos: ['ph-cash', 'ph-note500', ...], file: '#01', series: 'BLACK MONEY FILES' }
// Photos live in poster-engine/assets/plates/<name>.jpg (or .png).
const fs = require('fs');
const path = require('path');

const A = path.join(__dirname, '..', 'assets');
const FONTS = 'https://fonts.googleapis.com/css2?family=Anton&family=Instrument+Serif:ital@0;1&family=Space+Mono:wght@400;700&family=Manrope:wght@500;600;700;800&display=block';
const OR = '#FF5B14';
const INK = '#0E0E0E';
const PAPER = '#F3EFE8';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mark = (t) => esc(t).replace(/\*(.+?)\*/g, '<em>$1</em>');
const pad = (n) => String(n).padStart(2, '0');
const cache = {};
const wm = (tone) => (cache[`wm-${tone}`] ||= `data:image/svg+xml;base64,${fs.readFileSync(path.join(A, `postr-wordmark-${tone}.svg`)).toString('base64')}`);
function photo(name) {
  if (!name) return '';
  if (!cache[name]) {
    const dir = path.join(A, 'plates');
    const f = ['.jpg', '.png'].map((e) => path.join(dir, name + e)).find((p) => fs.existsSync(p));
    if (!f) throw new Error(`studio photo missing: ${name}`);
    cache[name] = `data:image/${f.endsWith('.png') ? 'png' : 'jpeg'};base64,${fs.readFileSync(f).toString('base64')}`;
  }
  return cache[name];
}

const FIT = `<script>window.__fit=()=>{let bad=0;document.querySelectorAll('[data-fit]').forEach(el=>{let px=parseFloat(getComputedStyle(el).fontSize);const min=+(el.dataset.min||30);let g=0;const over=()=>el.scrollHeight>el.clientHeight+Math.max(4,px*.3)||el.scrollWidth>el.clientWidth+16;while(over()&&px>min&&g++<300){px-=2;el.style.fontSize=px+'px';}if(over())bad++;});return bad;};</script>`;

const BASE = `*{margin:0;padding:0;box-sizing:border-box}html,body{width:1080px;height:1350px}body{position:relative;overflow:hidden;font-family:Manrope,sans-serif;-webkit-font-smoothing:antialiased;background:${PAPER};color:${INK}}
.ph{position:absolute;background-size:cover;background-position:center;filter:contrast(1.08) saturate(.85)}
.x{position:absolute;font:500 34px/1 Manrope;color:${OR}}.o{position:absolute;width:22px;height:22px;border:3px solid ${OR};border-radius:50%}
.top{position:absolute;top:52px;left:64px;right:64px;display:flex;justify-content:space-between;font:700 18px 'Space Mono';letter-spacing:3px;text-transform:uppercase;z-index:20}
.top b{color:${OR}}
.bot{position:absolute;bottom:46px;left:64px;right:64px;display:flex;justify-content:space-between;align-items:center;gap:30px;font:700 15px/1.4 'Space Mono';letter-spacing:1.5px;text-transform:uppercase;z-index:20}
.bot span{max-width:640px}.bot img{width:132px}
.vt{position:absolute;writing-mode:vertical-rl;transform:rotate(180deg);font:700 15px 'Space Mono';letter-spacing:6px;text-transform:uppercase;z-index:20}
.kick{display:inline-block;align-self:flex-start;font:700 20px 'Space Mono';letter-spacing:4px;text-transform:uppercase;margin-bottom:30px}
.hd{font-weight:800;letter-spacing:-.035em;line-height:1.12}
.hd em{font-style:normal}
body .hd.big{font-size:190px;line-height:.95;letter-spacing:-.05em}
.grain{position:absolute;inset:0;pointer-events:none;z-index:60;opacity:.32;mix-blend-mode:overlay;background:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
.cm{position:absolute;width:26px;height:26px;z-index:61;border-color:rgba(128,128,128,.55);border-style:solid;border-width:0}
.cm.a{left:22px;top:22px;border-left-width:1.5px;border-top-width:1.5px}.cm.b{right:22px;top:22px;border-right-width:1.5px;border-top-width:1.5px}
.cm.c{left:22px;bottom:22px;border-left-width:1.5px;border-bottom-width:1.5px}.cm.d{right:22px;bottom:22px;border-right-width:1.5px;border-bottom-width:1.5px}
.sf{font-family:'Instrument Serif',serif!important;font-style:italic!important;font-weight:400!important;letter-spacing:-.01em!important}
.duo{position:absolute;overflow:hidden}.duo div{position:absolute;inset:0;background-size:cover;background-position:center;filter:grayscale(1) contrast(1.3) brightness(1.06)}.duo::after{content:'';position:absolute;inset:0;background:${OR};mix-blend-mode:multiply}
.bw{filter:grayscale(1) contrast(1.22) brightness(1.02)!important}
.tape{position:absolute;width:150px;height:44px;background:rgba(243,239,232,.78);box-shadow:0 2px 6px rgba(0,0,0,.12);z-index:5}`;

const shell = (css, body) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}"><style>${BASE}${css}</style></head><body>${body}<div class="grain"></div><i class="cm a"></i><i class="cm b"></i><i class="cm c"></i><i class="cm d"></i>${FIT}</body></html>`;
const chrome = (c, dark) => `<div class="top" style="color:${dark ? '#fff' : INK}"><span>POSTR FILES · <b>${esc(c.series)} ${esc(c.file)}</b></span><span>${pad(c.i)} / ${pad(c.total)}</span></div>
<div class="bot" style="color:${dark ? 'rgba(255,255,255,.7)' : 'rgba(14,14,14,.65)'}"><span>SOURCE · ${esc(c.source)}</span><img src="${wm(dark ? 'paper' : 'ink')}"></div>`;
const isBig = (t) => String(t || '').replace(/\*/g, '').trim().split(/\s+/).length <= 5;
const kick = (sl, color, bg) => (sl.title || sl.label) ? `<div class="kick" style="color:${color};${bg ? `background:${bg};padding:8px 16px;` : ''}">${esc(sl.title || sl.label)}</div>` : '';

// ---------- layouts ----------
const L = {};

L.cover = (s, c) => {
  const st = s.collage || {};
  const [a, b, d] = st.strips || [s.coverBig, s.headline, ''];
  return shell(`
.cv-ph{left:220px;top:0;width:860px;height:880px}
.cv-sq{position:absolute;left:64px;top:150px;width:270px;height:270px;border:4px solid ${INK};padding:26px;display:flex;flex-direction:column;justify-content:space-between;background:${PAPER};box-shadow:14px 14px 0 ${OR}}
.cv-sq b{font:800 76px/0.95 Manrope;color:${OR};letter-spacing:-.04em}.cv-sq span{font:700 17px/1.35 'Space Mono';letter-spacing:3px;text-transform:uppercase}
.cv-a{position:absolute;left:0;top:600px;max-width:1000px;background:${OR};color:#fff;padding:22px 44px 26px 64px;font:800 104px/1 Manrope;letter-spacing:-.045em;white-space:nowrap}
.cv-b{position:absolute;left:0;top:740px;max-width:960px;background:${INK};color:#fff;padding:18px 40px 20px 64px;font:800 50px/1.05 Manrope;letter-spacing:-.03em;white-space:nowrap}
.cv-d{position:absolute;left:64px;top:930px;font:700 22px 'Space Mono';letter-spacing:4px;color:${OR};text-transform:uppercase}
.cv-n{position:absolute;left:64px;top:975px;width:660px;height:170px;font:italic 400 66px/1.02 'Instrument Serif';letter-spacing:-.01em}
.cv-cta{position:absolute;right:64px;top:1000px;background:${INK};color:#fff;font:800 24px Manrope;letter-spacing:2px;padding:22px 30px;text-transform:uppercase}
.cv-top{position:absolute;top:52px;left:64px;font:700 18px 'Space Mono';letter-spacing:3px;text-transform:uppercase}`,
  `<div class="ph cv-ph" style="background-image:url(${photo(c.photos[0])})"></div>
<div class="cv-top">POSTR FILES</div>
<div class="cv-sq"><b>FILE<br>${esc(c.file)}</b><span>${esc(c.series)}</span></div>
<div class="cv-a" data-fit data-min="56">${esc(a)}</div>
<div class="cv-b" data-fit data-min="30">${esc(b)}</div>
<div class="cv-d">${esc(d)}</div>
<div class="cv-n" data-fit data-min="28">${esc(st.note || s.note || '')}</div>
<div class="cv-cta">Swipe the file →</div>
<span class="x" style="left:120px;top:520px">×</span><span class="x" style="left:1000px;top:930px">×</span><span class="o" style="left:980px;top:1090px"></span><span class="o" style="left:150px;top:470px;border-color:${INK}"></span>
<div class="bot" style="color:rgba(14,14,14,.65)"><span>SOURCE · ${esc(c.source)}</span><img src="${wm('ink')}"></div>`);
};

// Orange page, giant black type, white-on-black highlights.
L.orange = (sl, c) => shell(`body{background:${OR}}
.t{position:absolute;left:64px;right:150px;top:190px;bottom:180px;display:flex;flex-direction:column;justify-content:center}
.t .hd{font-size:104px;color:${INK};max-height:900px;overflow:hidden}
.t .hd em{font-family:'Instrument Serif';font-style:italic;font-weight:400;letter-spacing:-.01em;color:#fff;font-size:1.1em}
.ht{position:absolute;inset:0;background:radial-gradient(rgba(14,14,14,.22) 1.6px,transparent 1.9px) 0 0/15px 15px;-webkit-mask-image:linear-gradient(135deg,transparent 45%,#000 95%)}
.num{position:absolute;right:30px;bottom:90px;font:400 440px/0.8 Anton;color:transparent;-webkit-text-stroke:3px rgba(14,14,14,.22)}`,
`<div class="ht"></div>${chrome(c, false)}<div class="num">${pad(c.i)}</div><div class="vt" style="right:40px;top:300px;color:${INK}">${esc(c.series)} — ${esc(c.file)}</div>
<div class="t">${kick(sl, INK)}<div class="hd${isBig(sl.body) ? ' big' : ''}" data-fit data-min="40">${mark(sl.body)}</div></div>
<span class="x" style="left:64px;top:1150px;color:${INK}">×</span><span class="x" style="left:120px;top:1150px;color:${INK}">×</span>`);

// Full-bleed photo with dark fade and white type.
L.photo = (sl, c, p) => shell(`body{background:${INK}}
.fade{position:absolute;inset:0;background:linear-gradient(to top,rgba(14,14,14,.96) 38%,rgba(14,14,14,.55) 62%,rgba(14,14,14,.15))}
.t{position:absolute;left:64px;right:64px;bottom:150px;height:640px;display:flex;flex-direction:column;justify-content:flex-end}
.t .hd{font-size:92px;color:#fff;max-height:560px;overflow:hidden}.t .hd em{color:${OR};font-family:'Instrument Serif';font-style:italic;font-weight:400;letter-spacing:-.01em;font-size:1.12em}`,
`<div class="ph" style="inset:0;background-image:url(${photo(p)})"></div><div class="fade"></div>${chrome(c, true)}
<div class="t">${kick(sl, INK, OR)}<div class="hd${isBig(sl.body) ? ' big' : ''}" data-fit data-min="40">${mark(sl.body)}</div></div>`);

// Paper page with a framed print photo, black type, orange block highlights.
L.print = (sl, c, p) => shell(`
.fr{position:absolute;right:80px;top:150px;width:390px;height:470px;background:#fff;padding:18px 18px 70px;box-shadow:0 24px 50px rgba(0,0,0,.18);transform:rotate(3deg)}
.fr div{width:100%;height:100%;background-size:cover;background-position:center;filter:grayscale(.2) contrast(1.1)}
.sq{position:absolute;right:40px;top:120px;width:390px;height:470px;border:4px solid ${OR}}
.t{position:absolute;left:64px;right:64px;top:660px;bottom:150px;display:flex;flex-direction:column;justify-content:flex-start}
.t .hd{font-size:88px;max-height:480px;overflow:hidden}.t .hd em{background:${OR};box-shadow:7px 0 0 ${OR},-7px 0 0 ${OR}}`,
`${chrome(c, false)}<div class="sq"></div><div class="fr"><div style="background-image:url(${photo(p)})"></div></div><div class="tape" style="right:300px;top:130px;transform:rotate(-24deg)"></div><div class="tape" style="right:50px;top:580px;transform:rotate(-20deg)"></div>
<div class="vt" style="left:40px;top:180px;color:${OR}">POSTR // ${esc(c.file)}</div>
<div class="t">${kick(sl, OR)}<div class="hd${isBig(sl.body) ? ' big' : ''}" data-fit data-min="38">${mark(sl.body)}</div></div>
<span class="x" style="left:110px;top:200px">×</span><span class="x" style="left:170px;top:200px">×</span><span class="o" style="left:110px;top:270px"></span>`);

// Black page with an orange diagonal and a giant word.
L.split = (sl, c) => shell(`body{background:${INK}}
.dg{position:absolute;inset:0;background:${OR};clip-path:polygon(0 70%,100% 46%,100% 100%,0 100%)}
.t{position:absolute;left:64px;right:64px;top:170px;height:560px;display:flex;flex-direction:column;justify-content:center}
.t .hd{font-size:90px;color:#fff;max-height:480px;overflow:hidden}.t .hd em{color:${OR};font-family:'Instrument Serif';font-style:italic;font-weight:400;letter-spacing:-.01em;font-size:1.12em}
.w{position:absolute;left:50px;right:50px;bottom:140px;height:300px;font:400 280px/1 Anton;color:${INK};text-transform:uppercase;letter-spacing:-2px;white-space:nowrap;overflow:hidden;display:flex;align-items:flex-end}`,
`<div class="dg"></div>${chrome(c, true)}
<div class="t"><div class="hd${isBig(sl.body) ? ' big' : ''}" data-fit data-min="40">${mark(sl.body)}</div></div>
<div class="w" data-fit data-min="80">${esc(sl.title || sl.label || c.file)}</div>`);

// Paper page, giant orange quote mark, editorial statement.
L.quote = (sl, c) => shell(`
.q{position:absolute;left:44px;top:110px;font:800 420px/1 Manrope;color:${OR}}
.t{position:absolute;left:64px;right:110px;top:470px;bottom:250px;display:flex;flex-direction:column;justify-content:flex-start}
.t .hd{font-size:80px;font-weight:700;max-height:560px;overflow:hidden}
.t .hd em{font-weight:800;background:linear-gradient(transparent 64%,${OR} 64%,${OR} 94%,transparent 94%)}
.by{position:absolute;left:64px;bottom:170px;display:flex;align-items:center;gap:20px;font:700 20px 'Space Mono';letter-spacing:4px;color:${OR};text-transform:uppercase}
.by i{display:block;width:90px;height:3px;background:${OR}}`,
`${chrome(c, false)}<div class="q">“</div><div class="vt" style="right:40px;top:420px;color:${INK}">${esc(sl.label || '')}</div>
<div class="t"><div class="hd${isBig(sl.body) ? ' big' : ''}" data-fit data-min="38">${mark(sl.body)}</div></div>
<div class="by"><i></i>${esc(sl.title || 'Postr Files')}</div>`);

// Black page with repeated outline words behind a paper card.
L.urban = (sl, c) => {
  const w = esc((c.ghost || 'BLACK MONEY').split('|').join(' '));
  return shell(`body{background:${INK}}
.bg{position:absolute;left:-40px;top:120px;width:1300px;font:400 210px/0.9 Anton;color:transparent;-webkit-text-stroke:2px rgba(255,91,20,.35);text-transform:uppercase;white-space:nowrap}
.bg div:nth-child(even){margin-left:-260px}
.card{position:absolute;left:80px;right:80px;top:360px;height:640px;background:${PAPER};padding:70px 56px 56px;box-shadow:0 30px 60px rgba(0,0,0,.4)}
.tab{position:absolute;left:56px;top:-26px;background:${OR};color:${INK};font:700 20px 'Space Mono';letter-spacing:4px;padding:12px 20px;text-transform:uppercase}
.card .hd{font-size:84px;height:100%;overflow:hidden}.card .hd em{background:${OR};box-shadow:7px 0 0 ${OR},-7px 0 0 ${OR}}`,
  `<div class="bg">${Array.from({ length: 7 }, () => `<div>${w} ${w} ${w}</div>`).join('')}</div>${chrome(c, true)}
<div class="card"><div class="tab">${esc(sl.title || sl.label)}</div><div class="hd${isBig(sl.body) ? ' big' : ''}" data-fit data-min="38">${mark(sl.body)}</div></div>
<span class="x" style="left:930px;top:1060px">×</span><span class="o" style="left:90px;top:1080px"></span>`);
};

// Photo strip left, numbered list right.
L.list = (sl, c, p) => shell(`
.st{left:0;top:0;width:380px;height:1350px}
.r{position:absolute;left:440px;right:64px;top:150px;bottom:150px;display:flex;flex-direction:column}
.r h2{font:800 60px/1.05 Manrope;letter-spacing:-.03em;height:200px;overflow:hidden;margin-bottom:30px}
.li{display:flex;gap:24px;align-items:flex-start;padding:24px 0;border-top:2px solid rgba(14,14,14,.14)}
.li b{font:400 64px/0.9 Anton;color:${OR};min-width:70px}.li span{font:600 30px/1.32 Manrope}
.lbl{position:absolute;left:0;top:1060px;background:${OR};color:${INK};font:700 20px 'Space Mono';letter-spacing:4px;padding:14px 22px;text-transform:uppercase}`,
`<div class="duo" style="left:0;top:0;width:380px;height:1350px"><div style="background-image:url(${photo(p)})"></div></div><div class="lbl">${esc(sl.label)}</div>
<div class="top" style="left:440px"><span><b>${esc(c.file)}</b></span><span>${pad(c.i)} / ${pad(c.total)}</span></div>
<div class="r"><h2 data-fit data-min="34">${esc(sl.title)}</h2>${(sl.points || []).map((t, k) => `<div class="li"><b>${pad(k + 1)}</b><span>${esc(t)}</span></div>`).join('')}</div>
<div class="bot" style="left:440px;color:rgba(14,14,14,.65)"><span>SOURCE · ${esc(c.source)}</span><img src="${wm('ink')}"></div>`);

// Black header block + data rows with orange bars.
L.stats = (sl, c) => {
  const max = Math.max(...sl.stats.map((x) => (typeof x.num === 'number' ? x.num : 0)));
  return shell(`
.hb{position:absolute;left:0;right:0;top:0;height:470px;background:${INK};color:#fff;padding:150px 64px 0}
.hb h2{font:800 76px/1.04 Manrope;letter-spacing:-.035em;height:230px;overflow:hidden}
.rows{position:absolute;left:64px;right:64px;top:530px;bottom:200px;display:flex;flex-direction:column;justify-content:space-around}
.rw{display:grid;grid-template-columns:1fr auto;align-items:end;gap:8px 20px;border-bottom:2px solid rgba(14,14,14,.12);padding-bottom:18px}
.rw span{font:700 22px/1.3 'Space Mono';letter-spacing:1px;text-transform:uppercase}.rw b{font:800 78px/1 Manrope;letter-spacing:-.04em;white-space:nowrap}
.rw.hi b{color:${OR}}.bar{grid-column:1/3;height:12px;background:rgba(14,14,14,.08)}.bar i{display:block;height:100%;background:${INK}}.rw.hi .bar i{background:${OR}}
.nt{position:absolute;left:64px;bottom:130px;background:${OR};font:700 18px 'Space Mono';letter-spacing:3px;padding:10px 16px}`,
  `${chrome(c, true).replace(/<div class="bot"[\s\S]*$/, '')}<div class="hb">${kick(sl, OR)}<h2 data-fit data-min="40">${esc(sl.title)}</h2></div>
<div class="rows">${sl.stats.map((x) => `<div class="rw${x.hi ? ' hi' : ''}"><span>${esc(x.label)}</span><b>${esc(x.value)}</b>${max > 0 && typeof x.num === 'number' ? `<div class="bar"><i style="width:${Math.max(3, (x.num / max) * 100)}%"></i></div>` : ''}</div>`).join('')}</div>
${sl.statsNote ? `<div class="nt">${esc(sl.statsNote)}</div>` : ''}
<div class="bot" style="color:rgba(14,14,14,.65)"><span>SOURCE · ${esc(c.source)}</span><img src="${wm('ink')}"></div>`);
};

// Photo top, orange title tab, body copy on black.
L.body = (sl, c, p) => shell(`body{background:${INK};color:#fff}
.tp{left:0;top:0;width:1080px;height:610px}
.tt{position:absolute;left:0;top:540px;max-width:960px;background:${OR};color:${INK};padding:24px 40px 26px 64px;font:800 60px/1.06 Manrope;letter-spacing:-.03em;max-height:200px;overflow:hidden}
.bd{position:absolute;left:64px;right:110px;top:800px;bottom:160px;font:500 40px/1.42 Manrope;color:rgba(255,255,255,.92);overflow:hidden}`,
`<div class="ph tp bw" style="background-image:url(${photo(p)})"></div>${chrome(c, true).replace('class="top"', 'class="top" style="text-shadow:0 1px 8px rgba(0,0,0,.6)"')}
<div class="tt" data-fit data-min="34">${esc(sl.title)}</div><div class="bd" data-fit data-min="26">${esc(sl.body)}</div>
<div class="vt" style="right:40px;top:820px;color:${OR}">${esc(sl.label)}</div>`);

// Big reveal: giant words filled with the photograph.
L.reveal = (sl, c, p) => shell(`body{background:${INK}}
.rk{position:absolute;left:64px;top:190px;font:700 22px 'Space Mono';letter-spacing:5px;color:${OR};text-transform:uppercase}
.rv{position:absolute;left:50px;right:50px;top:250px;height:820px;font:800 250px/0.88 Manrope;letter-spacing:-.06em;background:url(${photo(p)}) center/cover;-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:1.5px rgba(255,255,255,.35);display:flex;align-items:center;overflow:hidden}
.rv em{font-style:normal}
.rl{position:absolute;left:64px;right:64px;top:1110px;height:3px;background:${OR}}`,
`${chrome(c, true)}<div class="rk">${esc(sl.title || sl.label)}</div><div class="rv" data-fit data-min="90">${mark(sl.body)}</div><div class="rl"></div>`);

// Follow page.
L.share = (sl, c) => shell(`body{background:${OR}}
.f{position:absolute;left:64px;right:64px;top:170px;font:800 150px/0.92 Manrope;letter-spacing:-.055em;color:${INK}}
.fl{position:absolute;left:64px;right:64px;top:660px;font:700 24px/1.5 'Space Mono';letter-spacing:3px;text-transform:uppercase}
.btn{position:absolute;left:64px;top:800px;background:${INK};color:#fff;font:800 50px Manrope;letter-spacing:-.02em;padding:28px 44px}
.acts{position:absolute;left:64px;top:960px;display:flex;gap:16px}.acts span{border:3px solid ${INK};font:700 20px 'Space Mono';letter-spacing:3px;padding:12px 20px}
.sb{position:absolute;left:64px;right:64px;top:1060px;font:600 30px/1.35 Manrope}`,
`${chrome(c, false)}<div class="f">Follow<br>the<br>files.</div>
<div class="fl">${esc(sl.followLine || 'New files every week.')}</div><div class="btn">@postr.news</div>
<div class="acts"><span>SAVE</span><span>SEND</span><span>FOLLOW</span></div><div class="sb">${esc(sl.body || '')}</div>
<span class="x" style="right:80px;top:820px;left:auto;color:${INK}">×</span><span class="o" style="left:940px;top:900px;border-color:${INK}"></span>`);

// ---------- assembly ----------
const BEATS = ['orange', 'photo', 'print', 'split', 'quote', 'urban'];
const PHOTO_BEATS = new Set(['photo', 'print', 'reveal']);

function studioPages(story) {
  const cfg = story.studio || {};
  const photos = (cfg.photos && cfg.photos.length) ? cfg.photos : [];
  const slides = story.slides || [];
  const total = slides.length + 1;
  const base = { series: cfg.series || 'POSTR FILES', file: cfg.file || '', source: (story.collage && story.collage.sourceShort) || story.source, photos, ghost: (story.collage || {}).ghost, total };
  const pages = [L.cover(story, { ...base, i: 1 })];
  let ph = 1; // next photo for inner pages
  const nextPhoto = () => photos[(ph++) % photos.length];
  const offset = Number(cfg.offset || 0);
  let b = 0;
  slides.forEach((sl, k) => {
    const c = { ...base, i: k + 2 };
    let html;
    if (sl.kind === 'share') html = L.share(sl, c);
    else if (sl.stats) html = L.stats(sl, c);
    else if (sl.points) html = L.list(sl, c, nextPhoto());
    else if (sl.kind === 'beat') {
      let lay = isBig(sl.body) && photos.length ? 'reveal' : BEATS[(b + offset) % BEATS.length];
      if (lay !== 'reveal') b++;
      if (PHOTO_BEATS.has(lay) && !photos.length) lay = 'orange';
      html = PHOTO_BEATS.has(lay) ? L[lay](sl, c, nextPhoto()) : L[lay](sl, c);
    } else html = photos.length ? L.body(sl, c, nextPhoto()) : L.quote({ ...sl, body: sl.body }, c);
    pages.push(html);
  });
  return pages;
}

module.exports = { studioPages };
