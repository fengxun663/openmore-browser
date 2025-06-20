async function publishContent(page, content) {
  await page.click('.publish-btn');
  await page.type('.editor', content);
  await page.click('.submit-btn');
  await page.waitForSelector('.success-message');
}