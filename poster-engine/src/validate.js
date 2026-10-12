// Enforces the poster rules from the brand book before anything is rendered.
// A story that fails never becomes a poster.

const FORMATS = ['impact', 'alert', 'number', 'tracker', 'myth', 'angles'];
const LANGS = ['en', 'hi', 'mr'];
const VERDICTS = ['FAKE', 'TRUE', 'MISSING CONTEXT'];

const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;

function validate(story) {
  const errors = [];
  const need = (cond, msg) => { if (!cond) errors.push(msg); };

  need(story && typeof story === 'object', 'story must be an object');
  if (errors.length) return errors;

  need(story.id, 'id is required');
  need(FORMATS.includes(story.format), `format must be one of ${FORMATS.join(', ')}`);
  need(LANGS.includes(story.lang || 'en'), `lang must be one of ${LANGS.join(', ')}`);
  need(story.source && String(story.source).trim().length > 0, 'source is required on every poster');
  need(!/!/.test(story.headline || ''), 'no exclamation marks in headlines');

  switch (story.format) {
    case 'impact':
      need(story.headline, 'headline is required');
      need(words(story.headline) <= 8, 'impact headline: 8 words maximum');
      need(story.figure, 'figure is required (for example "₹473")');
      need(story.assumptions, 'assumptions are required so readers can check the number');
      break;
    case 'alert':
      need(story.headline, 'headline is required');
      need(words(story.headline) <= 3 || story.lang !== 'en', 'alert headline: 3 words maximum');
      need(story.time, 'time window is required (for example "10 am – 4 pm")');
      break;
    case 'number':
      need(story.value, 'value is required');
      need(String(story.value).length + String(story.unit || '').length <= 4, 'number of the day: 4 characters maximum including the unit');
      need(story.caption, 'caption is required: say what the number counts');
      if (story.share !== undefined) need(story.share >= 0 && story.share <= 100, 'share must be 0–100');
      break;
    case 'tracker':
      need(story.headline, 'headline is required');
      need(words(story.headline) <= 8, 'tracker headline: 8 words maximum');
      need(story.then && story.then.value && story.then.label, 'then.label and then.value are required');
      need(story.now && story.now.value && story.now.label, 'now.label and now.value are required');
      break;
    case 'myth':
      need(story.claim, 'claim (the forwarded message) is required');
      need(VERDICTS.includes(story.verdict), `verdict must be one of ${VERDICTS.join(', ')}`);
      need(story.evidence && words(story.evidence) <= 14, 'evidence is required, 14 words maximum');
      break;
    case 'angles':
      need(story.headline, 'headline is required');
      need(words(story.headline) <= 8, 'angles headline: 8 words maximum');
      need(Array.isArray(story.angles) && story.angles.length === 3, 'exactly 3 angles are required');
      break;
  }
  if (story.note) need(words(story.note) <= 14, 'context line: 14 words maximum');
  return errors;
}

module.exports = { validate, FORMATS, LANGS };
