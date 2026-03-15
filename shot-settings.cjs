const puppeteer = require('puppeteer');
const { setTimeout: sleep } = require('timers/promises');
const path = require('path');
const OUT = '/home/user/AgentDesk/docs/screen';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,768'],
    defaultViewport: { width: 1366, height: 768 },
    headless: true,
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:8800', { waitUntil: 'networkidle2' });
  await sleep(2000);

  const shot = async (name) => {
    await page.screenshot({ path: path.join(OUT, name) });
    console.log('✓', name);
  };

  const clickTabBySpan = async (label) => {
    await page.evaluate((l) => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => {
        const spans = b.querySelectorAll('span');
        return Array.from(spans).some(s => s.textContent?.trim() === l);
      });
      if (btn) btn.click();
    }, label);
    await sleep(400);
  };

  // Open settings via g+s
  await page.mouse.click(200, 400);
  await sleep(200);
  await page.keyboard.press('g');
  await sleep(80);
  await page.keyboard.press('s');
  await sleep(1000);
  await shot('12-settings-general.png');

  await clickTabBySpan('CLI');
  await shot('13-settings-cli.png');

  await clickTabBySpan('OAUTH');
  await shot('14-settings-oauth.png');

  await browser.close();
  console.log('Done!');
})();
