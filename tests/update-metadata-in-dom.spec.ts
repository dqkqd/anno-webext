import { expect, test } from './fixtures';
import { annotateText } from './utils';

test('annotate text in element among siblings', async ({ annotatedUrls, context }) => {
  const page = await context.newPage();
  const urls = await annotatedUrls(`
  <html>
    <body>
      <p>Hello world</p>
      <div>Other content here</div>
    </body>
  </html>
`);
  await page.goto(urls[0]);
  await annotateText(page, 'Hello world');

  await page.locator('button').click();

  const metadata = await page.locator('li > span').textContent();
  const metadataNumber = Number(metadata);
  expect(metadataNumber).not.toBeNaN();

  // update the metadata number
  await page.locator('li > button').first().click();

  await expect(page.locator('li > span')).toHaveText(
    String(metadataNumber + 1),
  );
});
