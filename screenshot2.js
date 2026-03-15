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

  const pressEsc = async () => {
    await page.keyboard.press('Escape');
    await sleep(400);
  };

  const clickBg = async () => {
    await page.mouse.click(400, 500);
    await sleep(400);
  };

  // 01 - desktop base
  await shot('01-desktop.png');

  // 02 - app menu
  await page.click('button[style*="AgentDesk"], button');
  // Find and click the AgentDesk text button
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent?.trim() === 'AgentDesk');
    if (btn) btn.click();
  });
  await sleep(500);
  await shot('02-app-menu.png');
  await pressEsc();
  await clickBg();

  // 03 - desktop right-click context menu
  await page.mouse.click(700, 400, { button: 'right' });
  await sleep(500);
  await shot('03-context-menu.png');
  await pressEsc();
  await clickBg();

  // 04 - wallpaper picker (via app menu)
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent?.trim() === 'AgentDesk');
    if (btn) btn.click();
  });
  await sleep(400);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent?.includes('배경화면'));
    if (btn) btn.click();
  });
  await sleep(600);
  await shot('04-wallpaper-picker.png');
  // Close by pressing Escape
  await pressEsc();
  await sleep(400);

  // 05 - widget picker (via app menu)
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent?.trim() === 'AgentDesk');
    if (btn) btn.click();
  });
  await sleep(400);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent?.includes('위젯 추가'));
    if (btn) btn.click();
  });
  await sleep(600);
  await shot('05-widget-picker.png');
  await pressEsc();
  await clickBg();

  // 06-10 - user guide chapters
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.getAttribute('aria-label') === 'Notifications' || b.title === '유저 가이드 (?)');
    // Find ? button
    const qBtn = btns.find(b => b.textContent?.trim() === '?');
    if (qBtn) qBtn.click();
  });
  await sleep(600);
  await shot('06-guide-getting-started.png');

  // Click 바탕화면 chapter
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent?.includes('바탕화면') && b.textContent?.length < 20);
    if (btn) btn.click();
  });
  await sleep(300);
  await shot('07-guide-desktop.png');

  // Click 에이전트 chapter
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent?.includes('에이전트') && b.textContent?.length < 20);
    if (btn) btn.click();
  });
  await sleep(300);
  await shot('08-guide-agents.png');

  // Click 단축키 chapter
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent?.includes('단축키') && b.textContent?.length < 20);
    if (btn) btn.click();
  });
  await sleep(300);
  await shot('09-guide-shortcuts.png');

  // Click 위젯 chapter
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent?.includes('위젯') && b.textContent?.length < 20);
    if (btn) btn.click();
  });
  await sleep(300);
  await shot('10-guide-widgets.png');

  // Close guide (Esc)
  await pressEsc();
  await sleep(400);

  // 11 - command palette
  await page.keyboard.down('Control');
  await page.keyboard.down('Shift');
  await page.keyboard.press('k');
  await page.keyboard.up('Shift');
  await page.keyboard.up('Control');
  await sleep(600);
  await shot('11-command-palette.png');
  await pressEsc();
  await sleep(400);

  // Open Settings window
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent?.includes('Settings') && b.closest('[class*="dock"], [style*="Dock"]'));
    if (!btn) {
      // try finding settings icon in dock area
      const icons = Array.from(document.querySelectorAll('button'));
      const s = icons.find(b => b.title === 'Settings' || b.getAttribute('aria-label') === 'Settings');
      if (s) s.click();
    } else {
      btn.click();
    }
  });
  // Try keyboard shortcut
  await page.keyboard.down('g');
  await page.keyboard.press('s');
  await page.keyboard.up('g');
  await sleep(800);
  await shot('12-settings-general.png');

  // Click CLI tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent?.trim() === 'CLI' || b.textContent?.trim() === '✦ CLI');
    if (btn) btn.click();
  });
  await sleep(400);
  await shot('13-settings-cli.png');

  // Click OAUTH tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent?.includes('OAUTH') || b.textContent?.includes('OAuth'));
    if (btn) btn.click();
  });
  await sleep(400);
  await shot('14-settings-oauth.png');

  // Open Library window (g l)
  await page.keyboard.down('g');
  await page.keyboard.press('l');
  await page.keyboard.up('g');
  await sleep(800);
  await shot('15-library-skills.png');

  // Click Rules tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent?.trim().toLowerCase() === 'rules' || b.textContent?.includes('Rules'));
    if (btn) btn.click();
  });
  await sleep(400);
  await shot('16-library-rules.png');

  // Click Memory tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent?.trim().toLowerCase() === 'memory' || b.textContent?.includes('Memory'));
    if (btn) btn.click();
  });
  await sleep(400);
  await shot('17-library-memory.png');

  // Open Workflow window (g w)
  await page.keyboard.down('g');
  await page.keyboard.press('w');
  await page.keyboard.up('g');
  await sleep(800);
  await shot('18-workflow-builder.png');

  // Scheduled tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent?.includes('Scheduled') || b.textContent?.includes('chedule'));
    if (btn) btn.click();
  });
  await sleep(400);
  await shot('19-workflow-scheduled.png');

  // Composition tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent?.includes('Composition') || b.textContent?.includes('omposition'));
    if (btn) btn.click();
  });
  await sleep(400);
  await shot('20-workflow-composition.png');

  // Chat window (g c)
  await page.keyboard.down('g');
  await page.keyboard.press('c');
  await page.keyboard.up('g');
  await sleep(800);
  await shot('21-chat-direct.png');

  // Group tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent?.trim().toLowerCase() === 'group' || b.textContent?.includes('Group'));
    if (btn) btn.click();
  });
  await sleep(400);
  await shot('22-chat-group.png');

  // Agent Manager (g a)
  await page.keyboard.down('g');
  await page.keyboard.press('a');
  await page.keyboard.up('g');
  await sleep(800);
  await shot('23-agent-manager.png');

  // REPL (g e)
  await page.keyboard.down('g');
  await page.keyboard.press('e');
  await page.keyboard.up('g');
  await sleep(800);
  await shot('24-repl.png');

  // Mission Control (Ctrl+Up)
  await page.keyboard.down('Control');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.up('Control');
  await sleep(800);
  await shot('25-mission-control.png');

  await browser.close();
  console.log('Done!');
})();
