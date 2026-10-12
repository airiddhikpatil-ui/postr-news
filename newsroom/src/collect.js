// Step 1: collect. Reads enabled RSS/Atom feeds and returns plain items.
// Only titles, links, dates and short summaries are kept; full articles are never copied.

const decode = (s) =>
  String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s+/g, ' ')
    .trim();

const pick = (block, tag) => {
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i').exec(block);
  return m ? decode(m[1]) : '';
};

function parseFeed(xml, source) {
  const items = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks) {
    let link = pick(b, 'link');
    if (!link) {
      const m = /<link[^>]*href="([^"]+)"/i.exec(b);
      link = m ? m[1] : '';
    }
    const title = pick(b, 'title');
    if (!title) continue;
    const date = pick(b, 'pubDate') || pick(b, 'published') || pick(b, 'updated') || pick(b, 'dc:date');
    const summary = (pick(b, 'description') || pick(b, 'summary')).slice(0, 600);
    items.push({
      sourceId: source.id,
      sourceName: source.name,
      official: !!source.official,
      region: source.region,
      lang: source.lang,
      title,
      link,
      summary,
      publishedAt: date ? new Date(date).toISOString() : new Date().toISOString(),
    });
  }
  return items;
}

async function collect(sources, { fetchImpl = fetch, timeoutMs = 15000 } = {}) {
  const items = [];
  const errors = [];
  for (const s of sources.filter((x) => x.enabled)) {
    try {
      const res = await fetchImpl(s.url, { signal: AbortSignal.timeout(timeoutMs), headers: { 'User-Agent': 'PostrNewsBot/0.1 (+contact on postr news website)' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      items.push(...parseFeed(await res.text(), s));
    } catch (e) {
      errors.push({ sourceId: s.id, error: String(e.message || e) });
    }
  }
  return { items, errors };
}

module.exports = { collect, parseFeed };
