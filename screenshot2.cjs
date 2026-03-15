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

  // Click desktop background to ensure focus is on body (not an input)
  const focusDesktop = async () => {
    await page.mouse.click(200, 400);
    await sleep(200);
  };

  // Close the topmost AppWindow (clicking its 닫기 button)
  const closeTopWindow = async () => {
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button[title="닫기"]'));
      if (btns.length > 0) btns[btns.length - 1].click();
    });
    await sleep(500);
  };

  // Click chapter in guide panel by title (not matching dock buttons)
  const clickChapter = async (title) => {
    await page.evaluate((t) => {
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

  // Open window via g+key chord (ensure desktop has focus first)
  const openWindow = async (key) => {
    await focusDesktop();
    await page.keyboard.press('g');
    await sleep(80);
    await page.keyboard.press(key);
    await sleep(900);
  };

  // Click a tab by matching its inner span text (handles sigil + label pattern)
  const clickTab = async (label) => {
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

  // ── 01 desktop ────────────────────────────────────────────────────────────
  await shot('01-desktop.png');

  // ── 02 app menu ───────────────────────────────────────────────────────────
  await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'AgentDesk')?.click());
  await sleep(500);
  await shot('02-app-menu.png');
  await pressEsc(); await focusDesktop();

  // ── 03 right-click context menu ───────────────────────────────────────────
  await page.mouse.click(700, 400, { button: 'right' });
  await sleep(500);
  await shot('03-context-menu.png');
  await pressEsc(); await sleep(300);

  // ── 04 wallpaper picker ───────────────────────────────────────────────────
  await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'AgentDesk')?.click());
  await sleep(400);
  await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('배경화면'))?.click());
  await sleep(600);
  await shot('04-wallpaper-picker.png');
  await page.mouse.click(50, 300);
  await sleep(400);

  // ── 05 widget picker ──────────────────────────────────────────────────────
  await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'AgentDesk')?.click());
  await sleep(400);
  await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('위젯 추가'))?.click());
  await sleep(600);
  await shot('05-widget-picker.png');
  await page.mouse.click(50, 300);
  await sleep(500);

  // ── 06-10 user guide ──────────────────────────────────────────────────────
  await focusDesktop();
  await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === '?')?.click());
  await sleep(600);
  await shot('06-guide-getting-started.png');

  await clickChapter('바탕화면');
  await shot('07-guide-desktop.png');

  await clickChapter('에이전트');
  await shot('08-guide-agents.png');

  await clickChapter('단축키');
  await shot('09-guide-shortcuts.png');

  await clickChapter('위젯');
  await shot('10-guide-widgets.png');

  await pressEsc();
  await sleep(400);

  // ── 11 command palette (Ctrl+Shift+K) ─────────────────────────────────────
  await focusDesktop();
  await page.keyboard.down('Control');
  await page.keyboard.down('Shift');
  await page.keyboard.press('K');
  await page.keyboard.up('Shift');
  await page.keyboard.up('Control');
  await sleep(700);
  await shot('11-command-palette.png');
  await pressEsc();
  await sleep(400);

  // ── 12-14 Settings ────────────────────────────────────────────────────────
  await openWindow('s');
  await shot('12-settings-general.png');
  await clickTab('CLI');
  await shot('13-settings-cli.png');
  await page.evaluate(() => Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('OAUTH') || b.textContent?.includes('OAuth'))?.click());
  await sleep(400);
  await shot('14-settings-oauth.png');
  await closeTopWindow();

  // ── 15-17 Library ─────────────────────────────────────────────────────────
  await openWindow('l');
  await shot('15-library-skills.png');
  await clickTab('Rules');
  await shot('16-library-rules.png');
  await clickTab('Memory');
  await shot('17-library-memory.png');
  await closeTopWindow();

  // ── 18-20 Workflow ────────────────────────────────────────────────────────
  await openWindow('w');
  await shot('18-workflow-builder.png');
  await clickTab('Scheduled');
  await shot('19-workflow-scheduled.png');
  await clickTab('Composition');
  await shot('20-workflow-composition.png');
  await closeTopWindow();

  // ── 21-22 Chat ────────────────────────────────────────────────────────────
  await openWindow('c');
  await shot('21-chat-direct.png');
  await clickTab('Group');
  await shot('22-chat-group.png');
  await closeTopWindow();

  // ── 23 Agent Manager ─────────────────────────────────────────────────────
  await openWindow('a');
  await shot('23-agent-manager.png');
  await closeTopWindow();

  // ── 24 REPL ───────────────────────────────────────────────────────────────
  await openWindow('e');
  await shot('24-repl.png');
  await closeTopWindow();

  // ── 25 Mission Control (Ctrl+Up) ──────────────────────────────────────────
  await focusDesktop();
  await page.keyboard.down('Control');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.up('Control');
  await sleep(800);
  await shot('25-mission-control.png');
  await pressEsc();
  await sleep(400);

  // ── 26 Agents widget (dashboard) ─────────────────────────────────────────
  await page.evaluate(() => {
    const layout = [{ id: 'heartbeat', x: 80, y: 80, w: 580, h: 480 }];
    localStorage.setItem('agentdesk_widget_layout', JSON.stringify(layout));
  });
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(2000);
  await shot('26-widget-dashboard.png');

  // ── 27 Task board widget ──────────────────────────────────────────────────
  await page.evaluate(() => {
    const layout = [{ id: 'task-board', x: 80, y: 80, w: 580, h: 480 }];
    localStorage.setItem('agentdesk_widget_layout', JSON.stringify(layout));
  });
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(2000);
  await shot('27-widget-tasks.png');

  // ── 28 Flow graph widget ──────────────────────────────────────────────────
  await page.evaluate(() => {
    const layout = [{ id: 'flow-graph', x: 80, y: 80, w: 600, h: 500 }];
    localStorage.setItem('agentdesk_widget_layout', JSON.stringify(layout));
  });
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(2000);
  await shot('28-widget-graph.png');

  // Restore empty widget layout
  await page.evaluate(() => {
    localStorage.setItem('agentdesk_widget_layout', JSON.stringify([]));
  });

  await browser.close();
  console.log('Done!');
})();
