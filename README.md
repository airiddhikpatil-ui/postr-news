# Carousel Autopilot

Designed news carousels for Instagram and Facebook, posted automatically, up to 6 times a day, free to run.

You write the day's stories once. The system:

- **designs** each story as a 3–5 page carousel, choosing from 15 art-directed styles (passbook, medicine strip, road sign, ballot paper, lab report and more) to match the topic
- **writes** the caption with the source and hashtags
- **posts** to Instagram and Facebook on schedule, only after you approve the day
- **guards** against duplicates and Instagram restrictions, and logs every post

## Start here

**→ Read the [Setup and Operations Guide](docs/SETUP-GUIDE.md).** It takes you from zero to your first automatic post in about an hour, with no coding.

Quick version:

1. **Use this template** → create your private copy.
2. Edit `config/brand.json` with your page's name and handle.
3. Create a Meta system user token and save it as the secret `META_ACCESS_TOKEN`.
4. Run **Actions → Check Meta connection**, then paste the two IDs it finds into `config/accounts.json`.
5. Preview the example: **Actions → Publish**, with job `preview-batch` and batch `EXAMPLE`.
6. Set the repository variable `POSTING_ENABLED` = `true`.

## What's inside

| Folder | What it is |
| --- | --- |
| `config/` | Your brand (`brand.json`) and account IDs (`accounts.json`). No secrets ever go here. |
| `publisher/batches/` | One story file per day (`YYYY-MM-DD.json`), its approval (`YYYY-MM-DD.approved`) and the posting log (`YYYY-MM-DD.posted.json`) |
| `poster-engine/` | The design engine: classic templates plus the Design Lab styles |
| `publisher/` | Captions, posting to Meta, Reels, collaboration invites |
| `.github/workflows/` | The automations: scheduled posting, Reels, previews, connection check |

## Rules

- Secrets live only in GitHub Secrets. Never commit tokens.
- Every story must name its source; the engine rejects stories without one.
- AI-generated images must be labelled as illustrations.
