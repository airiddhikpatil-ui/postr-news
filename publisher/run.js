#!/usr/bin/env node
// Entry point for the Publish workflow.
//   JOB=preview-intro  → render the intro poster only (the workflow pushes it to the "previews" branch)
//   JOB=post-intro     → render and post the intro poster to Facebook and Instagram
// Results are printed and, on GitHub, also written as run annotations.
const { renderIntro, CAPTION } = require('./intro');
const { publishPoster } = require('./meta');

const gh = process.env.GITHUB_ACTIONS === 'true';
const note = (msg, level = 'notice') => {
  console.log(msg);
  if (gh) console.log(`::${level} title=Publish::${String(msg).replace(/[\r\n]+/g, ' ')}`);
};

(async () => {
  const job = process.env.JOB || 'preview-intro';
  const outDir = process.env.OUT_DIR || 'out';
  const file = await renderIntro(outDir);
  note(`Rendered ${file}`);
  if (job === 'preview-intro') return;
  if (job !== 'post-intro') throw new Error(`Unknown JOB ${job}`);
  const targets = (process.env.TARGETS || 'facebook,instagram').split(',').map((s) => s.trim());
  const r = await publishPoster(file, { facebookCaption: CAPTION, instagramCaption: CAPTION, targets });
  if (r.facebook) note(`Facebook posted: ${r.facebook.permalink || r.facebook.postId}`);
  if (r.instagram) note(`Instagram posted: ${r.instagram.permalink || r.instagram.mediaId}`);
})().catch((e) => {
  note(`FAILED: ${e.message}`, 'warning');
  process.exit(1);
});
