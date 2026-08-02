import { expect, test } from './fixtures';
import {
  annotateText,
  expectedToBeAnnotated,
  waitForAnnotationsDom,
} from './utils';

test('annotations normalized with query params', async ({ annotatedUrls, context }) => {
  const page = await context.newPage();
  const urls = await annotatedUrls(`
  <html>
    <body>
    <p>Hello world this is a search result page with tracking parameters</p>
    </body>
  </html>
`);
  // Create annotation with realistic tracking and search params
  await page.goto(`${urls[0]}?utm_source=google&search=hello`);
  await annotateText(page, (document) => {
    const p = document.querySelector('p')!;
    const range = document.createRange();
    range.setStart(p.firstChild!, 0);
    range.setEnd(p.firstChild!, 11);
    return range;
  });
  await expectedToBeAnnotated(page, expect, ['Hello world']);

  // Visit with reordered params - normalize-url should have sorted them to the same key
  await page.goto(`${urls[0]}?search=hello&utm_source=google`);
  await expectedToBeAnnotated(page, expect, ['Hello world']);

  // Visit with only non-utm param - annotation should still be restored since utm is stripped
  await page.goto(`${urls[0]}?search=hello`);
  await expectedToBeAnnotated(page, expect, ['Hello world']);
});

test('annotations isolated per url', async ({ annotatedUrls, context }) => {
  const page = await context.newPage();
  const urls = await annotatedUrls(
    `
  <html>
    <body>
      <p>One page</p>
    </body>
  </html>
`,
    `
  <html>
    <body>
      <p>Two page</p>
    </body>
  </html>
`,
  );
  // Create annotation on page 1
  await page.goto(urls[0]);
  await annotateText(page, (document) => {
    const p = document.querySelector('p')!;
    const range = document.createRange();
    range.setStart(p.firstChild!, 0);
    range.setEnd(p.firstChild!, 8);
    return range;
  });
  await expectedToBeAnnotated(page, expect, ['One page']);

  // Create annotation on page 2
  await page.goto(urls[1]);
  await annotateText(page, (document) => {
    const p = document.querySelector('p')!;
    const range = document.createRange();
    range.setStart(p.firstChild!, 0);
    range.setEnd(p.firstChild!, 8);
    return range;
  });
  await expectedToBeAnnotated(page, expect, ['Two page']);

  // page 1's annotation must not leak into page 2
  await waitForAnnotationsDom(page);
  await expect(page.getByText('Two page')).toHaveCount(2);
  await expect(page.getByText('One page')).not.toBeVisible();

  // Go back to page 1 - only its own annotation is restored
  await page.goto(urls[0]);
  await waitForAnnotationsDom(page);
  await expect(page.getByText('One page')).toHaveCount(2);
  await expect(page.getByText('Two page')).not.toBeVisible();
});
