const { test, expect } = require('@playwright/test');

async function blockExternal(page) {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['127.0.0.1', 'localhost', '::1', new URL(process.env.BASE_URL || 'http://127.0.0.1:8796').hostname].includes(url.hostname)) return route.continue();
    return route.abort('blockedbyclient');
  });
}

async function open(page, path) {
  await blockExternal(page);
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
}

async function geometry(page) {
  return page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
}

for (const device of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'phone', width: 390, height: 844 },
]) {
  test(`${device.name} guest schedule separates private events, shared wedding question, and no-reply rehearsal`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: device.width, height: device.height });
    await open(page, '/prototype/concepts/combined.html?role=guest&scenario=S1&state=ready&section=weekend');
    await expect(page.getByRole('heading', { name: 'Your personal weekend' })).toBeVisible();
    await expect(page.locator('.schedule-row')).toHaveCount(6);
    await expect(page.getByText('Ceremony rehearsal', { exact: true })).toBeVisible();
    await expect(page.getByText('No reply needed', { exact: true })).toBeVisible();
    await expect(page.getByText(/One answer covers Ceremony and Reception/)).toHaveCount(2);
    await expect(page.getByText('Rehearsal dinner', { exact: true })).toBeVisible();
    const size = await geometry(page);
    expect(size.scrollWidth).toBeLessThanOrEqual(size.clientWidth + 1);
    await page.screenshot({ path: testInfo.outputPath(`${device.name}-guest-schedule.png`), fullPage: true });
  });

  test(`${device.name} shared wedding reply saves once and names both covered events`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: device.width, height: device.height });
    await open(page, '/prototype/concepts/combined.html?role=guest&scenario=S2&state=ready');
    await expect(page.getByRole('heading', { name: 'Wedding ceremony and reception' })).toBeVisible();
    await expect(page.getByText('Covers: Ceremony and Reception')).toBeVisible();
    await page.getByRole('radio', { name: 'Attending', exact: true }).check();
    const review = page.getByRole('region', { name: 'Review reply change' });
    await expect(review).toContainText('Eleanor Cárdenas-Ortega');
    await expect(review).toContainText('Ceremony and Reception');
    await page.screenshot({ path: testInfo.outputPath(`${device.name}-shared-question-review.png`), fullPage: true });
    await page.getByRole('button', { name: 'Save reply', exact: true }).click();
    await expect(page.locator('#product-frame').getByText(/Reply saved.*Wedding ceremony and reception.*Covers Ceremony and Reception/)).toBeVisible();
    await expect(page.locator('.saved-line')).toContainText('Attending');
    await page.getByRole('button', { name: 'Review all replies', exact: true }).click();
    await expect(page.getByText(/Eleanor Cárdenas-Ortega/).first()).toBeVisible();
    await expect(page.getByText(/Wedding ceremony and reception · Ceremony and Reception/).first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`${device.name}-shared-question-result.png`), fullPage: true });
  });

  test(`${device.name} organizer queue and event totals count people and questions, not schedule rows`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: device.width, height: device.height });
    await open(page, '/prototype/concepts/combined.html?role=organizer&scenario=S2&state=ready');
    await expect(page.getByText('Wedding ceremony and reception · Ceremony and Reception').first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`${device.name}-organizer-queue.png`), fullPage: true });
    await page.getByRole('button', { name: 'Events', exact: true }).click();
    await page.getByRole('button', { name: 'Ceremony Ready', exact: true }).click();
    await expect(page.getByText(/same person-level answer shared with Reception/)).toBeVisible();
    await expect(page.locator('.totals-strip')).toContainText('4');
    await expect(page.locator('.totals-strip')).toContainText('Attending');
    await expect(page.locator('.totals-strip')).toContainText('Unanswered');
    await expect(page.locator('.eligibility')).toHaveCount(8);
    const size = await geometry(page);
    expect(size.scrollWidth).toBeLessThanOrEqual(size.clientWidth + 1);
    await page.screenshot({ path: testInfo.outputPath(`${device.name}-organizer-totals.png`), fullPage: true });
  });
}

test('schedule-only event shows invited scope without reply totals and rejects response-mode rewrites', async ({ page }) => {
  await open(page, '/prototype/concepts/combined.html?role=organizer&scenario=S5&state=ready&section=events');
  await expect(page.getByRole('heading', { name: 'Ceremony rehearsal' })).toBeVisible();
  await expect(page.locator('.aggregate-status')).toHaveText('No reply needed');
  await expect(page.getByText(/1 person is invited.*does not create unanswered replies or attendance totals/i)).toBeVisible();
  await expect(page.locator('.totals-strip')).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit event', exact: true }).click();
  await page.getByLabel('Attendance response').selectOption('separate');
  await page.getByRole('button', { name: 'Mark ready' }).click();
  await expect(page.locator('#product-frame').getByText(/cannot change.*while invitations or replies exist/i)).toBeVisible();
});

test('new event defaults to a separate attendance question and can intentionally require no reply', async ({ page }) => {
  await open(page, '/prototype/concepts/combined.html?role=organizer&scenario=S1&state=ready&section=events');
  await page.getByRole('button', { name: 'Add event' }).click();
  await expect(page.getByLabel('Attendance response')).toHaveValue('separate');
  await page.getByLabel('Event name').fill('Fictional Monday walk');
  await page.getByLabel('Date').fill('2030-06-17');
  await page.getByLabel('Local start time').fill('09:00');
  await page.getByLabel('Location to follow').check();
  await page.getByLabel('Attendance response').selectOption('none');
  await page.getByRole('button', { name: 'Mark ready' }).click();
  await expect(page.locator('#product-frame').getByText(/Fictional Monday walk is ready.*No reply needed/i)).toBeVisible();
});

test('uncertain shared saves preserve both event totals until current truth is checked', async ({ page }) => {
  await open(page, '/prototype/concepts/combined.html?role=guest&scenario=S2&state=uncertain');
  await page.getByRole('radio', { name: 'Attending', exact: true }).check();
  await page.getByRole('button', { name: 'Save reply' }).click();
  await expect(page.locator('#product-frame').getByText(/Could not confirm.*Wedding ceremony and reception/)).toBeVisible();
  await page.getByRole('button', { name: 'Check saved reply' }).click();
  await expect(page.locator('#product-frame').getByText(/Current saved reply is unanswered.*proposed accepted was not saved/i)).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Attending', exact: true })).toBeChecked();
});
