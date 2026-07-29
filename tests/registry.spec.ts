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

  await annotateText(page, (document) => {
    const span = document.querySelector('span')!;
    const range = document.createRange();
    range.setStart(span.firstChild!, 0);
    range.setEnd(span.firstChild!, 11);
    return range;
  });

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
  await annotateText(page, (document) => {
    const span = document.querySelectorAll('span')[0];
    const range = document.createRange();
    range.setStart(span.firstChild!, 0);
    range.setEnd(span.firstChild!, 3);
    return range;
  });
  await annotateText(page, (document) => {
    const span = document.querySelectorAll('span')[1];
    const range = document.createRange();
    range.setStart(span.firstChild!, 0);
    range.setEnd(span.firstChild!, 3);
    return range;
  });
  await annotateText(page, (document) => {
    const span = document.querySelectorAll('span')[2];
    const range = document.createRange();
    range.setStart(span.firstChild!, 0);
    range.setEnd(span.firstChild!, 5);
    return range;
  });

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
  await annotateText(page, (document) => {
    const span = document.querySelectorAll('span')[0];
    const range = document.createRange();
    range.setStart(span.firstChild!, 0);
    range.setEnd(span.firstChild!, 3);
    return range;
  });
  await annotateText(page, (document) => {
    const span = document.querySelectorAll('span')[1];
    const range = document.createRange();
    range.setStart(span.firstChild!, 0);
    range.setEnd(span.firstChild!, 3);
    return range;
  });

  await page.reload();

  // no content hover at first
  await expect(page.locator('#hover')).toHaveText('');

  await page.getByText('one').first().hover();
  await expect(page.locator('#hover')).toHaveText('one');

  await page.getByText('two').first().hover();
  await expect(page.locator('#hover')).toHaveText('two');

  // add three
  await annotateText(page, (document) => {
    const span = document.querySelectorAll('span')[2];
    const range = document.createRange();
    range.setStart(span.firstChild!, 0);
    range.setEnd(span.firstChild!, 5);
    return range;
  });
  await page.getByText('three').first().hover();
  await expect(page.locator('#hover')).toHaveText('three');
});

test('query correct annotation after scrolling', async ({ annotatedUrls, context }) => {
  const page = await context.newPage();
  const urls = await annotatedUrls(`
  <html>
    <body>
      <p style="height: 500px;">spacer</p>
      <span>target text</span>
      <p style="height: 1000px;">spacer</p>
    </body>
  </html>
  `);
  await page.goto(urls[0]);

  await annotateText(page, (document) => {
    const span = document.querySelector('span')!;
    const range = document.createRange();
    range.setStart(span.firstChild!, 0);
    range.setEnd(span.firstChild!, 11);
    return range;
  });

  // Scroll down a bit
  await page.evaluate(() => window.scrollTo(0, 300));

  // Make sure the target text in the view port
  await expect(page.getByText('target text').first()).toBeInViewport();
  // Hover it
  await page.getByText('target text').first().hover();
  await expect(page.locator('#hover')).toHaveText('target text');

  // Move mouse out => hide
  await page.mouse.move(0, 0);
  await expect(page.locator('#hover')).toHaveText('');
});
