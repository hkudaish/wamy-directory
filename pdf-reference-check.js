const { chromium } = require('C:/Users/Admin/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const { pathToFileURL } = require('node:url');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 1 });
  const source = 'C:/Users/Admin/OneDrive/Desktop/تحويلات الموظفين ابريل 2026.pdf';
  await page.goto(pathToFileURL(source).href, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3000);
  console.log(JSON.stringify({ title: await page.title(), url: page.url(), body: (await page.locator('body').innerText()).slice(0, 500) }));
  await page.screenshot({ path: 'pdf-reference-browser.png', fullPage: false });
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
