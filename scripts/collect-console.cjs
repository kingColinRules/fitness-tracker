const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2] || 'http://localhost:5173/';
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => {
    logs.push({ type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', err => {
    logs.push({ type: 'pageerror', text: err.message });
  });
  page.on('requestfailed', req => {
    const failure = req.failure();
    logs.push({ type: 'requestfailed', text: `${req.method()} ${req.url()} - ${failure ? failure.errorText : 'unknown'}` });
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
  } catch (e) {
    logs.push({ type: 'navigation', text: String(e) });
  }

  if (logs.length === 0) {
    console.log('NO_CONSOLE_WARNINGS_OR_ERRORS');
  } else {
    logs.forEach(l => console.log(`${l.type.toUpperCase()}: ${l.text}`));
  }

  await browser.close();
  process.exit(0);
})();
