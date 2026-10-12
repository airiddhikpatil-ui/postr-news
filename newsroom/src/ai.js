// Step 4 and 5: the AI writer (blue team) and the AI checker (red team),
// plus deterministic checks that no model can talk its way past.

const API_URL = 'https://api.anthropic.com/v1/messages';

async function callModel({ model, system, user, maxTokens = 1200, apiKey = process.env.AI_API_KEY, fetchImpl = fetch }) {
  if (!apiKey) throw new Error('AI_API_KEY is not set');
  const res = await fetchImpl(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`AI API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}

const parseJson = (text) => {
  const m = /\{[\s\S]*\}/.exec(String(text).replace(/```(?:json)?/g, ''));
  if (!m) throw new Error('model did not return JSON');
  return JSON.parse(m[0]);
};

const sourceBlock = (cluster) =>
  cluster.items.map((x, i) => `[${i + 1}] ${x.sourceName}${x.official ? ' (official)' : ''}\nTitle: ${x.title}\nSummary: ${x.summary}\nLink: ${x.link}`).join('\n\n');

const WRITER_SYSTEM = `You write Postr News posters. Postr News is a neutral Indian news app where every story is one designed poster.
Return ONLY a JSON object. Use ONLY facts stated in the sources given; never add facts, numbers, names or dates that are not in them.
Pick one format:
- "alert": time-bound local disruption (water, power, roads, holidays, weather). Fields: headline (max 3 words), time, place, note (max 14 words).
- "number": one striking statistic stated in a source. Fields: value, unit (value+unit max 4 characters), share (0-100, only if it is a percentage), caption (what it counts).
- "tracker": a deadline or promise that moved. Fields: headline (max 8 words), then {label, value, note}, now {label, value, note}.
- "impact": a change to interest rates that affects home loan EMIs. Fields: headline (max 8 words), note, calc {type:"emi", change} where change is the policy rate change in percentage points stated in the source (a cut of 0.25 is -0.25). Never write the rupee figure yourself.
- "angles": only when 3 different outlets frame the story differently. Fields: headline (max 8 words), angles [{text, outlet}] x3.
- "skip": if the story is gossip, unclear, a rumour from one unofficial outlet, or none of the above fit.
Always include: format, lang ("en"), source (the publisher or document name), and facts: [{text, sourceQuote}] where sourceQuote is copied word for word from a source.
Rules: sentence case, no exclamation marks, no questions, no "shocking"/"breaking", numerals not words, Indian number style (lakh, crore).`;

const REDTEAM_SYSTEM = `You are the red team for Postr News. Your job is to find reasons a draft poster must NOT be published.
Check every claim in the draft against the sources. Return ONLY JSON: {"pass": true|false, "problems": ["..."]}.
Fail the draft if: any fact, number, name or date is not supported by the sources; the headline exaggerates or adds emotion; it accuses a named person; it frames religion, caste or community in a hostile way; it relies on a single unofficial outlet for a claim; the format does not fit the story.`;

async function write(cluster, { model = process.env.AI_WRITER_MODEL || 'claude-haiku-5-5', call = callModel } = {}) {
  const text = await call({ model, system: WRITER_SYSTEM, user: `Sources:\n\n${sourceBlock(cluster)}\n\nWrite the poster JSON.` });
  return parseJson(text);
}

async function redTeam(cluster, draft, { model = process.env.AI_REDTEAM_MODEL || 'claude-sonnet-5-5', call = callModel } = {}) {
  const text = await call({ model, system: REDTEAM_SYSTEM, user: `Sources:\n\n${sourceBlock(cluster)}\n\nDraft poster:\n${JSON.stringify(draft, null, 2)}` });
  return parseJson(text);
}

// Deterministic checks: quotes must exist in the sources, and every number the reader sees
// must appear in the sources (calculated impact figures are exempt; code made them).
const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const numbers = (s) => (String(s || '').match(/\d+(?:[.,]\d+)*/g) || []).map((n) => n.replace(/,/g, ''));

function codeChecks(cluster, draft) {
  const problems = [];
  const corpus = norm(cluster.items.map((x) => `${x.title} ${x.summary}`).join(' '));
  const corpusNums = new Set(numbers(corpus));
  for (const f of draft.facts || []) {
    if (!f.sourceQuote || !corpus.includes(norm(f.sourceQuote))) problems.push(`quote not found in sources: "${f.sourceQuote || ''}"`);
  }
  if (!(draft.facts || []).length) problems.push('no source quotes given');
  if (draft.calc && typeof draft.calc.change === 'number' && !corpusNums.has(String(Math.abs(draft.calc.change)))) {
    problems.push(`rate change ${Math.abs(draft.calc.change)} does not appear in the sources`);
  }
  const visible = [draft.headline, draft.caption, draft.value, draft.time, draft.note, draft.then && draft.then.value, draft.now && draft.now.value, ...(draft.angles || []).map((a) => a.text)];
  for (const n of numbers(visible.join(' '))) {
    if (!corpusNums.has(n)) problems.push(`number ${n} does not appear in the sources`);
  }
  return problems;
}

module.exports = { callModel, write, redTeam, codeChecks, WRITER_SYSTEM, REDTEAM_SYSTEM };
