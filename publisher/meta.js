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
  const pub = await call('POST', `${igId}/media_publish`, { creation_id: container.id });
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

module.exports = { publishPoster, uploadToPage, postToInstagram, instagramQuota, pageToken };
