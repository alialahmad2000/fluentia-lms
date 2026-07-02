// scripts/atelier-pdf/render-sara-plan.mjs
// Render Sara's July plan (Atelier Arabic HTML) → premium A4 RTL PDF.
// Mirrors the Atelier render recipe: waitUntil 'load' → document.fonts.ready → 1400ms → capture.
// Usage: node scripts/atelier-pdf/render-sara-plan.mjs
import { chromium } from 'playwright';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.join(__dirname, 'sara-july-plan.html');
const OUT = path.join(os.homedir(), 'Downloads', 'سارة-خطة-يوليو.pdf');
const PREVIEW = path.join(__dirname, 'preview.png');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });

await page.goto(pathToFileURL(HTML).href, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1400);

await page.pdf({ path: OUT, format: 'A4', printBackground: true, preferCSSPageSize: true });
await page.screenshot({ path: PREVIEW, fullPage: true });

await browser.close();
console.log('PDF:', OUT);
console.log('PREVIEW:', PREVIEW);
