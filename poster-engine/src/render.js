#!/usr/bin/env node
// Usage: node src/render.js <stories.json> <outDir> [--sizes feed,story]
// Validates every story against the brand rules, then renders PNG posters.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { validate } = require('./validate');
const { renderHtml } = require('./templates');
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

module.exports = { renderAll };
