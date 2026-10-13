#!/usr/bin/env node
// Usage: node src/render.js <stories.json> <outDir> [--sizes feed,story]
// Validates every story against the brand rules, then renders PNG posters.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { validate } = require('./validate');
const { renderHtml, renderSlideHtml } = require('./templates');
const T = require('./tokens');

async function renderAll(stories, outDir, sizes = ['feed', 'story']) {
  fs.mkdirSync(outDir, { recursive: true });
  const report = { rendered: [], rejected: [] };
  const browser = await chromium.launch();
  try {
    for (const story of stories) {
      const errors = validate(story);
      if (errors.length) {
        report.rejected.push({ id: story.id, errors });
        continue;
      }
      for (const size of sizes) {
        const height = size === 'story' ? T.canvas.storyHeight : T.canvas.feedHeight;
        const page = await browser.newPage({ viewport: { width: T.canvas.width, height } });
        await page.setContent(renderHtml(story, size), { waitUntil: 'load', timeout: 15000 }).catch(() => {});
        // Wait for brand fonts if the server can reach them; fall back after 5s.
        await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 5000))]));
        // Shrink oversized display numbers until they fit the 936px text column.
        await page.evaluate(() => document.querySelectorAll('.fit').forEach((el) => {
          let px = parseFloat(getComputedStyle(el).fontSize);
          while (el.scrollWidth > el.clientWidth && px > 36) { px -= 8; el.style.fontSize = `${px}px`; el.style.letterSpacing = `${-px / 16}px`; }
        }));
        const file = path.join(outDir, `${story.id}-${story.lang || 'en'}-${size}.png`);
        await page.screenshot({ path: file });
        await page.close();
        report.rendered.push(file);
      }
    }
  } finally {
    await browser.close();
  }
  return report;
}

if (require.main === module) {
  const [input, outDir = 'out'] = process.argv.slice(2);
  const sizesArg = process.argv.find((a) => a.startsWith('--sizes='));
  const sizes = sizesArg ? sizesArg.split('=')[1].split(',') : ['feed', 'story'];
  if (!input) {
    console.error('Usage: node src/render.js <stories.json> <outDir> [--sizes=feed,story]');
    process.exit(1);
  }
  const stories = JSON.parse(fs.readFileSync(input, 'utf8'));
  renderAll(stories, outDir, sizes).then((r) => {
    console.log(`Rendered ${r.rendered.length} posters`);
    for (const x of r.rejected) console.log(`Rejected ${x.id}: ${x.errors.join('; ')}`);
    process.exit(r.rejected.length ? 2 : 0);
  });
}

// Renders a story as a carousel: the format poster as page 1, then its detail pages.
// Returns the PNG paths in order: <id>-<lang>-p1.png, -p2.png, ...
async function renderCarousel(story, outDir) {
  const errors = validate(story);
  if (errors.length) return { files: [], errors };
  fs.mkdirSync(outDir, { recursive: true });
  const slides = story.slides || [];
  const total = slides.length + 1;
  const pages = [renderHtml({ ...story, _page: total > 1 ? 1 : undefined, _total: total > 1 ? total : undefined }, 'feed')]
    .concat(slides.map((sl, i) => renderSlideHtml(story, sl, i + 2, total)));
  const browser = await chromium.launch();
  const files = [];
  try {
    for (let i = 0; i < pages.length; i++) {
      const page = await browser.newPage({ viewport: { width: T.canvas.width, height: T.canvas.feedHeight } });
      await page.setContent(pages[i], { waitUntil: 'load', timeout: 15000 }).catch(() => {});
      await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 5000))]));
      await page.evaluate(() => document.querySelectorAll('.fit').forEach((el) => {
        let px = parseFloat(getComputedStyle(el).fontSize);
        while (el.scrollWidth > el.clientWidth && px > 36) { px -= 8; el.style.fontSize = `${px}px`; el.style.letterSpacing = `${-px / 16}px`; }
      }));
      // Flag pages whose text runs past the bottom margin instead of shipping them cut off.
      const overflow = await page.evaluate(() => { const p = document.querySelector('.poster'); return p.scrollHeight > p.clientHeight + 2; });
      if (overflow) errors.push(`page ${i + 1}: text overflows the page; shorten it`);
      const file = path.join(outDir, `${story.id}-${story.lang || 'en'}-p${i + 1}.png`);
      await page.screenshot({ path: file });
      await page.close();
      files.push(file);
    }
  } finally {
    await browser.close();
  }
  return { files, errors };
}

module.exports = { renderAll, renderCarousel };
