#!/usr/bin/env node
// Entry point for the Publish workflow.
//   JOB=preview-intro            render the intro poster only (pushed to the "previews" branch)
//   JOB=post-intro               render and post the intro poster
//   JOB=preview-batch BATCH=x    render every story in publisher/batches/x.json (pushed to "previews")
//   JOB=post-batch    BATCH=x    render and post each story, GAP_MINUTES apart (default 4)
// Results are printed and, on GitHub, written as run annotations.
const fs = require('fs');
const path = require('path');
const { renderIntro, CAPTION } = require('./intro');
const { publishPoster, publishCarousel, publishReel } = require('./meta');
const { renderReel } = require('./reel');
const { buildCaption } = require('./caption');
const { renderAll, renderCarousel, renderLabCarousel } = require('../poster-engine/src/render');

const gh = process.env.GITHUB_ACTIONS === 'true';
const note = (msg, level = 'notice') => {
  console.log(msg);
  if (gh) console.log(`::${level} title=Publish::${String(msg).replace(/[\r\n]+/g, ' ')}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Scheduled mode: post the next approved, not-yet-posted story from today's batch (India date).
// A batch is only posted after publisher/batches/<date>.approved exists, which is created on the owner's OK.
async function postNext(outDir, targets) {
  const date = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  const dir = path.join(__dirname, 'batches');
  const batchFile = path.join(dir, `${date}.json`);
  if (!fs.existsSync(batchFile)) return note(`No batch for ${date}; nothing to post.`);
  if (!fs.existsSync(path.join(dir, `${date}.approved`))) return note(`Batch ${date} is not approved yet; nothing posted.`);
  const postedFile = path.join(dir, `${date}.posted.json`);
  const posted = fs.existsSync(postedFile) ? JSON.parse(fs.readFileSync(postedFile, 'utf8')) : [];
  const langs = (process.env.POST_LANGS || 'en').split(',').map((x) => x.trim());
  const stories = JSON.parse(fs.readFileSync(batchFile, 'utf8')).filter((s) => langs.includes(s.lang || 'en'));
  const next = stories.find((s) => !posted.some((p) => p.id === s.id));
  if (!next) return note(`Batch ${date} is fully posted.`);
  // Postr Lab designs by default; DESIGN=classic or story.design='classic' uses the original templates.
  const classic = process.env.DESIGN === 'classic' || next.design === 'classic';
  const prevStyle = posted.length ? posted[posted.length - 1].style : undefined;
  let r0 = classic ? { ...(await renderCarousel(next, outDir)), style: 'classic' } : await renderLabCarousel(next, outDir, { prevStyle });
  if (r0.errors.length && !classic) {
    note(`${next.id}: Lab design failed (${r0.errors.join('; ')}); using classic`, 'warning');
    r0 = { ...(await renderCarousel(next, outDir)), style: 'classic' };
  }
  const { files, errors, style } = r0;
  if (errors.length) throw new Error(`${next.id} failed the brand rules: ${errors.join('; ')}`);
  const r = await publishCarousel(files, { facebookCaption: buildCaption(next, 'facebook'), instagramCaption: buildCaption(next, 'instagram'), targets });
  posted.push({ id: next.id, style, at: new Date().toISOString(), instagram: r.instagram && r.instagram.permalink, facebook: r.facebook && r.facebook.permalink });
  fs.writeFileSync(postedFile, `${JSON.stringify(posted, null, 2)}\n`);
  note(`${next.id} [${style}]: IG ${r.instagram ? r.instagram.permalink : '-'} | FB ${r.facebook ? r.facebook.permalink : '-'}`);
}

// Scheduled Reels: post the next not-yet-posted Reel from today's publisher/reels/<date>.json.
async function postNextReel(outDir, targets) {
  const date = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  const dir = path.join(__dirname, 'reels');
  const file = path.join(dir, `${date}.json`);
  if (!fs.existsSync(file)) return note(`No Reels for ${date}.`);
  const postedFile = path.join(dir, `${date}.posted.json`);
  const posted = fs.existsSync(postedFile) ? JSON.parse(fs.readFileSync(postedFile, 'utf8')) : [];
  const reels = JSON.parse(fs.readFileSync(file, 'utf8'));
  const only = process.env.ONLY;
  const next = reels.find((r) => (only ? r.id === only : true) && !posted.some((p) => p.id === r.id));
  if (!next) return note(`All Reels for ${date} are posted.`);
  const { file: mp4 } = await renderReel(next, outDir);
  const fbCaption = next.sourceUrl ? `${next.caption}\n\n${next.sourceUrl}` : next.caption;
  const dryRun = process.env.DRY_RUN === 'true';
  const r = await publishReel(mp4, { facebookCaption: fbCaption, instagramCaption: next.caption, targets, dryRun });
  if (r.dryRun) return note(`DRY RUN ${next.id}: uploaded and processed, nothing published (${JSON.stringify(r)})`);
  posted.push({ id: next.id, at: new Date().toISOString(), instagram: r.instagram && r.instagram.permalink, facebook: r.facebook && r.facebook.permalink });
  fs.writeFileSync(postedFile, `${JSON.stringify(posted, null, 2)}\n`);
  note(`${next.id}: IG ${r.instagram ? r.instagram.permalink : '-'} | FB ${r.facebook ? r.facebook.permalink : '-'}`);
}

(async () => {
  const job = process.env.JOB || 'preview-intro';
  const outDir = process.env.OUT_DIR || 'out';
  const targets = (process.env.TARGETS || 'facebook,instagram').split(',').map((s) => s.trim());

  if (job.endsWith('-intro')) {
    const file = await renderIntro(outDir);
    note(`Rendered ${file}`);
    if (job === 'post-intro') {
      const r = await publishPoster(file, { facebookCaption: CAPTION, instagramCaption: CAPTION, targets });
      if (r.facebook) note(`Facebook posted: ${r.facebook.permalink || r.facebook.postId}`);
      if (r.instagram) note(`Instagram posted: ${r.instagram.permalink || r.instagram.mediaId}`);
    }
    return;
  }

  if (job === 'post-next') return postNext(outDir, targets);
  if (job === 'post-reel') return postNextReel(outDir, targets);

  const batch = process.env.BATCH;
  if (!batch) throw new Error('BATCH is required');
  const stories = JSON.parse(fs.readFileSync(path.join(__dirname, 'batches', `${batch}.json`), 'utf8'));
  const pagesById = {};
  let bad = 0;
  for (const st of stories) {
    const { files, errors } = await renderCarousel(st, outDir);
    if (errors.length) { bad++; note(`Rejected ${st.id}: ${errors.join('; ')}`, 'warning'); }
    pagesById[st.id] = files;
  }
  if (bad) throw new Error('Some stories failed the brand rules; nothing was posted');
  note(`Rendered ${stories.length} posts, ${Object.values(pagesById).flat().length} pages`);
  if (job === 'preview-batch') return;
  if (job !== 'post-batch') throw new Error(`Unknown JOB ${job}`);

  const gap = Number(process.env.GAP_MINUTES || 4) * 60000;
  const only = (process.env.ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
  const list = only.length ? stories.filter((s) => only.includes(s.id)) : stories;
  let failures = 0;
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    try {
      const r = await publishCarousel(pagesById[s.id], {
        facebookCaption: buildCaption(s, 'facebook'),
        instagramCaption: buildCaption(s, 'instagram'),
        targets,
      });
      note(`${s.id}: IG ${r.instagram ? r.instagram.permalink : '-'} | FB ${r.facebook ? r.facebook.permalink : '-'}`);
    } catch (e) {
      failures++;
      note(`${s.id}: FAILED ${e.message}`, 'warning');
    }
    if (i < list.length - 1) await sleep(gap);
  }
  if (failures) process.exit(1);
})().catch((e) => {
  note(`FAILED: ${e.message}`, 'warning');
  process.exit(1);
});
