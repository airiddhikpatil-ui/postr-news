# Carousel Autopilot: Setup and Operations Guide

Run an Instagram and Facebook page that posts beautifully designed news carousels on its own, up to six times a day, for free.

You write (or ask an AI to write) the day's stories once. The system designs every carousel, writes the caption, posts on schedule, avoids duplicates, and keeps a log of everything it posted.

**Time to set up:** about 60–90 minutes, once.
**Cost:** free. It runs on GitHub's free automation minutes and Meta's free posting tools.
**Skills needed:** none. If you can copy and paste and click buttons, you can do this.

---

## Contents

1. How it works (2-minute overview)
2. What you need before you start
3. Setup, step by step (Steps 1–8)
4. Your daily routine
5. Writing stories (the story file)
6. Pausing, resuming and changing post times
7. Optional extras: Reels, collaborations, photo-collage covers
8. Troubleshooting
9. Safety rules

---

## 1. How it works

Think of it as three parts working together:

| Part | What it does | Where it lives |
| --- | --- | --- |
| **The story file** | A list of the day's stories: headline, key numbers, facts, source. One file per day. | Your GitHub copy, in `publisher/batches/` |
| **The design engine** | Turns each story into a 3–5 page carousel. It picks a design style to match the topic: a passbook for money stories, a medicine strip for health, a road sign for road safety, a ballot for elections, and 11 more. | Runs inside GitHub, automatically |
| **The autopilot** | Six times a day it takes the next story, designs it, writes the caption and posts it to Instagram and Facebook. | GitHub Actions (free automation) |

Nothing posts unless you have **approved** that day's file. That is your safety switch.

---

## 2. What you need before you start

Create these free accounts first (all free):

- [ ] **A GitHub account**: github.com → Sign up.
- [ ] **An Instagram account** for your page, switched to a **Professional** account (Business or Creator).
- [ ] **A Facebook Page** for the same brand.
- [ ] **A Meta Business portfolio**: business.facebook.com → Create account. This is where you give the autopilot permission to post.
- [ ] **A Meta developer account**: developers.facebook.com → Get started, using the same Facebook login.

Tip: use a separate email for the brand if you want to keep it apart from your personal accounts.

---

## 3. Setup, step by step

### Step 1: Make your own copy

1. Open the Carousel Autopilot template link you were given.
2. Click the green **Use this template** button → **Create a new repository**.
3. Give it a name (for example `my-news-autopilot`), choose **Private**, and click **Create repository**.

You now have your own copy. Everything below happens in **your** copy.

### Step 2: Set your brand

1. In your copy, open the `config` folder → `brand.json` → click the **pencil icon** (Edit).
2. Change the values between the quotes:

| Setting | What to put | Example |
| --- | --- | --- |
| `name` | Your page's name | `"The Daily Frame"` |
| `shortName` | A short ALL-CAPS label printed on designs | `"FRAME"` |
| `instagramHandle` | Your Instagram username, without @ | `"thedailyframe"` |
| `hashtag` | Your brand hashtag | `"#TheDailyFrame"` |
| `tagline` | One short line about your page | `"News, designed."` |
| `followLine` | The follow message on the last page | `"FOLLOW FOR NEWS THAT HITS DIFFERENT"` |
| `timezoneOffsetMinutes` | Your timezone in minutes ahead of UTC | India `330`, UAE `240`, UK `0` |

3. Click **Commit changes** → **Commit changes**.

**Your logo (optional, recommended):** without a logo, the system prints your name in bold text. To use your own logo, upload two SVG files to `poster-engine/assets/`:
- `wordmark-ink.svg`: a dark logo, used on light backgrounds
- `wordmark-paper.svg`: a light logo, used on dark backgrounds

(Upload: open the folder → **Add file** → **Upload files**.)

### Step 3: Connect Instagram to your Facebook Page

1. In the Instagram app: **Settings → Account type and tools → Switch to professional account** (choose Business or Creator).
2. On Facebook, open your Page → **Settings → Linked accounts → Instagram → Connect**, and log in to your Instagram.

### Step 4: Give the autopilot permission to post (the important one)

This creates a robot user, called a "system user", that can post for your page. You do it once.

**A. Put your Page and Instagram in your Business portfolio**
1. Go to **business.facebook.com → Settings** (gear icon).
2. **Accounts → Pages → Add → Add a Page**, then choose your Page.
3. **Accounts → Instagram accounts → Add**, then log in to your Instagram.

**B. Create the app**
1. Go to **developers.facebook.com → My Apps → Create app**.
2. Choose **Other → Business** (or "Manage everything on your Page" if offered), name it (for example "Autopilot"), and choose your Business portfolio.
3. Inside the app, add the products **Instagram** (Instagram API with Facebook Login) and **Facebook Login for Business** if asked.

**C. Create the system user and its key**
1. Back in **business.facebook.com → Settings → Users → System users → Add**. Name it `autopilot`, role **Admin**.
2. Click **Assign assets**:
   - your **Page**, with full control (all switches on)
   - your **Instagram account**, with full control
   - your **App**, with full control
3. Click **Generate new token**:
   - App: your app
   - Expiry: **Never**
   - Tick these permissions: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `business_management`. Add `instagram_manage_insights` if you will use collaborations.
4. Copy the long token it shows. **Treat it like a password:** don't email it, screenshot it or paste it in any chat.

### Step 5: Store the key safely in GitHub

1. In your GitHub copy: **Settings → Secrets and variables → Actions → New repository secret**.
2. Name: `META_ACCESS_TOKEN`
3. Secret: paste the token. Click **Add secret**.

GitHub hides it from everyone, including you. The autopilot can use it, but nobody can read it back.

### Step 6: Find your IDs and check the connection

1. In your copy, click the **Actions** tab. If GitHub asks, click **I understand my workflows, go ahead and enable them**.
2. On the left, click **Check Meta connection → Run workflow → Run workflow**.
3. Wait about 30 seconds, then click the finished run. Under **Annotations** you will see a line like:
   `Page "The Daily Frame" → facebookPageId 1234…; Instagram @thedailyframe → instagramBusinessAccountId 1784…`
4. Open `config/accounts.json` → **Edit**, replace the two `PASTE_…` values with those numbers (keep the quotes), and commit.
5. Run **Check Meta connection** again. You want every line to say **PASS**.

### Step 7: Do a test run (nothing gets posted)

1. A sample file is included: `publisher/batches/EXAMPLE.json`.
2. **Actions → Publish → Run workflow**, then fill in:
   - job: `preview-batch`
   - batch: `EXAMPLE`
3. When it finishes, open the **Code** tab → branch dropdown → **previews**. You will see every page of every carousel as images. That is exactly what would be posted.

### Step 8: Switch on the autopilot

1. **Settings → Secrets and variables → Actions → Variables tab → New repository variable**.
2. Name: `POSTING_ENABLED`, Value: `true`. Save.

From now on the autopilot checks six times a day: 7:37 am, 10:37 am, 1:37 pm, 4:37 pm, 7:37 pm and 10:37 pm India time. Each time it posts the next story from **today's approved** file.

**Optional first post:** run **Publish** with job `post-intro` to publish a "hello" post introducing your page.

---

## 4. Your daily routine (10–20 minutes)

1. **Write tomorrow's stories** into a new file named with tomorrow's date, for example `publisher/batches/2026-11-02.json` (see Section 5). Aim for 6 stories to fill the 6 slots.
2. **Preview** it: Actions → Publish → `preview-batch`, batch `2026-11-02`, then check the **previews** branch.
3. **Approve** it: create an empty file named `2026-11-02.approved` in the same folder (**Add file → Create new file**, type the name, commit). Without this file, nothing from that day is posted.
4. **Next day, check what went out:** the system writes `2026-11-02.posted.json` with a link to every post.

---

## 5. Writing stories (the story file)

A story file is a list of stories. The easiest way to write one is to ask an AI assistant (like Claude) with this prompt:

> Write 6 stories for my news page as a JSON list, following the format of the example below exactly. Only use facts from reliable sources (government data, official statements, major newspapers), and put the source in `source` and the link in `sourceUrl`. Keep `coverHook` under 14 words. Each story needs 2–4 `slides`. Today's topics: [your topics]. Example: [paste one story from EXAMPLE.json]

Then read every story before approving. **You** are responsible for what gets published.

**The fields that matter most:**

| Field | What it is | Rule |
| --- | --- | --- |
| `id` | A short unique name, like `road-deaths-2024` | No spaces |
| `format` | `number`, `alert`, `impact`, `tracker`, `myth` or `angles` | Usually `number` |
| `value` | The big number (for `number` format) | **Max 4 characters**, like `73%` or `3MIN` |
| `coverBig` | Optional bigger text for the cover | Like `₹86,917 CR` |
| `caption` | What the number counts | One sentence |
| `coverHook` | The cover's headline | Under 14 words, no `!` |
| `captionHeadline` | First line of the Instagram caption | Must be new: it is also used to detect duplicates |
| `summary` | 2–4 sentences with the full facts | Shown in the caption |
| `forYou` | What it means for the reader | One or two sentences |
| `source` | Where the facts come from | **Required on every story** |
| `sourceUrl` | Link to the source | Added on Facebook |
| `cta` | Share prompt at the end of the caption | "Send this to…" |
| `tags` | 2–4 hashtag words, no # | `["RoadSafety", "India"]` |
| `slides` | The inside pages: 2 to 4 | Each has `label`, `title` (12 words max) and one of: `points` (up to 4), `stats` (up to 5), `body` (55 words max), or `"kind": "share"` |
| `style` | Optional: force a design style | `passbook`, `pharmacy`, `highway`, `ballot`, `labreport`, `calendar`, `headcount`, `exposed`, `extra`, `feed`, `swiss`, `dossier`, `forward`, `riso`, `scoreboard` |

If a story breaks a rule (too many words, missing source), the preview tells you exactly what to fix, and that story is never posted.

---

## 6. Pausing, resuming and changing post times

- **Pause everything:** Settings → Secrets and variables → Actions → Variables → set `POSTING_ENABLED` to `false`.
- **Resume:** set it back to `true`.
- **Skip one story:** remove it from the day's file before its slot.
- **Stop today immediately:** delete today's `.approved` file.
- **Change post times:** edit `.github/workflows/scheduled-posting.yml`, line `cron: '7 2,5,8,11,14,17 * * *'`. Times are in UTC; use crontab.guru to build a new one. Avoid minute `0` and `30`, because GitHub often delays those.

---

## 7. Optional extras

**Reels.** The system can turn a story into a short animated Reel and post it at 6:30 pm and 9:30 pm. Reels use their own files in `publisher/reels/`. Set the variable `REELS_ENABLED` = `true` only after you have a Reel file. This is an advanced feature; start without it.

**Collaboration invites.** It can add up to 2 related pages as "collaborators" on a post, so it can show to their followers too. Add pages to `config/collab-candidates.json` (replace the `example_page` line, following its pattern), run the **Collab targets** action, then set `"approved": true` on the pages you are happy to invite. Pages must accept each invite.

**Photo-collage covers.** A premium cover style with a black-and-white cut-out photo, torn paper strips and a crumpled colour background. It needs a photo with the background removed, prepared with the **Fetch studio assets** action. This is an advanced feature, best done with help from an AI assistant. If you use AI-generated photos, keep the "AI illustration" label on the design.

---

## 8. Troubleshooting

| What you see | What it means | What to do |
| --- | --- | --- |
| `No batch for 2026-11-02; nothing to post.` | No story file for today | Create today's file, or wait for tomorrow |
| `Batch … is not approved yet` | The `.approved` file is missing | Create the empty `YYYY-MM-DD.approved` file |
| `Batch … is fully posted.` | All of today's stories are out | Add more stories or wait for tomorrow |
| `already on Instagram; skipped to avoid a duplicate` | That caption headline was posted before | Write a new `captionHeadline` |
| `Instagram returned a restriction warning but the post is live` | Instagram showed a warning (code 2207051), but the post went up | Nothing to do. Keep the pace at 6 posts a day or fewer |
| `Cooling down after an Instagram restriction` | A post really failed with a restriction, so posting pauses for 24 hours | Wait. To resume early, delete `publisher/batches/cooldown.json` |
| `Error validating access token` or code `190` | The key stopped working | Generate a new token (Step 4C) and replace the secret (Step 5) |
| `missing: instagram_content_publish…` or code `10` / `200` | A permission was not ticked | Generate a new token with all permissions ticked |
| `text still too long after shrinking` | A headline or point is too long for the design | Shorten that text |
| `carousel: 2 to 4 detail pages…` | The story has too few or too many slides | Use 2 to 4 slides |
| A scheduled post is 10–30 minutes late | GitHub runs free schedules when it has capacity | Normal; nothing to do |

To see what happened in any run: **Actions** tab → click the run → **Annotations**.

---

## 9. Safety rules

1. **Never share your token.** It belongs only in GitHub Secrets. If you think it leaked, generate a new one in Step 4C straight away, which cancels the old one.
2. **Every fact needs a source.** The system refuses stories without one. Prefer official data and major newspapers. When you get something wrong, post a correction openly.
3. **Label AI images.** Never present an AI-generated photo as a real news photo.
4. **No fake engagement.** Don't buy followers, use engagement pods or post the same thing twice. Instagram detects this and reduces your reach.
5. **Stay within Instagram's limits.** Six posts a day is safe. Instagram also caps how many posts an account can publish through these tools in 24 hours.
6. **Stay fair.** Report facts about systems and decisions. Don't target communities or private individuals.

---

*Carousel Autopilot runs on GitHub Actions, the Meta Graph API (Instagram and Facebook) and Playwright for rendering. All of it is free to run at this volume. A private repository has about 2,000 free automation minutes a month; six posts a day uses about 400.*
