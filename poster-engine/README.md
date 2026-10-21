# Poster engine

Turns story data into finished Postr News posters: the six signature formats, in feed (1080 × 1350) and status/story (1080 × 1920) sizes, in English, Hindi and Marathi.

## Run it

```bash
cd poster-engine
npm install
npm run render        # renders examples/stories.json into out/
```

## How it works

1. **Validate** (`src/validate.js`): every story is checked against the brand book before rendering. A missing source, an exclamation mark, a headline over 8 words (3 for alerts) or a missing number assumption rejects the story. Rejected stories never become posters.
2. **Template** (`src/templates.js`): each format has one fixed layout, ground colour and text colour from `src/tokens.js`. Hindi and Marathi switch the headline face to Mukta.
3. **Render** (`src/render.js`): a headless browser draws each poster and saves a PNG named `<id>-<lang>-<size>.png`.

## Story fields

| Format | Required fields |
| --- | --- |
| `impact` | `headline` (≤8 words), `figure`, `assumptions`, `source`; optional `unit`, `note`, `panelLabel` |
| `alert` | `headline` (≤3 words in English), `time`, `source`; optional `note`, `place` |
| `number` | `value` + `unit` (≤4 characters together), `caption`, `source`; optional `share` (0–100) |
| `tracker` | `headline`, `then {label, value, note}`, `now {label, value, note}`, `source` |
| `myth` | `claim`, `verdict` (FAKE, TRUE or MISSING CONTEXT), `evidence` (≤14 words), `source` |
| `angles` | `headline`, exactly 3 `angles` `{text, outlet}`, `source` |

Every story also takes `id`, `lang` (`en`, `hi`, `mr`), `date` or `place`, and an optional `corrected` date, which adds the CORRECTED stamp.

## Fonts

Templates load Unbounded, Manrope and Mukta from Google Fonts, so the server needs internet access when rendering. Without it, posters render in fallback fonts.
