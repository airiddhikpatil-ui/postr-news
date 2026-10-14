// Collab invites: name 1-2 relevant, owner-approved public pages as collaborators on a post.
// They get an Instagram collab invite; if they accept, the post also shows on their profile.
// Rules: only approved targets; max 2 per post; max 10 invites a day; each page at most once a week.
const fs = require('fs');
const path = require('path');

const TARGETS = path.join(__dirname, '..', 'config', 'collab-targets.json');
const LOG = path.join(__dirname, 'collabs', 'log.json');
const PER_POST = 2;
const PER_DAY = 10;
const WEEK = 7 * 24 * 3600 * 1000;

const TOPIC_RULES = {
  money: /upi|rbi|emi|sip|inflation|cpi|atm|sbi|fee|price|rupee|gold|silver|petrol|lpg|tax|ltcg|money|bank/i,
  markets: /sensex|nifty|stock|market|kospi|ipo|sip|brent|crude/i,
  scam: /scam|fraud|digital-arrest|fake|whatsapp|forward/i,
  cricket: /cricket|t20|odi|icc|ipl|gill|shefali|wi-|ind-wi/i,
  city: /pune|mumbai|delhi|bengaluru|bangalore|hyderabad|chennai|kolkata|ahmedabad|jaipur|lucknow|storm|water|road|digging/i,
  health: /health|mental|medicine|cancer|drug/i,
  planet: /climate|wildlife|himalaya|planet|glacier/i,
  world: /hormuz|black-?sea|pope|world|imf|war|ship/i,
  business: /imf|gdp|economy|business|company/i,
};

const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };

function storyTopics(story) {
  const text = `${story.id} ${(story.tags || []).join(' ')} ${story.place || ''}`;
  return Object.entries(TOPIC_RULES).filter(([, re]) => re.test(text)).map(([t]) => t);
}

function pickCollaborators(story, now = Date.now()) {
  if (process.env.COLLABS === 'off' || story.collabs === false) return [];
  const targets = (readJson(TARGETS, { targets: [] }).targets || []).filter((t) => t.approved === true);
  if (!targets.length) return [];
  const log = readJson(LOG, []);
  const today = new Date(now + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  const sentToday = log.filter((l) => l.day === today).reduce((n, l) => n + l.usernames.length, 0);
  const room = Math.min(PER_POST, PER_DAY - sentToday);
  if (room <= 0) return [];
  const recent = new Set(log.filter((l) => now - Date.parse(l.at) < WEEK).flatMap((l) => l.usernames));
  const topics = storyTopics(story);
  const city = story.place;
  const score = (t) => (city && (t.cities || []).some((c) => city.includes(c)) ? 3 : 0) + (t.topics || []).filter((x) => topics.includes(x)).length;
  return targets
    .filter((t) => !recent.has(t.username) && score(t) > 0)
    .filter((t) => !(t.topics || []).includes('city') || !t.cities || (city && t.cities.some((c) => city.includes(c))) || (t.topics || []).some((x) => x !== 'city' && topics.includes(x)))
    .sort((a, b) => score(b) - score(a) || (a.followers || 0) - (b.followers || 0))
    .slice(0, room)
    .map((t) => t.username);
}

function logInvites(story, usernames, mediaUrl) {
  if (!usernames.length) return;
  fs.mkdirSync(path.dirname(LOG), { recursive: true });
  const log = readJson(LOG, []);
  const at = new Date().toISOString();
  log.push({ day: new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10), at, story: story.id, usernames, media: mediaUrl || null });
  fs.writeFileSync(LOG, `${JSON.stringify(log, null, 2)}\n`);
}

module.exports = { pickCollaborators, logInvites, storyTopics };
