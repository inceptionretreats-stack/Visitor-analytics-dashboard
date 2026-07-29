// Headless screenshot harness for the dashboard.
// Launches Chrome with a FAKE camera stream so the live-feed panel renders,
// waits for the 3D scene + socket data, and saves a full-page PNG.
//
// Usage: node shot.mjs <url> <outfile> [waitMs]
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = process.argv[2] || 'http://localhost:5173/';
const out = process.argv[3] || 'shots/dashboard.png';
const waitMs = Number(process.argv[4] || 6000);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--enable-unsafe-swiftshader', // software WebGL for the Three.js globe
    '--ignore-gpu-blocklist',
    '--no-sandbox',
    '--window-size=1440,1100',
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });

const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }).catch((e) => {
  console.error('goto failed:', e.message);
});

await new Promise((r) => setTimeout(r, waitMs));

await page.screenshot({ path: out, fullPage: true });
console.log('saved', out);
if (errors.length) {
  console.log('--- console/page errors ---');
  for (const e of errors.slice(0, 25)) console.log(' ', e);
} else {
  console.log('no console errors');
}

await browser.close();
