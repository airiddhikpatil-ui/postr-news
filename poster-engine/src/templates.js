// HTML templates for the six Postr News poster formats, drawn on the 1080px canvas.
// Every size here comes from the brand book (Poster system, Grid, Typography).
const fs = require('fs');
const path = require('path');
const T = require('./tokens');

const C = T.color;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const LABELS = {
  forYou: { en: 'WHAT IT MEANS FOR YOU', hi: 'आपके लिए इसका मतलब', mr: 'तुमच्यासाठी याचा अर्थ' },
  source: { en: 'Source', hi: 'स्रोत', mr: 'स्रोत' },
  corrected: { en: 'CORRECTED', hi: 'सुधारा गया', mr: 'दुरुस्त केले' },
};
const label = (key, lang) => LABELS[key][lang] || LABELS[key].en;

// Wordmarks are embedded as data URIs so a poster renders with no network access.
const wordmark = (tone) => {
  const file = path.join(__dirname, '..', 'assets', `postr-wordmark-${tone}.svg`);
  const b64 = fs.readFileSync(file).toString('base64');
  return `<img class="wm" src="data:image/svg+xml;base64,${b64}" alt="postr.">`;
};

function css(size, fmt, lang) {
  const H = size === 'story' ? T.canvas.storyHeight : T.canvas.feedHeight;
  const top = size === 'story' ? T.canvas.storySafeTop : T.canvas.margin;
  const bottom = size === 'story' ? T.canvas.storySafeBottom : T.canvas.margin;
  const side = T.canvas.margin;
  const deva = lang === 'hi' || lang === 'mr';
  const f = T.formats[fmt];
  return `
  *{box-sizing:border-box;margin:0}
  html,body{width:${T.canvas.width}px;height:${H}px}
  body{font-family:${T.fonts.text};-webkit-font-smoothing:antialiased}
  .poster{position:relative;overflow:hidden;width:${T.canvas.width}px;height:${H}px;padding:${top}px ${side}px ${bottom}px;display:flex;flex-direction:column;background:${C[f.ground]};color:${C[f.text]}}
  .d{font-family:${T.fonts.display};font-weight:900}
  .head{font-family:${deva ? T.fonts.deva : T.fonts.display};font-weight:${deva ? 800 : 900};letter-spacing:${deva ? '0' : '-4px'}}
  .row{display:flex;justify-content:space-between;align-items:center}
  .tag{font-family:${T.fonts.display};font-weight:700;font-size:32px;letter-spacing:4px;padding:16px 28px;border-radius:999px;border:6px solid currentColor;line-height:1}
  .meta{font-size:34px;font-weight:800;text-transform:uppercase}
  .stamp{font-family:${T.fonts.display};font-weight:900;font-size:30px;letter-spacing:3px;color:${C.signal};background:${C.ink};padding:12px 22px;border-radius:12px}
  .foot{display:flex;justify-content:space-between;align-items:center;font-size:28px;font-weight:800;line-height:1.3;gap:32px}
  .wm{width:120px;height:auto;display:block;flex-shrink:0}
  `;
}

const tagRow = (story, tagStyle = '') => {
  const f = T.formats[story.format];
  const right = story.corrected
    ? `<span class="stamp">${label('corrected', story.lang)} · ${esc(story.corrected)}</span>`
    : `<span class="meta">${esc(story.place || story.date || '')}</span>`;
  return `<div class="row"><span class="tag" style="${tagStyle}">${f.tag}</span>${right}</div>`;
};

// Page counter for carousels: "1/4 →" on the cover tells people to swipe.
const pager = (story) => (story._total ? `<span class="d" style="font-size:26px;letter-spacing:1px;white-space:nowrap">${story._page}/${story._total}${story._page === 1 ? ' →' : ''}</span>` : '');

const foot = (story, extraStyle = '', tone) => {
  const f = T.formats[story.format];
  return `<div class="foot" style="${extraStyle}"><span>${label('source', story.lang)} · ${esc(story.source)}</span><span style="display:flex;align-items:center;gap:28px;flex-shrink:0">${pager(story)}${wordmark(tone || f.wordmark)}</span></div>`;
};

const body = {
  impact: (s) => `
    <div style="position:absolute;right:-210px;top:180px;width:720px;height:720px;border-radius:50%;border:108px solid ${C.ink};opacity:.08"></div>
    ${tagRow(s)}
    <h1 class="head" style="margin-top:66px;font-size:104px;line-height:1.02">${esc(s.headline)}</h1>
    ${s.note ? `<p style="margin-top:30px;font-size:42px;font-weight:600;line-height:1.4">${esc(s.note)}</p>` : ''}
    <div style="margin-top:auto;background:${C.ink};color:${C.paper};border-radius:54px;padding:48px">
      <div style="font-size:30px;font-weight:800;letter-spacing:4px;color:${C.lime}">${esc(s.panelLabel || label('forYou', s.lang))}</div>
      <div class="d" style="font-size:132px;letter-spacing:-6px;line-height:1;margin-top:12px">${esc(s.figure)}<span style="font-size:45px;letter-spacing:0;font-weight:700"> ${esc(s.unit || '')}</span></div>
      <div style="font-size:33px;color:${C.mutedOnInk};margin-top:12px;font-weight:600">${esc(s.assumptions)}</div>
    </div>
    ${foot(s, 'margin-top:36px')}`,

  alert: (s) => `
    ${tagRow(s, `background:${C.ink};color:${C.signal};border-color:${C.ink}`)}
    <div class="d" style="margin-top:54px;font-size:252px;line-height:.82;letter-spacing:-18px">!!</div>
    <h1 class="head" style="margin-top:42px;font-size:${s.lang === 'en' ? 128 : 120}px;line-height:${s.lang === 'en' ? 0.98 : 1.05};${s.lang === 'en' ? 'letter-spacing:-5px' : ''}">${esc(s.headline)}</h1>
    <div style="margin-top:36px;align-self:flex-start;padding:24px 36px;border-radius:36px;background:${C.ink};color:${C.paper};font-family:${T.fonts.deva};font-weight:800;font-size:51px">${esc(s.time)}</div>
    ${s.note ? `<p style="margin-top:auto;font-size:42px;font-weight:700;line-height:1.4">${esc(s.note)}</p>` : '<div style="margin-top:auto"></div>'}
    ${foot(s, 'margin-top:36px')}`,

  number: (s) => `
    ${tagRow(s)}
    <div class="d fit" style="margin-top:auto;font-size:384px;line-height:.85;letter-spacing:-24px;white-space:nowrap;overflow:hidden">${esc(s.value)}<span style="color:${C.lime}">${esc(s.unit || '')}</span></div>
    ${s.share !== undefined ? `<div style="margin-top:36px;display:flex;gap:12px;height:36px"><div style="flex:${s.share};background:${C.lime};border-radius:12px"></div><div style="flex:${100 - s.share};background:rgba(244,241,234,.25);border-radius:12px"></div></div>` : ''}
    <p class="head" style="margin-top:42px;font-size:54px;line-height:1.15;font-weight:700;${s.lang === 'en' ? 'letter-spacing:-1px' : ''}">${esc(s.caption)}</p>
    ${s.note ? `<p style="margin-top:20px;font-size:34px;font-weight:700;line-height:1.3;opacity:.8">${esc(s.note)}</p>` : ''}
    ${foot(s, 'margin-top:42px')}`,

  tracker: (s, size) => {
    const bottom = size === 'story' ? T.canvas.storySafeBottom : 42;
    return `
    <div style="margin:-${size === 'story' ? T.canvas.storySafeTop : T.canvas.margin}px -${T.canvas.margin}px -${size === 'story' ? T.canvas.storySafeBottom : T.canvas.margin}px;display:flex;flex-direction:column;flex:1">
      <div style="padding:${size === 'story' ? T.canvas.storySafeTop : T.canvas.margin}px ${T.canvas.margin}px 0">
        ${tagRow(s)}
        <h1 class="head" style="margin-top:54px;font-size:96px;line-height:1.02">${esc(s.headline)}</h1>
      </div>
      <div style="margin-top:auto;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
        <div style="padding:54px ${T.canvas.margin}px;border-top:9px solid ${C.ink};border-right:9px solid ${C.ink}">
          <div style="font-size:30px;font-weight:800;letter-spacing:4px">${esc(s.then.label)}</div>
          <div class="d fit" style="font-size:72px;margin-top:24px;letter-spacing:-3px;white-space:nowrap;overflow:hidden">${esc(s.then.value)}</div>
          <div style="font-size:36px;font-weight:600;margin-top:12px">${esc(s.then.note || '')}</div>
        </div>
        <div style="padding:54px ${T.canvas.margin}px;border-top:9px solid ${C.ink};background:${C.ink};color:${C.paper}">
          <div style="font-size:30px;font-weight:800;letter-spacing:4px;color:${C.signal}">${esc(s.now.label)}</div>
          <div class="d fit" style="font-size:72px;margin-top:24px;letter-spacing:-3px;white-space:nowrap;overflow:hidden">${esc(s.now.value)}</div>
          <div style="font-size:36px;font-weight:600;margin-top:12px">${esc(s.now.note || '')}</div>
        </div>
      </div>
      <div style="background:${C.ink};color:${C.paper};padding:12px ${T.canvas.margin}px ${bottom}px">${foot(s)}</div>
    </div>`;
  },

  myth: (s) => `
    ${tagRow(s, `background:${C.lime};color:${C.ink};border-color:${C.lime}`)}
    <div style="margin-top:48px;padding:42px;border-radius:48px 48px 48px 12px;background:${C.chat};color:${C.onChat};font-size:45px;line-height:1.4;font-weight:600">“${esc(s.claim)}”</div>
    <div class="d" style="margin-top:54px;font-size:${s.verdict === 'MISSING CONTEXT' ? 110 : 174}px;line-height:.9;letter-spacing:-8px;color:${s.verdict === 'TRUE' ? C.lime : C.signal};transform:rotate(-4deg);transform-origin:left center">${esc(s.verdict)}.</div>
    <p style="margin-top:48px;font-size:42px;line-height:1.45;font-weight:600;color:#D9D6CE">${esc(s.evidence)}</p>
    ${foot(s, 'margin-top:auto')}`,

  angles: (s) => {
    const marks = [C.lime, C.signal, C.angleC];
    return `
    ${tagRow(s)}
    <h1 class="head" style="margin-top:54px;font-size:84px;line-height:1.04">${esc(s.headline)}</h1>
    <div style="margin-top:auto;display:flex;flex-direction:column;gap:24px">
      ${s.angles.map((a, i) => `<div style="padding:36px;border-radius:42px;background:${C.ink};color:${C.paper};display:flex;gap:30px;align-items:center">
        <span class="d" style="font-size:54px;color:${marks[i]}">${'ABC'[i]}</span>
        <span style="font-size:39px;font-weight:700;line-height:1.3">${esc(a.text)}${a.outlet ? `<span style="display:block;font-size:28px;color:${C.mutedOnInk};margin-top:6px">${esc(a.outlet)}</span>` : ''}</span></div>`).join('')}
    </div>
    ${foot(s, 'margin-top:36px')}`;
  },
};

function renderHtml(story, size = 'feed') {
  const lang = story.lang || 'en';
  const s = { ...story, lang };
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<link rel="stylesheet" href="${T.fonts.googleCss}">
<style>${css(size, s.format, lang)}</style></head>
<body><div class="poster">${body[s.format](s, size)}</div></body></html>`;
}

// Detail pages of a carousel: same ground as the cover so the set reads as one story.
// slide = { label, title, body?, points?: [..], kind?: 'share' }
function renderSlideHtml(story, slide, page, total, size = 'feed') {
  const lang = story.lang || 'en';
  const s = { ...story, lang, _page: page, _total: total };
  const f = T.formats[s.format];
  const textColor = C[f.text];
  const tone = f.text === 'ink' ? 'ink' : 'paper';
  const deva = lang === 'hi' || lang === 'mr';
  const panel = f.text === 'ink' ? C.ink : C.paper;
  const onPanel = f.text === 'ink' ? C.paper : C.ink;
  const points = (slide.points || []).map((pt, i) => `<div style="display:flex;gap:28px;align-items:flex-start;padding:30px 34px;border-radius:36px;background:${panel};color:${onPanel}">
      <span class="d" style="font-size:44px;line-height:1;min-width:44px">${i + 1}</span>
      <span style="font-size:38px;font-weight:700;line-height:1.3">${esc(pt)}</span></div>`).join('');
  // Data pages: each value as a big number with a bar sized against the largest, so the set reads as a chart.
  const barColor = f.text === 'ink' ? C.ink : C.lime;
  const maxNum = Math.max(...(slide.stats || []).map((x) => x.num || 0), 1);
  const stats = (slide.stats || []).map((x) => `<div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:24px">
        <span style="font-size:32px;font-weight:800;letter-spacing:2px;text-transform:uppercase;font-family:${deva ? T.fonts.deva : T.fonts.text}">${esc(x.label)}</span>
        <span class="d" style="font-size:64px;letter-spacing:-2px;white-space:nowrap">${esc(x.value)}</span></div>
      <div style="margin-top:12px;height:22px;border-radius:11px;background:${f.text === 'ink' ? 'rgba(10,10,11,.12)' : 'rgba(244,241,234,.18)'}"><div style="height:22px;border-radius:11px;width:${Math.round(((x.num || 0) / maxNum) * 100)}%;background:${barColor};opacity:${x.hi ? 1 : 0.55}"></div></div></div>`).join('');
  const share = slide.kind === 'share'
    ? `<div style="margin-top:auto;padding:40px 44px;border-radius:44px;background:${panel};color:${onPanel}">
        <div style="font-size:30px;font-weight:800;letter-spacing:4px;opacity:.75">${esc(slide.followLabel || 'FOLLOW FOR THE DAY IN POSTERS')}</div>
        <div class="d" style="font-size:76px;letter-spacing:-3px;margin-top:10px">@postr.news</div></div>`
    : '';
  const numeral = `<div class="d" style="position:absolute;right:-30px;top:150px;font-size:560px;line-height:.8;letter-spacing:-30px;opacity:.07;pointer-events:none">${String(page).padStart(2, '0')}</div>`;
  const inner = `${numeral}
    <div class="row"><span class="tag" style="font-family:${deva ? T.fonts.deva : T.fonts.display}">${esc(slide.label)}</span><span class="meta">${esc(s.place || s.date || '')}</span></div>
    <h1 class="head" style="position:relative;margin-top:56px;font-size:${slide.kind === 'share' ? 104 : 84}px;line-height:1.06;${deva ? '' : 'letter-spacing:-2px'}">${esc(slide.title)}</h1>
    ${slide.body ? `<p style="margin-top:36px;font-size:${deva ? 42 : 40}px;font-weight:600;line-height:1.42;font-family:${deva ? T.fonts.deva : T.fonts.text}">${esc(slide.body)}</p>` : ''}
    ${stats ? `<div style="margin-top:auto;display:flex;flex-direction:column;gap:34px">${stats}</div>` : ''}
    ${slide.statsNote ? `<p style="margin-top:28px;font-size:32px;font-weight:700;opacity:.8">${esc(slide.statsNote)}</p>` : ''}
    ${points ? `<div style="margin-top:${slide.body ? 40 : 'auto'}${slide.body ? 'px' : ''};display:flex;flex-direction:column;gap:18px">${points}</div>` : ''}
    ${share || (stats || (points && !slide.body) ? '' : '<div style="margin-top:auto"></div>')}
    ${foot(s, 'margin-top:40px', tone)}`;
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<link rel="stylesheet" href="${T.fonts.googleCss}">
<style>${css(size, s.format, lang)} .poster{color:${textColor}}</style></head>
<body><div class="poster">${inner}</div></body></html>`;
}

module.exports = { renderHtml, renderSlideHtml };
