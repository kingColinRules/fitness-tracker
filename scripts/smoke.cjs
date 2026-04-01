const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2] || 'http://localhost:5173/';
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const result = { ok: true, checks: [] };
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Check title text
    const title = await page.locator('text=Exercise Tracker').first().textContent().catch(() => null);
    result.checks.push({ name: 'App title present', ok: !!title });
    if (!title) result.ok = false;

    // Check presence of main table or chart toggle
    const tableExists = await page.locator('table').count().then(c => c > 0).catch(() => false);
    const toggleExists = await page.locator('text=Table').count().then(c => c > 0).catch(() => false);
    result.checks.push({ name: 'Table or view toggle present', ok: tableExists || toggleExists });
    if (!(tableExists || toggleExists)) result.ok = false;

    // Try opening settings modal
    const settings = await page.locator('button[title="Open calendar"]').count(); // just ensure some controls exist
    result.checks.push({ name: 'Calendar control present', ok: settings > 0 });
    if (settings === 0) result.ok = false;

    // Capture console logs during the short session
    const logs = [];
    page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));
    await page.waitForTimeout(500);
    result.console = logs.slice(0, 20);
  } catch (e) {
    result.ok = false;
    result.error = String(e);
  }

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  process.exit(result.ok ? 0 : 2);
})();
