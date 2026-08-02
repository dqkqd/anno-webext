import { test } from './fixtures';
import { annotateText } from './utils';

test('restore keeps foreign CSS highlight registry entries', async ({ annotatedUrls, context }) => {
  // A foreign highlighter (another extension/app using the CSS Custom
  // Highlight API). Injected on every navigation, before the content
  // script's restore() runs at document idle.
  await context.addInitScript(() => {
    const range = document.createRange();
    range.selectNodeContents(document);
    CSS.highlights.set('foreign', new Highlight(range));
  });

  const page = await context.newPage();
  const urls = await annotatedUrls(`
    <html>
      <body>
        <p>Hello world</p>
      </body>
    </html>
  `);
  await page.goto(urls[0]);

  // first restore() (empty storage) must not wipe the foreign entry
  await page.waitForFunction(() => CSS.highlights.get('foreign')?.size === 1);

  await annotateText(page, (document) => {
    const p = document.querySelector('p')!;
    const range = document.createRange();
    range.setStart(p.firstChild!, 0);
    range.setEnd(p.firstChild!, 5);
    return range;
  });

  // reload runs restore() again: clear() + re-set of the app entry; the
  // foreign entry must survive and stay registered
  await page.reload();
  await page.waitForFunction(
    () =>
      CSS.highlights.get('highlight--styles')?.size === 1
      && CSS.highlights.get('foreign')?.size === 1,
  );
});
