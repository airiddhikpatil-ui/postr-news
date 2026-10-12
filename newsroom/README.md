# Newsroom loop

Runs every 2–5 minutes and turns fresh news into checked, rendered posters waiting for publishing or your approval.

```
collect → cluster → score → route → AI write → code checks → validate → red team → render → queue
```

| Step | File | What it does |
| --- | --- | --- |
| Collect | `src/collect.js` | Reads enabled feeds in `config/sources.json`; keeps titles, links, dates and short summaries only |
| Cluster | `src/cluster.js` | Groups the same story from different outlets |
| Score | `src/cluster.js` | Ranks by usefulness: money, daily life, weather, official action, number of outlets, freshness. Celebrity gossip is pushed below the threshold |
| Route | `src/route.js` | `editor` for sensitive topics (people, crime, courts, elections, religion, health); `auto` for official sources once that category has earned it; `one-tap` for the rest |
| Write | `src/ai.js` | The AI fills a fixed poster form using only the sources, with a word-for-word quote for every fact |
| Calculate | `src/calc.js` | ₹ impact figures are computed in code from the rate change; the AI never writes them |
| Code checks | `src/ai.js` | Every quote must exist in the sources; every number on the poster must appear in the sources |
| Validate | `../poster-engine/src/validate.js` | The brand book's poster rules |
| Red team | `src/ai.js` | A second, stronger model tries to find reasons not to publish |
| Render | `../poster-engine` | Feed and status images for everything that passed |

Results are saved to `data/state.json` with a status: `ready-to-publish`, `needs-approval`, `rejected` or `skipped`.

## Run

```bash
npm test                 # 7 tests, no API key needed
AI_API_KEY=... npm run once
AI_API_KEY=... npm run watch   # loops every LOOP_MINUTES (default 3)
```

## Settings (environment variables)

| Name | Default | Meaning |
| --- | --- | --- |
| `AI_API_KEY` | none | Anthropic API key; set it in hosting secrets, never in code |
| `AI_WRITER_MODEL` | `claude-haiku-5-5` | Model for drafting |
| `AI_REDTEAM_MODEL` | `claude-sonnet-5-5` | Model for checking |
| `MAX_PER_RUN` | 10 | Stories drafted per loop |
| `MIN_SCORE` | 4 | Usefulness threshold |
| `AUTO_CATEGORIES` | empty | Set to `official` only after 200+ official posters with zero corrections |
| `LOOP_MINUTES` | 3 | Loop interval in watch mode |

## Before going live

Every source in `config/sources.json` starts disabled. Open each URL, confirm it is the official feed, read its terms, then enable it.
