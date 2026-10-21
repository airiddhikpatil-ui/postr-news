// Brand settings shared by every template, caption and post. Edit config/brand.json, not this file.
// Logo: put your own SVG logo at poster-engine/assets/wordmark-ink.svg (dark logo for light backgrounds)
// and poster-engine/assets/wordmark-paper.svg (light logo for dark backgrounds). Without them a text logo is drawn.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', '..', 'config', 'brand.json');
const raw = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
const name = raw.name || 'My News';
const B = {
  name,
  short: (raw.shortName || name).toUpperCase(),
  handle: String(raw.instagramHandle || 'mynews.page').replace(/^@/, ''),
  hashtag: raw.hashtag || `#${name.replace(/[^\p{L}\p{N}]/gu, '')}`,
  tagline: raw.tagline || 'News, designed.',
  followLine: raw.followLine || 'FOLLOW FOR NEWS THAT HITS DIFFERENT',
  tzOffsetMinutes: Number.isFinite(raw.timezoneOffsetMinutes) ? raw.timezoneOffsetMinutes : 330,
};

const escXml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

// Base64 SVG logo for a tone: 'ink' (dark logo) or 'paper' (light logo).
function wordmarkB64(tone = 'ink') {
  const own = path.join(__dirname, '..', 'assets', `wordmark-${tone}.svg`);
  if (fs.existsSync(own)) return fs.readFileSync(own).toString('base64');
  const color = tone === 'paper' ? '#F4F1EA' : '#111111';
  const w = Math.max(160, Math.round(name.length * 34 + 30));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="80" viewBox="0 0 ${w} 80"><text x="0" y="60" font-family="Arial Black, Helvetica, Arial, sans-serif" font-weight="900" font-size="58" letter-spacing="-2" fill="${color}">${escXml(name)}</text></svg>`;
  return Buffer.from(svg).toString('base64');
}

// Today's date (YYYY-MM-DD) in the page's own timezone.
const localDate = (now = Date.now()) => new Date(now + B.tzOffsetMinutes * 60000).toISOString().slice(0, 10);

module.exports = { B, wordmarkB64, localDate };
