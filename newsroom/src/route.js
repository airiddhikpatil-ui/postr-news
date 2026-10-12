// Step 3: decide who publishes a story, before any AI writing.
//   auto     data and official notices that pass the red team
//   one-tap  general news, approved by the editor with one tap
//   editor   sensitive: people, crime, courts, elections, religion, health
// Keyword rules run first because they are cheap and predictable; they can only make a story stricter.

const SENSITIVE = /arrest|accus|alleg|fir\b|court|verdict|bail|murder|rape|assault|kill|dead|death|suicide|riot|clash|communal|religio|temple|mosque|church|caste|dalit|hindu|muslim|christian|sikh|election|poll|vote|mla|mp\b|minister|party|bjp|congress|aap|shiv sena|ncp|scam|fraud|corrupt|terror|militant|vaccin|disease|outbreak|hospital/i;

function route(cluster, { autoCategories = [] } = {}) {
  const text = cluster.items.map((x) => `${x.title} ${x.summary}`).join(' ');
  if (SENSITIVE.test(text)) return { tier: 'editor', reason: 'sensitive topic keywords' };
  const officialOnly = cluster.items.every((x) => x.official);
  if (officialOnly && autoCategories.includes('official')) return { tier: 'auto', reason: 'official source, category earned auto-publish' };
  return { tier: 'one-tap', reason: officialOnly ? 'official source, auto-publish not yet earned' : 'general news' };
}

module.exports = { route, SENSITIVE };
