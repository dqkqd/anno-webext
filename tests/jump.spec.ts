import { expect, test } from './fixtures';
import {
  annotateText,
  getAllAnnotatedUrls,
  waitForAnnotationsDom,
} from './utils';

test('jump to correct annotation', async ({ context, annotatedUrls }) => {
  const page = await context.newPage();
  const content = Array.from({ length: 1000 }, (_, i) => `<p>${i}</p>`).join(
    '\n',
  );
  const urls = await annotatedUrls(
    `
  <html>
    <body>
      <h1>Page1<h1>
      ${content}
    </body>
  </html>
`,
  );

  await page.goto(urls[0]);
  await expect(page.getByText('999', { exact: true }).first()).not
    .toBeInViewport();

  await annotateText(page, '999');

  const allAnnotatedUrls = await getAllAnnotatedUrls(page);
  expect(allAnnotatedUrls).toHaveLength(1);
  expect(allAnnotatedUrls[0].text).toStrictEqual('999');

  await page.goto(allAnnotatedUrls[0].url);
  await page.reload();
  await waitForAnnotationsDom(page);
  await expect(page.getByText('999', { exact: true }).first()).toBeInViewport();
});

test('jump to multi-element annotation', async ({ context, annotatedUrls }) => {
  const page = await context.newPage();
  const filler = Array.from({ length: 500 }, (_, i) => `<p>Item ${i}</p>`).join(
    '\n',
  );
  const urls = await annotatedUrls(
    `
  <html>
    <body>
      <h1>Page1<h1>
      ${filler}
      <p>Alpha</p><p>Beta</p>
      ${filler}
    </body>
  </html>
`,
  );

  await page.goto(urls[0]);
  await expect(page.getByText('Alpha', { exact: true }).first()).not
    .toBeInViewport();
  await expect(page.getByText('Beta', { exact: true }).first()).not
    .toBeInViewport();

  await annotateText(page, 'AlphaBeta');

  const allAnnotatedUrls = await getAllAnnotatedUrls(page);
  expect(allAnnotatedUrls).toHaveLength(1);
  expect(allAnnotatedUrls[0].text).toStrictEqual('AlphaBeta');

  await page.goto(allAnnotatedUrls[0].url);
  await page.reload();
  await waitForAnnotationsDom(page);
  await expect(page.getByText('Alpha', { exact: true }).first())
    .toBeInViewport();
  await expect(page.getByText('Beta', { exact: true }).first())
    .toBeInViewport();
});

test('jump to incomplete-word annotation', async ({ context, annotatedUrls }) => {
  const page = await context.newPage();
  const filler = Array.from({ length: 500 }, (_, i) => `<p>Item ${i}</p>`).join(
    '\n',
  );
  const urls = await annotatedUrls(
    `
  <html>
    <body>
      <h1>Page1<h1>
      ${filler}
      <p>Alan Turing was a mathematician</p>
      ${filler}
    </body>
  </html>
`,
  );

  await page.goto(urls[0]);
  await expect(page.getByText('Turing').first()).not.toBeInViewport();

  await annotateText(page, 'urin');

  const allAnnotatedUrls = await getAllAnnotatedUrls(page);
  expect(allAnnotatedUrls).toHaveLength(1);
  expect(allAnnotatedUrls[0].text).toStrictEqual('urin');

  await page.goto(allAnnotatedUrls[0].url);
  await page.reload();
  await waitForAnnotationsDom(page);
  await expect(page.getByText('Turing').first()).toBeInViewport();
});

test('scroll to full element text', async ({ context, annotatedUrls }) => {
  const page = await context.newPage();
  const filler = Array.from({ length: 500 }, (_, i) => `<p>Item ${i}</p>`).join(
    '\n',
  );
  const urls = await annotatedUrls(
    `
  <html>
    <body>
      <h1>Page1<h1>
      ${filler}
      <p id="target">Hello world this is a full paragraph</p>
      ${filler}
    </body>
  </html>
`,
  );

  await page.goto(urls[0]);
  await expect(page.getByText('Hello world this is a full paragraph').first())
    .not.toBeInViewport();

  await annotateText(page, 'Hello world this is a full paragraph');

  const allAnnotatedUrls = await getAllAnnotatedUrls(page);
  expect(allAnnotatedUrls).toHaveLength(1);
  expect(allAnnotatedUrls[0].text).toStrictEqual(
    'Hello world this is a full paragraph',
  );

  await page.goto(allAnnotatedUrls[0].url);
  await page.reload();
  await waitForAnnotationsDom(page);
  await expect(page.getByText('Hello world this is a full paragraph').first())
    .toBeInViewport();
});

test('scroll to correct same-tag sibling', async ({ context, annotatedUrls }) => {
  const page = await context.newPage();
  const filler = Array.from({ length: 500 }, (_, i) => `<p>Item ${i}</p>`).join(
    '\n',
  );
  const urls = await annotatedUrls(
    `
  <html>
    <body>
      <h1>Page1<h1>
      ${filler}
      <p>First paragraph</p>
      <p>Second paragraph</p>
      <p>Third paragraph</p>
      ${filler}
    </body>
  </html>
`,
  );

  await page.goto(urls[0]);
  await expect(page.getByText('Second paragraph', { exact: true }).first()).not
    .toBeInViewport();

  await annotateText(page, 'Second paragraph');

  const allAnnotatedUrls = await getAllAnnotatedUrls(page);
  expect(allAnnotatedUrls).toHaveLength(1);
  expect(allAnnotatedUrls[0].text).toStrictEqual('Second paragraph');

  await page.goto(allAnnotatedUrls[0].url);
  await page.reload();
  await waitForAnnotationsDom(page);
  await expect(page.getByText('Second paragraph', { exact: true }).first())
    .toBeInViewport();
});

test('scroll to nested inline element', async ({ context, annotatedUrls }) => {
  const page = await context.newPage();
  const filler = Array.from({ length: 500 }, (_, i) => `<p>Item ${i}</p>`).join(
    '\n',
  );
  const urls = await annotatedUrls(
    `
  <html>
    <body>
      <h1>Page1<h1>
      ${filler}
      <p>Start <span>middle <b id="target">bold</b> text</span> end</p>
      ${filler}
    </body>
  </html>
`,
  );

  await page.goto(urls[0]);
  await expect(page.getByText('bold', { exact: true }).first()).not
    .toBeInViewport();

  await annotateText(page, 'bold');

  const allAnnotatedUrls = await getAllAnnotatedUrls(page);
  expect(allAnnotatedUrls).toHaveLength(1);
  expect(allAnnotatedUrls[0].text).toStrictEqual('bold');

  await page.goto(allAnnotatedUrls[0].url);
  await page.reload();
  await waitForAnnotationsDom(page);
  await expect(page.getByText('bold', { exact: true }).first())
    .toBeInViewport();
});

test('scroll to nested same-tag elements', async ({ context, annotatedUrls }) => {
  const page = await context.newPage();
  const filler = Array.from({ length: 500 }, (_, i) => `<p>Item ${i}</p>`).join(
    '\n',
  );
  const urls = await annotatedUrls(
    `
  <html>
    <body>
      <h1>Page1<h1>
      ${filler}
      <div>
        <div>
          <div id="target">Deeply nested content</div>
        </div>
      </div>
      ${filler}
    </body>
  </html>
`,
  );

  await page.goto(urls[0]);
  await expect(
    page.getByText('Deeply nested content', { exact: true }).first(),
  ).not.toBeInViewport();

  await annotateText(page, 'Deeply nested content');

  const allAnnotatedUrls = await getAllAnnotatedUrls(page);
  expect(allAnnotatedUrls).toHaveLength(1);
  expect(allAnnotatedUrls[0].text).toStrictEqual('Deeply nested content');

  await page.goto(allAnnotatedUrls[0].url);
  await page.reload();
  await waitForAnnotationsDom(page);
  await expect(page.getByText('Deeply nested content', { exact: true }).first())
    .toBeInViewport();
});
