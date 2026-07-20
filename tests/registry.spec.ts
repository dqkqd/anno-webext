import { expect, test } from './fixtures';
import { annotateText } from './utils';

test('query annotation after added', async ({ annotatedUrls, context }) => {
  const page = await context.newPage();
  const urls = await annotatedUrls(`
  <html>
    <body>
      <span>Hello world</span>
      <div>Other content here</div>
    </body>
  </html>
`);
  await page.goto(urls[0]);

  // no content hover at first
  await expect(page.locator('#hover')).toHaveText('');

  await annotateText(page, 'Hello world');

  // hover annotated text => show
  await page.getByText('Hello', { exact: false }).first().hover();
  await expect(page.locator('#hover')).toHaveText('Hello world');

  // Move mouse out => hide
  await page.mouse.move(100, 100);
  await expect(page.locator('#hover')).toHaveText('');
});

test('query annotation then switch to other annotation', async ({ annotatedUrls, context }) => {
  const page = await context.newPage();
  const urls = await annotatedUrls(`
  <html>
    <body>
      <p>
        <span>one</span>
      </p>
      <p>
        <span>two</span>
      </p>
      <p>
        <span>three</span>
      </p>
    </body>
  </html>
`);
  await page.goto(urls[0]);
  await annotateText(page, 'one');
  await annotateText(page, 'two');
  await annotateText(page, 'three');

  // no content hover at first
  await expect(page.locator('#hover')).toHaveText('');

  await page.getByText('one').first().hover();
  await expect(page.locator('#hover')).toHaveText('one');

  await page.getByText('two').first().hover();
  await expect(page.locator('#hover')).toHaveText('two');

  await page.getByText('three').first().hover();
  await expect(page.locator('#hover')).toHaveText('three');

  // Move mouse out => hide
  await page.mouse.move(100, 100);
  await expect(page.locator('#hover')).toHaveText('');
});

test('query annotations on page load', async ({ annotatedUrls, context }) => {
  const page = await context.newPage();
  const urls = await annotatedUrls(`
  <html>
    <body>
      <p>
        <span>one</span>
      </p>
      <p>
        <span>two</span>
      </p>
      <p>
        <span>three</span>
      </p>
    </body>
  </html>
`);
  await page.goto(urls[0]);
  await annotateText(page, 'one');
  await annotateText(page, 'two');

  await page.reload();

  // no content hover at first
  await expect(page.locator('#hover')).toHaveText('');

  await page.getByText('one').first().hover();
  await expect(page.locator('#hover')).toHaveText('one');

  await page.getByText('two').first().hover();
  await expect(page.locator('#hover')).toHaveText('two');

  // add three
  await annotateText(page, 'three');
  await page.getByText('three').first().hover();
  await expect(page.locator('#hover')).toHaveText('three');
});
