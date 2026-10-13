const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseFeed } = require('../src/collect');
const { cluster, score } = require('../src/cluster');
const { route } = require('../src/route');
const { codeChecks } = require('../src/ai');
const { emi, impactFigure } = require('../src/calc');
const { runOnce } = require('../src/loop');

const src = { id: 'test-official', name: 'Test official feed', official: true, region: 'IN', lang: 'en' };
const xml = fs.readFileSync(path.join(__dirname, 'fixtures', 'feed.xml'), 'utf8');
const items = parseFeed(xml, src);

test('parses RSS items with CDATA', () => {
  assert.strictEqual(items.length, 3);
  assert.strictEqual(items[0].title, 'RBI cuts repo rate by 0.25% to 5.25%');
});

test('clusters the same story from two outlets', () => {
  const other = { ...items[0], sourceId: 'paper', sourceName: 'A paper', official: false, title: 'RBI cuts repo rate by 0.25%, home loans to get cheaper', link: 'https://paper.example/rbi' };
  const cs = cluster([...items, other]);
  const rbi = cs.find((c) => c.title.includes('RBI'));
  assert.strictEqual(rbi.items.length, 2);
});

test('gossip scores below the publishing threshold, money news above it', () => {
  const cs = cluster(items).map((c) => ({ ...c, score: score(c, new Date('2026-10-12T06:00:00Z').getTime()) }));
  const gossip = cs.find((c) => c.title.includes('Actor'));
  const rbi = cs.find((c) => c.title.includes('RBI'));
  assert.ok(gossip.score < 4, `gossip score ${gossip.score}`);
  assert.ok(rbi.score >= 4, `rbi score ${rbi.score}`);
});

test('sensitive stories always go to the editor', () => {
  const mla = cluster(items).find((c) => c.title.includes('MLA'));
  assert.strictEqual(route(mla, { autoCategories: ['official'] }).tier, 'editor');
});

test('EMI maths matches the brand book example (₹473 less a month)', () => {
  const d = emi(3000000, 8.5, 20) - emi(3000000, 8.25, 20);
  assert.strictEqual(Math.round(d), 473);
  assert.strictEqual(impactFigure({ type: 'emi', change: -0.25 }).figure, '₹473');
});

test('code checks catch invented numbers and fake quotes', () => {
  const c = cluster(items).find((x) => x.title.includes('RBI'));
  const bad = { headline: 'Repo rate cut 0.5%', facts: [{ text: 'x', sourceQuote: 'RBI doubled the rate' }] };
  const problems = codeChecks(c, bad);
  assert.ok(problems.some((p) => p.includes('number 0.5')));
  assert.ok(problems.some((p) => p.includes('quote not found')));
  const good = { headline: 'Repo rate cut 0.25%', calc: { type: 'emi', change: -0.25 }, facts: [{ text: 'cut', sourceQuote: 'cut the repo rate by 0.25 percentage points' }] };
  assert.deepStrictEqual(codeChecks(c, good), []);
});

test('full loop: money story reaches the approval queue, gossip is dropped, invented facts are rejected', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'postr-'));
  const sourcesFile = path.join(dir, 'sources.json');
  fs.writeFileSync(sourcesFile, JSON.stringify({ sources: [] }));
  const writeFn = async (c) =>
    c.title.includes('RBI')
      ? { format: 'impact', lang: 'en', headline: 'Repo rate cut 0.25%', calc: { type: 'emi', change: -0.25 }, source: 'RBI', facts: [{ text: 'cut', sourceQuote: 'cut the repo rate by 0.25 percentage points' }] }
      : { format: 'alert', lang: 'en', headline: 'MLA arrested', time: '9 pm', source: 'Police', facts: [{ text: 'x', sourceQuote: 'invented quote' }] };
  const redTeamFn = async () => ({ pass: true, problems: [] });
  const r = await runOnce({ items, sourcesFile, stateFile: path.join(dir, 'state.json'), writeFn, redTeamFn, skipRender: true, minScore: 4, now: new Date('2026-10-12T06:00:00Z').getTime() });
  const rbi = r.results.find((x) => x.title.includes('RBI'));
  assert.strictEqual(rbi.status, 'needs-approval');
  assert.strictEqual(rbi.story.figure, '₹473');
  assert.ok(!r.results.some((x) => x.title.includes('Actor')));
  const mla = r.results.find((x) => x.title.includes('MLA'));
  if (mla) assert.strictEqual(mla.status, 'rejected');
});
