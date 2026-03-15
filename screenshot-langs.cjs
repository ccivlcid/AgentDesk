const puppeteer = require('puppeteer');
const { setTimeout: sleep } = require('timers/promises');
const path = require('path');
const BASE_OUT = '/home/user/AgentDesk/docs/screen';

const LANGUAGES = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,768'],
    defaultViewport: { width: 1366, height: 768 },
    headless: true,
  });
  const page = await browser.newPage();

  const pressEsc = async () => { await page.keyboard.press('Escape'); await sleep(500); };
  const focusDesktop = async () => { await page.mouse.click(200, 400); await sleep(200); };
  const openWindow = async (key) => {
    await focusDesktop();
    await page.keyboard.press('g');
    await sleep(80);
    await page.keyboard.press(key);
    await sleep(900);
  };
  const closeTopWindow = async () => {
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button[data-testid="window-close-btn"]'));
      if (btns.length > 0) btns[btns.length - 1].click();
    });
    await sleep(500);
  };

  for (const lang of LANGUAGES) {
    const OUT = path.join(BASE_OUT, lang.code);
    const shot = async (name) => {
      await page.screenshot({ path: path.join(OUT, name) });
      console.log(`[${lang.code}] ✓ ${name}`);
    };

    console.log(`\n=== ${lang.label} (${lang.code}) ===`);

    // Load page and set language
    await page.goto('http://localhost:8800', { waitUntil: 'networkidle2' });
    await page.evaluate((code) => {
      localStorage.clear();
      localStorage.setItem('agentdesk.language', code);
      localStorage.setItem('agentdesk.language.user_set', 'true');
    }, lang.code);
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(1500);

    // 01: Desktop
    await shot('01-desktop.png');

    // 02: App menu
    await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'AgentDesk')?.click());
    await sleep(500);
    await shot('02-app-menu.png');
    await pressEsc();
    await sleep(300);

    // 03: Widget picker
    await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'AgentDesk')?.click());
    await sleep(400);
    await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('위젯 추가') || b.textContent?.includes('Add Widget') || b.textContent?.includes('ウィジェット') || b.textContent?.includes('添加'))?.click());
    await sleep(600);
    await shot('03-widget-picker.png');
    await page.mouse.click(50, 300);
    await sleep(400);

    // 04: Agent Manager
    await openWindow('a');
    await shot('04-agent-manager.png');
    await closeTopWindow();

    // 05: Settings
    await openWindow('s');
    await shot('05-settings.png');
    await closeTopWindow();

    // 06: Mission Control
    await focusDesktop();
    await page.keyboard.down('Control');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.up('Control');
    await sleep(800);
    await shot('06-mission-control.png');
    await pressEsc();
    await sleep(400);

    // 07: Agent widget
    await page.evaluate(() => {
      const layout = [{ id: 'heartbeat', x: 80, y: 80, w: 560, h: 460 }];
      localStorage.setItem('agentdesk_widget_layout', JSON.stringify(layout));
    });
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(1500);
    await shot('07-widget-agents.png');

    // 08: Agent create modal
    await page.evaluate(() => {
      localStorage.setItem('agentdesk_widget_layout', JSON.stringify([]));
    });
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(1000);
    await openWindow('a');
    await sleep(500);
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent?.includes('HIRE') || b.textContent?.includes('신규 채용'));
      if (btn) btn.click();
    });
    await sleep(700);
    await shot('08-agent-create.png');
    await pressEsc();
    await sleep(300);
    await closeTopWindow();
  }

  await browser.close();
  console.log('\nDone! Language screenshots complete.');
})();
