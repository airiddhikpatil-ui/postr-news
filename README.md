# Postr News

India's poster-first news app: every story as a designed poster that says what changed, what it means for you, and where it came from.

## What's in this repository

| Folder | What it is | Status |
| --- | --- | --- |
| `poster-engine/` | Story data in, brand-checked posters out (6 formats, 2 sizes, 3 languages) | v0.1 working |
| `newsroom/` | The loop that collects stories every 2–5 minutes, drafts them with AI, runs the red-team checks and routes them | v0.1 working, 7 tests passing |
| `review-bot/` | Telegram review queue for one-tap approvals | Planned |
| `publisher/` | Posting to the app database, Instagram and Facebook | Planned |
| `app/` | The Expo (React Native) Android app | Planned |

## Rules

- Never commit keys or passwords. Every secret lives in GitHub Actions secrets or the hosting dashboard, read from environment variables.
- Every poster must pass `poster-engine/src/validate.js`; the brand book's rules are code here.
