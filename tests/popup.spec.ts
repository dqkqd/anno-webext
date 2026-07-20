import { expect, test } from './fixtures';
import { annotateText } from './utils';

test('basic popup', async ({ annotatedUrls, context, popupUrl }) => {
  const page = await context.newPage();
  const urls = await annotatedUrls(
    `
  <html>
    <body>
      <h1>Page1<h1>
      <p>One one</p>
    </body>
  </html>
`,
    `
  <html>
    <body>
      <h1>Page2<h1>
      <p>Two two</p>
    </body>
  </html>
`,
  );
  await page.goto(popupUrl);
  await expect(page.locator('body')).toContainText('No annotations saved yet.');

  // Select one
  await page.goto(urls[0]);
  await annotateText(page, 'one');

  // Select Two
  await page.goto(urls[1]);
  await annotateText(page, 'Two');

  await page.goto(popupUrl);
  await expect(page.locator('body')).not.toContainText(
    'No annotations saved yet.',
  );
  // There are url and 2 cards
  await expect(page.locator('body')).toContainText(urls[0]);
  await expect(page.locator('body')).toContainText('one');
  await expect(page.locator('body')).toContainText(urls[1]);
  await expect(page.locator('body')).toContainText('Two');
});

test('update metadata', async ({ annotatedUrls, context, popupUrl }) => {
  const page = await context.newPage();
  const urls = await annotatedUrls(
    `
  <html>
    <body>
      <h1>Page1<h1>
      <p>One one</p>
    </body>
  </html>
`,
    `
  <html>
    <body>
      <h1>Page2<h1>
      <p>Two two</p>
    </body>
  </html>
`,
  );
  await page.goto(urls[0]);
  await annotateText(page, 'one');

  await page.goto(popupUrl);
  const metadata = await page.locator('li > span:nth-child(2)').textContent();
  const metadataNumber = Number(metadata);
  expect(metadataNumber).not.toBeNaN();

  // update the metadata number
  await page.locator('li > button').first().click();

  await expect(page.locator('li > span:nth-child(2)')).toHaveText(
    String(metadataNumber + 1),
  );
});
