import { expect, test } from './fixtures';
import { annotateText, expectedToBeAnnotated } from './utils';

test('annotations normalized with query params', async ({ annotatedUrls, context }) => {
  const page = await context.newPage();
  const urls = await annotatedUrls(`
  <html>
    <body>
      Hello world this is a search result page with tracking parameters
    </body>
  </html>
`);
  // Create annotation with realistic tracking and search params
  await page.goto(`${urls[0]}?utm_source=google&search=hello`);
  await annotateText(page, 'Hello world');
  await expectedToBeAnnotated(page, expect, {
    highlightTexts: ['Hello world'],
    annotationTexts: ['Hello world'],
  });

  // Visit with reordered params - normalize-url should have sorted them to the same key
  await page.goto(`${urls[0]}?search=hello&utm_source=google`);
  await expectedToBeAnnotated(page, expect, {
    highlightTexts: ['Hello world'],
    annotationTexts: ['Hello world'],
  });

  // Visit with only non-utm param - annotation should still be restored since utm is stripped
  await page.goto(`${urls[0]}?search=hello`);
  await expectedToBeAnnotated(page, expect, {
    highlightTexts: ['Hello world'],
    annotationTexts: ['Hello world'],
  });
});

test('annotations isolated per url', async ({ annotatedUrls, context }) => {
  const page = await context.newPage();
  const urls = await annotatedUrls(
    `
  <html>
    <body>
      One page
    </body>
  </html>
`,
    `
  <html>
    <body>
      Two page
    </body>
  </html>
`,
  );
  // Create annotation on page 1
  await page.goto(urls[0]);
  await annotateText(page, 'One page');
  await expectedToBeAnnotated(page, expect, {
    highlightTexts: ['One page'],
    annotationTexts: ['One page'],
  });

  // Visit page 2 - annotation from page 1 should not appear
  await page.goto(urls[1]);
  // TODO: check that there is no annotation on page 2

  // Go back to page 1 - annotation should still be restored
  await page.goto(urls[0]);
  await expectedToBeAnnotated(page, expect, {
    highlightTexts: ['One page'],
    annotationTexts: ['One page'],
  });
});
