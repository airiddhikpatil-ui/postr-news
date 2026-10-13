// Captions for Postr News posters. Same facts as the poster, never more.
// Instagram: no clickable links, so the source is named in words; 3-5 hashtags max.
// Facebook: the source link is included.
const MAX_IG = 2200;

const CITY_TAGS = { Mumbai: '#Mumbai', Pune: '#Pune', 'Delhi NCR': '#DelhiNCR', Bengaluru: '#Bengaluru' };
const FORMAT_TAGS = {
  impact: '#MoneyNews', alert: '#Alert', number: '#NumberOfTheDay', tracker: '#ThenVsNow', myth: '#FactCheck', angles: '#3Angles',
};

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();

function hashtags(story) {
  const tags = ['#PostrNews'];
  if (FORMAT_TAGS[story.format]) tags.push(FORMAT_TAGS[story.format]);
  if (story.place && CITY_TAGS[story.place]) tags.push(CITY_TAGS[story.place]);
  for (const t of story.tags || []) if (tags.length < 5) tags.push(`#${String(t).replace(/[^\p{L}\p{N}]/gu, '')}`);
  return [...new Set(tags)].slice(0, 5).join(' ');
}

function buildCaption(story, platform = 'instagram') {
  const lines = [];
  lines.push(clean(story.captionHeadline || story.headline));
  if (story.summary) lines.push('', clean(story.summary));
  if (story.forYou) lines.push('', `What it means for you: ${clean(story.forYou)}`);
  if (story.assumptions) lines.push(`(${clean(story.assumptions)})`);
  const src = `Source: ${clean(story.source)}${story.date ? ` · ${clean(story.date)}` : ''}`;
  lines.push('', platform === 'facebook' && story.sourceUrl ? `${src}\n${story.sourceUrl}` : src);
  if (story.corrected) lines.push(`Corrected ${clean(story.corrected)}: ${clean(story.correctionNote)}`);
  if (story.sponsored) lines.push('', `Paid partnership with ${clean(story.sponsor)}`);
  lines.push('', hashtags(story));
  const text = lines.join('\n');
  return text.length > MAX_IG ? `${text.slice(0, MAX_IG - 1)}…` : text;
}

module.exports = { buildCaption, hashtags };
