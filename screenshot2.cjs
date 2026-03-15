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

  const pressEsc = async () => { await page.keyboard.press('Escape'); await sleep(500); };

  // Click chapter in guide panel by title (not matching dock buttons)
  const clickChapter = async (title) => {
    await page.evaluate((t) => {
      // Find buttons with exactly 2 child spans (emoji + title pattern)
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => {
        const spans = b.querySelectorAll('span');
        if (spans.length !== 2) return false;
        return spans[1].textContent?.trim() === t;
      });
      if (btn) btn.click();
    }, title);
    await sleep(350);
  };

  // 01 desktop
  await shot('01-desktop.png');

  // 02 app menu
  await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'AgentDesk')?.click());
  await sleep(500);
  await shot('02-app-menu.png');
  await pressEsc(); await page.mouse.click(400,400); await sleep(300);

  // 03 right-click context menu
  await page.mouse.click(700, 400, { button: 'right' });
  await sleep(500);
  await shot('03-context-menu.png');
  await pressEsc(); await sleep(300);

  // 04 wallpaper picker
  await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'AgentDesk')?.click());
  await sleep(400);
  await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('배경화면'))?.click());
  await sleep(600);
  await shot('04-wallpaper-picker.png');
  // Close via backdrop click (top-left, outside the centered modal)
  await page.mouse.click(50, 300);
  await sleep(400);

  // 05 widget picker
  await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'AgentDesk')?.click());
  await sleep(400);
  await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('위젯 추가'))?.click());
  await sleep(600);
  await shot('05-widget-picker.png');
  // Close via backdrop click (top-left, outside centered modal)
  await page.mouse.click(50, 300);
  await sleep(400);

  // Verify widget picker closed
  const pickerOpen = await page.evaluate(() => !!document.querySelector('button:not([disabled])')?.closest('[style*="inset: 0"]') || document.body.textContent?.includes('[닫기]'));
  console.log('  widget picker still open?', pickerOpen);

  // 06-10 user guide
  await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === '?')?.click());
  await sleep(600);
  await shot('06-guide-getting-started.png');

  await clickChapter('바탕화면');
  await shot('07-guide-desktop.png');

  await clickChapter('에이전트');
  await shot('08-guide-agents.png');

  await clickChapter('단축키');
  await shot('09-guide-shortcuts.png');

  await clickChapter('위젯');  // This now safely only finds guide buttons (2 spans)
  await shot('10-guide-widgets.png');

  await pressEsc();
  await sleep(400);

  // 11 command palette (Ctrl+Shift+K)
  await page.keyboard.down('Control'); await page.keyboard.down('Shift'); await page.keyboard.press('k');
  await page.keyboard.up('Shift'); await page.keyboard.up('Control');
  await sleep(700);
  await shot('11-command-palette.png');
  await pressEsc(); await sleep(400);

  // 12-14 settings (g s)
  await page.keyboard.press('g'); await sleep(80); await page.keyboard.press('s'); await sleep(900);
  await shot('12-settings-general.png');
  await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'CLI')?.click());
  await sleep(400);
  await shot('13-settings-cli.png');
  await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('OAUTH') || b.textContent?.includes('OAuth'))?.click());
  await sleep(400);
  await shot('14-settings-oauth.png');

  // 15-17 library (g l)
  await page.keyboard.press('g'); await sleep(80); await page.keyboard.press('l'); await sleep(900);
  await shot('15-library-skills.png');
  await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Rules')?.click());
  await sleep(400);
  await shot('16-library-rules.png');
  await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Memory')?.click());
  await sleep(400);
  await shot('17-library-memory.png');

  // 18-20 workflow (g w)
  await page.keyboard.press('g'); await sleep(80); await page.keyboard.press('w'); await sleep(900);
  await shot('18-workflow-builder.png');
  await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Scheduled')?.click());
  await sleep(400);
  await shot('19-workflow-scheduled.png');
  await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Composition')?.click());
  await sleep(400);
  await shot('20-workflow-composition.png');

  // 21-22 chat (g c)
  await page.keyboard.press('g'); await sleep(80); await page.keyboard.press('c'); await sleep(900);
  await shot('21-chat-direct.png');
  await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Group')?.click());
  await sleep(400);
  await shot('22-chat-group.png');

  // 23 agent manager (g a)
  await page.keyboard.press('g'); await sleep(80); await page.keyboard.press('a'); await sleep(900);
  await shot('23-agent-manager.png');

  // 24 repl (g e)
  await page.keyboard.press('g'); await sleep(80); await page.keyboard.press('e'); await sleep(900);
  await shot('24-repl.png');

  // 25 mission control (Ctrl+Up)
  await page.keyboard.down('Control'); await page.keyboard.press('ArrowUp'); await page.keyboard.up('Control');
  await sleep(800);
  await shot('25-mission-control.png');

  await browser.close();
  console.log('Done!');
})();
