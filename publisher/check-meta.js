#!/usr/bin/env node
// Checks that META_ACCESS_TOKEN can see your Facebook Page and its Instagram business account.
// Prints names and IDs only; never prints the token.
const fs = require('fs');
const path = require('path');

const token = process.env.META_ACCESS_TOKEN;
const accounts = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'accounts.json'), 'utf8'));
const pageId = process.env.FACEBOOK_PAGE_ID || accounts.meta.facebookPageId;
const G = 'https://graph.facebook.com';

async function get(p, params = {}) {
  const url = new URL(`${G}/${p}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('access_token', token);
  const res = await fetch(url);
  const body = await res.json();
  if (body.error) throw new Error(`${body.error.type || "Error"} (code ${body.error.code}, subcode ${body.error.error_subcode || "-"}): ${body.error.message}${body.error.error_user_msg ? " | " + body.error.error_user_msg : ""}`);
  return body;
}

(async () => {
  if (!token) {
    console.log('FAIL: META_ACCESS_TOKEN is not set. Add it in GitHub → Settings → Secrets and variables → Actions.');
    process.exit(1);
  }
  let ok = true;
  const step = async (name, fn) => {
    const gh = process.env.GITHUB_ACTIONS === 'true';
    const clean = (m) => String(m).replace(/[\r\n]+/g, ' ');
    try {
      const msg = `PASS: ${name}: ${await fn()}`;
      console.log(msg);
      if (gh) console.log(`::notice title=Meta check::${clean(msg)}`);
    } catch (e) {
      ok = false;
      const msg = `FAIL: ${name}: ${e.message}`;
      console.log(msg);
      if (gh) console.log(`::warning title=Meta check::${clean(msg)}`);
    }
  };
  await step('Token works', async () => { const me = await get('me', { fields: 'id,name' }); return `acting as "${me.name}"`; });
  if (!/^\d+$/.test(String(pageId))) {
    await step('Find your Page and Instagram IDs', async () => {
      const r = await get('me/accounts', { fields: 'id,name,instagram_business_account{id,username}' });
      if (!(r.data || []).length) throw new Error('this token cannot see any Facebook Page. Give the system user access to your Page (setup guide, step 4).');
      return r.data.map((p) => `Page "${p.name}" → facebookPageId ${p.id}; ${p.instagram_business_account ? `Instagram @${p.instagram_business_account.username} → instagramBusinessAccountId ${p.instagram_business_account.id}` : 'no Instagram linked to this Page yet'}`).join(' || ');
    });
    console.log('\nCopy the two IDs above into config/accounts.json, save, and run this check again.');
    process.exit(ok ? 0 : 1);
  }
  await step('Can see the Facebook Page', async () => { const p = await get(pageId, { fields: 'name' }); return `"${p.name}" (${pageId})`; });
  await step('Instagram is linked to the Page', async () => {
    const p = await get(pageId, { fields: 'instagram_business_account{id,username}' });
    if (!p.instagram_business_account) throw new Error('no Instagram business account is linked to this Page');
    const ig = p.instagram_business_account;
    return `@${ig.username}, Instagram business account ID ${ig.id} (this must match instagramBusinessAccountId in config/accounts.json)`;
  });
  await step('Permissions granted', async () => {
    const perms = await get('me/permissions');
    const granted = (perms.data || []).filter((x) => x.status === 'granted').map((x) => x.permission);
    const need = ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'pages_read_engagement', 'pages_manage_posts'];
    const missing = need.filter((n) => !granted.includes(n));
    if (missing.length) throw new Error(`missing: ${missing.join(', ')}`);
    return need.join(', ');
  });
  console.log(ok ? '\nAll checks passed: the system can post to your Page and Instagram.' : '\nSome checks failed. Read the FAIL lines and the Troubleshooting section of the setup guide.');
  process.exit(ok ? 0 : 1);
})();
