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

  const shot = async (name) => {
    await page.screenshot({ path: path.join(OUT, name) });
    console.log('✓', name);
  };

  // Agents (dashboard) widget
  await page.goto('http://localhost:8800', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    localStorage.setItem('agentdesk_widget_layout', JSON.stringify([
      { id: 'heartbeat', x: 80, y: 80, w: 580, h: 480 }
    ]));
  });
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(2000);
  await shot('26-widget-dashboard.png');

  // Task board widget
  await page.evaluate(() => {
    localStorage.setItem('agentdesk_widget_layout', JSON.stringify([
      { id: 'task-board', x: 80, y: 80, w: 580, h: 480 }
    ]));
  });
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(2000);
  await shot('27-widget-tasks.png');

  // Flow graph widget
  await page.evaluate(() => {
    localStorage.setItem('agentdesk_widget_layout', JSON.stringify([
      { id: 'flow-graph', x: 80, y: 80, w: 600, h: 500 }
    ]));
  });
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(2000);
  await shot('28-widget-graph.png');

  // Restore empty
  await page.evaluate(() => {
    localStorage.setItem('agentdesk_widget_layout', JSON.stringify([]));
  });

  await browser.close();
  console.log('Done!');
})();
