#!/usr/bin/env node
// The newsroom loop. Run every 2–5 minutes by a scheduler (GitHub Actions, Railway cron, or `--watch`).
// collect → cluster → score → route → write → red team → validate → render → queue
const fs = require('fs');
const path = require('path');
const { collect } = require('./collect');
const { cluster, score } = require('./cluster');
const { route } = require('./route');
const ai = require('./ai');
const { impactFigure } = require('./calc');
const { validate } = require('../../poster-engine/src/validate');

const ROOT = path.join(__dirname, '..');
const cfg = {
  sourcesFile: process.env.SOURCES_FILE || path.join(ROOT, 'config', 'sources.json'),
  stateFile: process.env.STATE_FILE || path.join(ROOT, 'data', 'state.json'),
  posterDir: process.env.POSTER_DIR || path.join(ROOT, 'data', 'posters'),
  maxPerRun: +(process.env.MAX_PER_RUN || 10),
  minScore: +(process.env.MIN_SCORE || 4),
  autoCategories: (process.env.AUTO_CATEGORIES || '').split(',').filter(Boolean), // e.g. "official" once earned
};

const loadState = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { seen: {}, queue: [] });
const saveState = (f, s) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(s, null, 2)); };
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

async function processCluster(c, { writeFn, redTeamFn, autoCategories }) {
  const routing = route(c, { autoCategories });
  const entry = { key: c.key, title: c.title, score: c.score, tier: routing.tier, routeReason: routing.reason, sources: c.items.map((x) => ({ name: x.sourceName, link: x.link })), createdAt: new Date().toISOString() };

  let draft;
  try {
    draft = await writeFn(c);
  } catch (e) {
    return { ...entry, status: 'error', problems: [`writer: ${e.message}`] };
  }
  if (!draft || draft.format === 'skip') return { ...entry, status: 'skipped', problems: ['writer chose to skip'] };

  const problems = ai.codeChecks(c, draft);
  if (draft.format === 'impact') {
    try { Object.assign(draft, impactFigure(draft.calc)); } catch (e) { problems.push(`calc: ${e.message}`); }
  }
  const story = { id: `${new Date().toISOString().slice(0, 10)}-${slug(draft.headline || draft.caption || c.title)}`, lang: 'en', date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), ...draft };
  problems.push(...validate(story));

  let review = { pass: false, problems: ['red team not run'] };
  if (!problems.length) {
    try { review = await redTeamFn(c, story); } catch (e) { review = { pass: false, problems: [`red team: ${e.message}`] }; }
    problems.push(...(review.pass ? [] : review.problems || ['red team failed the draft']));
  }

  const status = problems.length ? 'rejected' : routing.tier === 'auto' ? 'ready-to-publish' : 'needs-approval';
  return { ...entry, status, story, problems };
}

async function runOnce(opts = {}) {
  const o = { ...cfg, ...opts };
  const writeFn = opts.writeFn || ((c) => ai.write(c));
  const redTeamFn = opts.redTeamFn || ((c, d) => ai.redTeam(c, d));
  const sources = JSON.parse(fs.readFileSync(o.sourcesFile, 'utf8')).sources;
  const state = loadState(o.stateFile);

  const { items, errors } = opts.items ? { items: opts.items, errors: [] } : await collect(sources);
  const fresh = cluster(items)
    .map((c) => ({ ...c, score: score(c) }))
    .filter((c) => !state.seen[c.key] && c.score >= o.minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, o.maxPerRun);

  const results = [];
  for (const c of fresh) {
    const r = await processCluster(c, { writeFn, redTeamFn, autoCategories: o.autoCategories });
    state.seen[c.key] = r.status;
    state.queue.push(r);
    results.push(r);
  }

  // Render posters for everything that passed, so the review queue shows the real image.
  const toRender = results.filter((r) => r.story && (r.status === 'ready-to-publish' || r.status === 'needs-approval')).map((r) => r.story);
  if (toRender.length && !opts.skipRender) {
    const { renderAll } = require('../../poster-engine/src/render');
    await renderAll(toRender, o.posterDir);
  }
  saveState(o.stateFile, state);
  return { collected: items.length, sourceErrors: errors, processed: results.length, results };
}

if (require.main === module) {
  const watch = process.argv.includes('--watch');
  const everyMin = +(process.env.LOOP_MINUTES || 3);
  const tick = () =>
    runOnce()
      .then((r) => console.log(JSON.stringify({ at: new Date().toISOString(), collected: r.collected, processed: r.processed, statuses: r.results.map((x) => x.status), sourceErrors: r.sourceErrors })))
      .catch((e) => console.error('loop failed:', e));
  tick();
  if (watch) setInterval(tick, everyMin * 60e3);
}

module.exports = { runOnce, processCluster };
