// Posts a rendered poster to the Postr News Facebook Page and Instagram account.
// Flow: upload the PNG to the Page (no public hosting needed), read back the photo's
// image URL, then hand that URL to Instagram's two-step publish (container, then publish).
// Never logs the token.
const fs = require('fs');
const path = require('path');

const VERSION = process.env.META_GRAPH_VERSION || 'v24.0';
const G = `https://graph.facebook.com/${VERSION}`;
const accounts = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'accounts.json'), 'utf8')).meta;

function token() {
  const t = process.env.META_ACCESS_TOKEN;
  if (!t) throw new Error('META_ACCESS_TOKEN is not set');
  return t;
}

async function call(method, p, params = {}, accessToken = token(), body) {
  const url = new URL(`${G}/${p}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('access_token', accessToken);
  const res = await fetch(url, { method, body });
  const json = await res.json();
  if (json.error) {
    const e = json.error;
    throw new Error(`${e.type || 'Error'} (code ${e.code}${e.error_subcode ? `/${e.error_subcode}` : ''}): ${e.error_user_msg || e.message}`);
  }
  return json;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Instagram sometimes says "media is not ready" (code 9007) just after processing finishes; wait and retry.
async function publishWhenReady(igId, creationId) {
  for (let i = 0; i < 8; i++) {
    try {
      return await call('POST', `${igId}/media_publish`, { creation_id: creationId });
    } catch (e) {
      if (!/code 9007/.test(e.message) || i === 7) throw e;
      await sleep(5000);
    }
  }
}

async function pageToken(pageId = accounts.facebookPageId) {
  const p = await call('GET', pageId, { fields: 'access_token' });
  if (!p.access_token) throw new Error('Could not get a Page token; check the system user has the Page assigned');
  return p.access_token;
}

// Upload a PNG to the Page. published=false keeps it off the Page timeline (used for Instagram-only posts).
async function uploadToPage(file, caption, { published = true, pageId = accounts.facebookPageId } = {}) {
  const pt = await pageToken(pageId);
  const form = new FormData();
  form.set('source', new Blob([fs.readFileSync(file)], { type: 'image/png' }), path.basename(file));
  if (caption) form.set('caption', caption);
  form.set('published', String(published));
  const up = await call('POST', `${pageId}/photos`, {}, pt, form);
  const photo = await call('GET', up.id, { fields: 'images' }, pt);
  const best = (photo.images || []).sort((a, b) => b.width - a.width)[0];
  let permalink = null;
  if (published && up.post_id) {
    permalink = (await call('GET', up.post_id, { fields: 'permalink_url' }, pt)).permalink_url || null;
  }
  return { photoId: up.id, postId: up.post_id || null, imageUrl: best && best.source, permalink };
}

async function instagramQuota(igId = accounts.instagramBusinessAccountId) {
  const r = await call('GET', `${igId}/content_publishing_limit`, { fields: 'quota_usage,config' });
  const d = (r.data || [])[0] || {};
  return { used: d.quota_usage ?? 0, total: (d.config && d.config.quota_total) || 50 };
}

async function postToInstagram(imageUrl, caption, igId = accounts.instagramBusinessAccountId) {
  const container = await call('POST', `${igId}/media`, { image_url: imageUrl, caption });
  for (let i = 0; i < 20; i++) {
    const s = await call('GET', container.id, { fields: 'status_code' });
    if (s.status_code === 'FINISHED') break;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`Instagram could not process the image (${s.status_code})`);
    await sleep(3000);
  }
  const pub = await publishWhenReady(igId, container.id);
  const media = await call('GET', pub.id, { fields: 'permalink' });
  return { mediaId: pub.id, permalink: media.permalink || null };
}

// targets: ['facebook', 'instagram'] in any combination.
async function publishPoster(file, { facebookCaption, instagramCaption, targets = ['facebook', 'instagram'] }) {
  const result = {};
  const toFb = targets.includes('facebook');
  const fb = await uploadToPage(file, toFb ? facebookCaption : undefined, { published: toFb });
  if (toFb) result.facebook = { postId: fb.postId, permalink: fb.permalink };
  if (targets.includes('instagram')) {
    const q = await instagramQuota();
    if (q.used >= q.total) throw new Error(`Instagram daily limit reached (${q.used}/${q.total})`);
    result.instagram = await postToInstagram(fb.imageUrl, instagramCaption);
  }
  return result;
}

async function waitReady(containerId) {
  for (let i = 0; i < 30; i++) {
    const s = await call('GET', containerId, { fields: 'status_code' });
    if (s.status_code === 'FINISHED') return;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`Instagram could not process an image (${s.status_code})`);
    await sleep(3000);
  }
  throw new Error('Instagram took too long to process the images');
}

// A carousel (2-10 pages): one Facebook post with all pages, and one Instagram carousel.
// Pages are uploaded to the Page unpublished first; their image URLs feed Instagram.
async function publishCarousel(files, { facebookCaption, instagramCaption, targets = ['facebook', 'instagram'], pageId = accounts.facebookPageId, igId = accounts.instagramBusinessAccountId }) {
  if (files.length < 2) return publishPoster(files[0], { facebookCaption, instagramCaption, targets });
  const pt = await pageToken(pageId);
  const uploads = [];
  for (const f of files) uploads.push(await uploadToPage(f, undefined, { published: false, pageId }));
  const result = {};
  if (targets.includes('instagram')) {
    const q = await instagramQuota(igId);
    if (q.used >= q.total) throw new Error(`Instagram daily limit reached (${q.used}/${q.total})`);
    const children = [];
    for (const u of uploads) {
      const c = await call('POST', `${igId}/media`, { image_url: u.imageUrl, is_carousel_item: 'true' });
      await waitReady(c.id);
      children.push(c.id);
    }
    const parent = await call('POST', `${igId}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption: instagramCaption });
    await waitReady(parent.id);
    const pub = await publishWhenReady(igId, parent.id);
    const media = await call('GET', pub.id, { fields: 'permalink' });
    result.instagram = { mediaId: pub.id, permalink: media.permalink || null };
  }
  if (targets.includes('facebook')) {
    const params = { message: facebookCaption };
    uploads.forEach((u, i) => { params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: u.photoId }); });
    const post = await call('POST', `${pageId}/feed`, params, pt);
    const link = await call('GET', post.id, { fields: 'permalink_url' }, pt);
    result.facebook = { postId: post.id, permalink: link.permalink_url || null };
  }
  return result;
}

// Reels: upload the MP4 to the Page as a published video, wait until Facebook has processed it,
// then give Instagram the video's source URL to publish as a Reel.
async function publishReel(file, { facebookCaption, instagramCaption, targets = ['facebook', 'instagram'], dryRun = false, pageId = accounts.facebookPageId, igId = accounts.instagramBusinessAccountId }) {
  const pt = await pageToken(pageId);
  const form = new FormData();
  form.set('source', new Blob([fs.readFileSync(file)], { type: 'video/mp4' }), path.basename(file));
  form.set('description', facebookCaption || '');
  form.set('published', String(targets.includes('facebook') && !dryRun));
  const url = new URL(`https://graph-video.facebook.com/${VERSION}/${pageId}/videos`);
  url.searchParams.set('access_token', pt);
  const res = await fetch(url, { method: 'POST', body: form });
  const up = await res.json();
  if (up.error) throw new Error(`Facebook video upload failed (code ${up.error.code}): ${up.error.error_user_msg || up.error.message}`);
  let video = {};
  for (let i = 0; i < 60; i++) {
    video = await call('GET', up.id, { fields: 'status,source,permalink_url' }, pt);
    if (video.status && video.status.video_status === 'error') throw new Error('Facebook could not process the video');
    if (video.source && video.status && video.status.video_status === 'ready') break;
    await sleep(5000);
  }
  if (!video.source) throw new Error('Facebook did not return a video URL in time');
  const result = {};
  if (targets.includes('facebook')) result.facebook = { videoId: up.id, permalink: video.permalink_url ? `https://www.facebook.com${video.permalink_url}` : null };
  if (targets.includes('instagram')) {
    // Direct (resumable) upload: Instagram receives the file itself, no public URL needed.
    const c = await call('POST', `${igId}/media`, { media_type: 'REELS', upload_type: 'resumable', caption: instagramCaption, share_to_feed: 'true' });
    const bytes = fs.readFileSync(file);
    const upRes = await fetch(c.uri || `https://rupload.facebook.com/ig-api-upload/${VERSION}/${c.id}`, {
      method: 'POST',
      headers: { Authorization: `OAuth ${token()}`, offset: '0', file_size: String(bytes.length) },
      body: bytes,
    });
    const upJson = await upRes.json().catch(() => ({}));
    if (!upRes.ok || upJson.success === false) throw new Error(`Instagram upload failed: ${JSON.stringify(upJson).slice(0, 300)}`);
    for (let i = 0; i < 60; i++) {
      const st = await call('GET', c.id, { fields: 'status_code,status' });
      if (st.status_code === 'FINISHED') break;
      if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') throw new Error(`Instagram could not process the Reel (${st.status_code}): ${st.status || ''}`);
      await sleep(5000);
    }
    if (dryRun) return { dryRun: true, facebookVideo: up.id, instagramContainer: c.id, note: 'processed but not published' };
    const pub = await publishWhenReady(igId, c.id);
    const media = await call('GET', pub.id, { fields: 'permalink' });
    result.instagram = { mediaId: pub.id, permalink: media.permalink || null };
  }
  return result;
}

module.exports = { publishReel, publishPoster, publishCarousel, uploadToPage, postToInstagram, instagramQuota, pageToken };
