const { B } = require('../poster-engine/src/brand');
// Captions for posts. Same facts as the poster, never more.
// Shape: hook line → what happened → what it means for you → source → share prompt → 3-5 hashtags.
// Instagram: no clickable links, so the source is named in words. Facebook: the link is added.
const MAX_IG = 2200;

const CITY_TAGS = { Mumbai: '#Mumbai', Pune: '#Pune', 'Delhi NCR': '#DelhiNCR', Delhi: '#Delhi', Bengaluru: '#Bengaluru' };
const FORMAT_TAGS = {
  impact: '#MoneyNews', alert: '#Alert', number: '#NumberOfTheDay', tracker: '#ThenVsNow', myth: '#FactCheck', angles: '#3Angles',
};
const LABELS = {
  forYou: { en: 'What it means for you', hi: 'आपके लिए इसका मतलब', mr: 'तुमच्यासाठी याचा अर्थ' },
  source: { en: 'Source', hi: 'स्रोत', mr: 'स्रोत' },
};

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const label = (k, lang) => LABELS[k][lang] || LABELS[k].en;

function hashtags(story) {
  const tags = [B.hashtag];
  for (const t of story.tags || []) tags.push(`#${String(t).replace(/[^\p{L}\p{N}]/gu, '')}`);
  if (story.place && CITY_TAGS[story.place]) tags.push(CITY_TAGS[story.place]);
  if (FORMAT_TAGS[story.format]) tags.push(FORMAT_TAGS[story.format]);
  return [...new Set(tags)].slice(0, 5).join(' ');
}

function buildCaption(story, platform = 'instagram') {
  const lang = story.lang || 'en';
  const lines = [clean(story.captionHeadline || story.headline)];
  if (story.summary) lines.push('', clean(story.summary));
  if (story.forYou) lines.push('', `${clean(story.forYouLabel) || label('forYou', lang)}: ${clean(story.forYou)}`);
  if (story.assumptionsCaption) lines.push(`(${clean(story.assumptionsCaption)})`);
  const src = `${clean(story.sourceLabel) || label('source', lang)}: ${clean(story.source)}`;
  lines.push('', platform === 'facebook' && story.sourceUrl ? `${src}\n${story.sourceUrl}` : src);
  if (story.corrected) lines.push(`Corrected ${clean(story.corrected)}: ${clean(story.correctionNote)}`);
  if (story.sponsored) lines.push('', `Paid partnership with ${clean(story.sponsor)}`);
  if (story.cta) lines.push('', clean(story.cta));
  lines.push('', hashtags(story));
  const text = lines.join('\n');
  return text.length > MAX_IG ? `${text.slice(0, MAX_IG - 1)}…` : text;
}

module.exports = { buildCaption, hashtags };
