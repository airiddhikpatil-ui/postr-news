// Step 2: group the same story from different outlets into one cluster,
// then score each cluster for how much it matters to a normal person.

const STOP = new Set('a an the of in on at to for and or is are was were be by with from as after over into its it this that new says said will has have had'.split(' '));

const tokens = (t) =>
  new Set(
    String(t).toLowerCase().replace(/[^\p{L}\p{N}%₹. ]/gu, ' ').split(/\s+/).filter((w) => w && !STOP.has(w) && w.length > 1)
  );

const jaccard = (a, b) => {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter || 1);
};

function cluster(items, { threshold = 0.45, windowHours = 24 } = {}) {
  const clusters = [];
  const sorted = [...items].sort((x, y) => new Date(y.publishedAt) - new Date(x.publishedAt));
  for (const it of sorted) {
    const tk = tokens(it.title);
    const home = clusters.find(
      (c) => jaccard(c.tokens, tk) >= threshold && Math.abs(new Date(c.latest) - new Date(it.publishedAt)) < windowHours * 3600e3
    );
    if (home) {
      home.items.push(it);
      for (const w of tk) home.tokens.add(w);
    } else {
      clusters.push({ tokens: tk, items: [it], latest: it.publishedAt });
    }
  }
  return clusters.map((c, i) => ({
    key: c.items.map((x) => x.link).sort()[0] || `cluster-${i}`,
    title: c.items[0].title,
    items: c.items,
    latest: c.latest,
  }));
}

// What makes news matter for Postr: money, daily life, official action, several outlets.
const BOOST = [
  [/₹|rupee|price|rate|tax|gst|emi|loan|fare|salary|pension|subsid/i, 3],
  [/water|power|electric|traffic|road|metro|train|railway|flight|holiday|school|exam|result|admit card/i, 3],
  [/rain|flood|heat|cyclone|weather|alert|warning|imd/i, 3],
  [/job|recruit|vacanc|hiring|layoff/i, 2],
];
const DOWNWEIGHT = [/celebrit|bollywood|actor|actress|gossip|wedding|relationship|viral video|spotted/i];

function score(c, now = Date.now()) {
  const outlets = new Set(c.items.map((x) => x.sourceId)).size;
  const official = c.items.some((x) => x.official);
  const ageH = (now - new Date(c.latest)) / 3600e3;
  const text = c.items.map((x) => `${x.title} ${x.summary}`).join(' ');
  let s = Math.min(outlets, 5) * 2 + (official ? 4 : 0) - Math.max(0, ageH - 2) * 0.3;
  for (const [re, w] of BOOST) if (re.test(text)) s += w;
  if (DOWNWEIGHT.some((re) => re.test(text))) s -= 10;
  return Math.round(s * 10) / 10;
}

module.exports = { cluster, score, tokens, jaccard };
