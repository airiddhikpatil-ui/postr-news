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
const { publishPoster, publishCarousel, publishReel, lookupAccount, recentMedia } = require('./meta');
const { renderReel } = require('./reel');
const { renderHype } = require('../poster-engine/src/hype');
const { buildCaption } = require('./caption');
const { pickCollaborators, logInvites } = require('./collab');
const { renderAll, renderCarousel, renderLabCarousel } = require('../poster-engine/src/render');

const gh = process.env.GITHUB_ACTIONS === 'true';
const note = (msg, level = 'notice') => {
  console.log(msg);
  if (gh) console.log(`::${level} title=Publish::${String(msg).replace(/[\r\n]+/g, ' ')}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Scheduled mode: post the next approved, not-yet-posted story from today's batch (India date).
// A batch is only posted after publisher/batches/<date>.approved exists, which is created on the owner's OK.
const COOLDOWN = path.join(__dirname, 'batches', 'cooldown.json');
async function postNext(outDir, targets) {
  if (fs.existsSync(COOLDOWN)) {
    const until = JSON.parse(fs.readFileSync(COOLDOWN, 'utf8')).until;
    if (Date.now() < Date.parse(until)) return note(`Cooling down after an Instagram restriction until ${until}; nothing posted.`);
  }
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
  // Never post the same story twice: if Instagram already has a post with this hook, record it and move on.
  if (targets.includes('instagram')) {
    const hook = String(next.captionHeadline || next.headline || '').replace(/\s+/g, ' ').trim();
    const dup = (await recentMedia()).find((m) => hook && String(m.caption || '').replace(/\s+/g, ' ').trim().startsWith(hook));
    if (dup) {
      posted.push({ id: next.id, at: dup.timestamp, instagram: dup.permalink, facebook: null, note: 'already on Instagram; not reposted' });
      fs.writeFileSync(postedFile, `${JSON.stringify(posted, null, 2)}\n`);
      note(`${next.id}: already on Instagram (${dup.permalink}); skipped to avoid a duplicate`, 'warning');
      return postNext(outDir, targets);
    }
  }
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
  const collaborators = targets.includes('instagram') ? pickCollaborators(next) : [];
  let r;
  try {
    r = await publishCarousel(files, { facebookCaption: buildCaption(next, 'facebook'), instagramCaption: buildCaption(next, 'instagram'), targets, collaborators });
  } catch (e) {
    // Instagram sometimes returns "we restrict certain activity" (2207051) even though the post went live.
    // Check before treating it as a block; only a post that truly failed triggers the cooldown.
    if (!/2207051|restrict certain activity/i.test(e.message)) throw e;
    await sleep(20000);
    const hook = String(next.captionHeadline || next.headline || '').replace(/\s+/g, ' ').trim();
    const live = (await recentMedia()).find((m) => String(m.caption || '').replace(/\s+/g, ' ').trim().startsWith(hook));
    if (!live) throw e;
    note(`${next.id}: Instagram returned a restriction warning but the post is live (${live.permalink})`, 'warning');
    r = { instagram: { permalink: live.permalink }, facebook: null, collaborators: [] };
  }
  if (r.collabError) note(`${next.id}: collab invite to ${collaborators.join(', ')} failed (${r.collabError}); posted without collaborators`, 'warning');
  if (r.collaborators && r.collaborators.length) { logInvites(next, r.collaborators, r.instagram && r.instagram.permalink); note(`${next.id}: collab invites sent to ${r.collaborators.join(', ')}`); }
  posted.push({ id: next.id, style, at: new Date().toISOString(), instagram: r.instagram && r.instagram.permalink, facebook: r.facebook && r.facebook.permalink });
  fs.writeFileSync(postedFile, `${JSON.stringify(posted, null, 2)}\n`);
  note(`${next.id} [${style}]: IG ${r.instagram ? r.instagram.permalink : '-'} | FB ${r.facebook ? r.facebook.permalink : '-'}`);
}

// Scheduled Reels: post the next not-yet-posted Reel from today's publisher/reels/<date>.json.
async function postNextReel(outDir, targets) {
  const date = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  const dir = path.join(__dirname, 'reels');
  // A queue (reels/queue.json) runs across days; otherwise use today's file.
  const queue = path.join(dir, 'queue.json');
  const useQueue = fs.existsSync(queue);
  const file = useQueue ? queue : path.join(dir, `${date}.json`);
  if (!fs.existsSync(file)) return note(`No Reels for ${date}.`);
  const postedFile = useQueue ? path.join(dir, 'queue.posted.json') : path.join(dir, `${date}.posted.json`);
  const posted = fs.existsSync(postedFile) ? JSON.parse(fs.readFileSync(postedFile, 'utf8')) : [];
  const reels = JSON.parse(fs.readFileSync(file, 'utf8'));
  const only = process.env.ONLY;
  const next = reels.find((r) => (only ? r.id === only : true) && !posted.some((p) => p.id === r.id));
  if (!next) return note(`All Reels for ${date} are posted.`);
  // A pre-rendered video (reel.video, path inside the repo) is posted as-is.
  const { file: mp4 } = next.video ? { file: path.join(__dirname, '..', next.video) }
    : next.kind === 'hype' ? await renderHype(next, outDir) : await renderReel(next, outDir);
  const fbCaption = next.sourceUrl ? `${next.caption}\n\n${next.sourceUrl}` : next.caption;
  const dryRun = process.env.DRY_RUN === 'true';
  let r;
  try {
    r = await publishReel(mp4, { facebookCaption: fbCaption, instagramCaption: next.caption, targets, dryRun });
  } catch (e) {
    if (!/2207051|restrict certain activity/i.test(e.message)) throw e;
    await sleep(20000);
    const hook = String(next.caption || '').split('\n')[0].trim();
    const live = (await recentMedia()).find((m) => String(m.caption || '').trim().startsWith(hook));
    if (!live) throw e;
    note(`${next.id}: Instagram returned a restriction warning but the Reel is live (${live.permalink})`, 'warning');
    r = { instagram: { permalink: live.permalink }, facebook: null };
  }
  if (r.dryRun) return note(`DRY RUN ${next.id}: uploaded and processed, nothing published (${JSON.stringify(r)})`);
  if (r.facebookError) note(`${next.id}: Facebook copy failed (${r.facebookError}); Instagram unaffected`, 'warning');
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

  if (job === 'collab-targets') {
    // Verify candidate pages through Meta's API and write config/collab-targets.json (keeps existing approvals).
    const root = path.join(__dirname, '..', 'config');
    const cands = JSON.parse(fs.readFileSync(path.join(root, 'collab-candidates.json'), 'utf8')).candidates;
    const outFile = path.join(root, 'collab-targets.json');
    const prev = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')).targets : [];
    const found = [];
    let missing = 0;
    for (const c of cands) {
      const a = await lookupAccount(c.username);
      if (!a || a.error || !a.username) { missing++; if (missing <= 3) note(`@${c.username}: ${a && a.error ? a.error : 'not found'}`, 'warning'); continue; }
      const old = prev.find((p) => p.username === a.username);
      found.push({ username: a.username, name: a.name || '', followers: a.followers_count, posts: a.media_count, topics: c.topics, cities: c.cities, approved: old ? old.approved : false, bio: (a.biography || '').slice(0, 120) });
      await sleep(400);
    }
    found.sort((x, y) => (y.followers || 0) - (x.followers || 0));
    fs.writeFileSync(outFile, `${JSON.stringify({ _note: 'Verified via Meta business discovery. Set approved: true on pages Postr may invite as collaborators.', checkedAt: new Date().toISOString(), targets: found }, null, 2)}\n`);
    note(`Collab targets: ${found.length} verified, ${missing} not found or not public business/creator accounts`);
    for (const f of found) note(`@${f.username} · ${f.followers} followers · ${f.topics.join('/')}${f.cities ? ` · ${f.cities[0]}` : ''}`);
    return;
  }

  if (job === 'post-next') {
    // Catch up when GitHub skipped a slot: if the last post is over 50 minutes old, post a second story 8 minutes later.
    const date = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
    const pf = path.join(__dirname, 'batches', `${date}.posted.json`);
    const before = fs.existsSync(pf) ? JSON.parse(fs.readFileSync(pf, 'utf8')) : [];
    const last = before.length ? Date.parse(before[before.length - 1].at) : 0;
    const behind = Date.now() - last > 150 * 60000;
    await postNext(outDir, targets);
    if (behind && Number(process.env.CATCH_UP || 0) > 0) {
      await sleep(8 * 60000);
      await postNext(outDir, targets);
    }
    return;
  }
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
  // Instagram's "we restrict certain activity" (2207051): stop all posting for 24 hours.
  if (/2207051|restrict certain activity/i.test(e.message)) {
    const until = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    fs.writeFileSync(COOLDOWN, `${JSON.stringify({ until, reason: e.message }, null, 2)}\n`);
    note(`Instagram restricted activity; posting paused until ${until}`, 'warning');
  }
  note(`FAILED: ${e.message}`, 'warning');
  process.exit(1);
});
