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
const { publishPoster } = require('./meta');
const { buildCaption } = require('./caption');
const { renderAll } = require('../poster-engine/src/render');

const gh = process.env.GITHUB_ACTIONS === 'true';
const note = (msg, level = 'notice') => {
  console.log(msg);
  if (gh) console.log(`::${level} title=Publish::${String(msg).replace(/[\r\n]+/g, ' ')}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

  const batch = process.env.BATCH;
  if (!batch) throw new Error('BATCH is required');
  const stories = JSON.parse(fs.readFileSync(path.join(__dirname, 'batches', `${batch}.json`), 'utf8'));
  const report = await renderAll(stories, outDir, ['feed']);
  for (const x of report.rejected) note(`Rejected ${x.id}: ${x.errors.join('; ')}`, 'warning');
  if (report.rejected.length) throw new Error('Some stories failed the brand rules; nothing was posted');
  note(`Rendered ${report.rendered.length} posters`);
  if (job === 'preview-batch') return;
  if (job !== 'post-batch') throw new Error(`Unknown JOB ${job}`);

  const gap = Number(process.env.GAP_MINUTES || 4) * 60000;
  const only = (process.env.ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
  const list = only.length ? stories.filter((s) => only.includes(s.id)) : stories;
  let failures = 0;
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    const file = path.join(outDir, `${s.id}-${s.lang || 'en'}-feed.png`);
    try {
      const r = await publishPoster(file, {
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
