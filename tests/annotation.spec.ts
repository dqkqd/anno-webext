import { expect, test } from './fixtures';
import { annotateText, expectedToBeAnnotated } from './utils';

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
	await expectedToBeAnnotated(page, expect, ['Hello world']);
});

test('annotate text spanning inline elements', async ({ annotatedUrls, context }) => {
	const page = await context.newPage();
	const urls = await annotatedUrls(`
  <html>
    <body>
      <p>Hello <b>world</b> there</p>
    </body>
  </html>
`);
	await page.goto(urls[0]);
	await annotateText(page, 'world there');
	await expectedToBeAnnotated(page, expect, ['world there']);
});

test('annotate text in same-tag siblings', async ({ annotatedUrls, context }) => {
	const page = await context.newPage();
	const urls = await annotatedUrls(`
  <html>
    <body>
      <p>First paragraph</p>
      <p>Second paragraph</p>
      <p>Third paragraph</p>
    </body>
  </html>
`);
	await page.goto(urls[0]);
	await annotateText(page, 'Second paragraph');
	await expectedToBeAnnotated(page, expect, ['Second paragraph']);
});

test('annotate multiple texts in same-tag siblings', async ({ annotatedUrls, context }) => {
	const page = await context.newPage();
	const urls = await annotatedUrls(`
  <html>
    <body>
      <p>First paragraph</p>
      <p>Second paragraph</p>
      <p>Third paragraph</p>
    </body>
  </html>
`);
	await page.goto(urls[0]);
	await annotateText(page, 'First paragraph');
	await annotateText(page, 'Third paragraph');
	await expectedToBeAnnotated(page, expect, ['First paragraph', 'Third paragraph']);
});

test('annotate text in mixed-tag siblings', async ({ annotatedUrls, context }) => {
	const page = await context.newPage();
	const urls = await annotatedUrls(`
  <html>
    <body>
      <div>Alpha</div>
      <span>Beta</span>
      <div>Gamma</div>
    </body>
  </html>
`);
	await page.goto(urls[0]);
	await annotateText(page, 'Gamma');
	await expectedToBeAnnotated(page, expect, ['Gamma']);
});

test('annotate deeply nested text', async ({ annotatedUrls, context }) => {
	const page = await context.newPage();
	const urls = await annotatedUrls(`
  <html>
    <body>
      <section>
        <article>
          <div>
            <p>Deeply nested text</p>
          </div>
        </article>
      </section>
    </body>
  </html>
`);
	await page.goto(urls[0]);
	await annotateText(page, 'Deeply nested text');
	await expectedToBeAnnotated(page, expect, ['Deeply nested text']);
});

test('annotate text with comment between elements', async ({ annotatedUrls, context }) => {
	const page = await context.newPage();
	const urls = await annotatedUrls(`
  <html>
    <body>
      <p>Before comment</p>
      <!-- a comment -->
      <p>After comment</p>
    </body>
  </html>
`);
	await page.goto(urls[0]);
	await annotateText(page, 'After comment');
	await expectedToBeAnnotated(page, expect, ['After comment']);
});

test('annotate fragment text inside single text node', async ({ annotatedUrls, context }) => {
	const page = await context.newPage();
	const urls = await annotatedUrls(`
  <html>
    <body>
      <p>Alan Turing was a mathematician</p>
    </body>
  </html>
`);
	await page.goto(urls[0]);
	await annotateText(page, 'Turing');
	await expectedToBeAnnotated(page, expect, ['Turing']);
});

test('annotate fragment text inside a word', async ({ annotatedUrls, context }) => {
	const page = await context.newPage();
	const urls = await annotatedUrls(`
  <html>
    <body>
      <p>Alan Turing was a mathematician</p>
    </body>
  </html>
`);
	await page.goto(urls[0]);
	await annotateText(page, 'urin');
	await expectedToBeAnnotated(page, expect, ['urin']);
});

test('annotate fragment text spanning element boundary', async ({ annotatedUrls, context }) => {
	const page = await context.newPage();
	const urls = await annotatedUrls(`
  <html>
    <body>
      <p>Alan <b>Turing</b> was great</p>
    </body>
  </html>
`);
	await page.goto(urls[0]);
	await annotateText(page, 'n Tur');
	await expectedToBeAnnotated(page, expect, ['n Tur']);
});

test('annotate text in large list of same-tag siblings', async ({ annotatedUrls, context }) => {
	const page = await context.newPage();
	const listItems = Array.from({ length: 50 }, (_, i) => `<li>Item ${i + 1}</li>`).join('\n');
	const urls = await annotatedUrls(`
  <html>
    <body>
      <ul>
        ${listItems}
      </ul>
    </body>
  </html>
`);
	await page.goto(urls[0]);
	await annotateText(page, 'Item 25');
	await expectedToBeAnnotated(page, expect, ['Item 25']);
});

test('annotate text with nested inline elements', async ({ annotatedUrls, context }) => {
	const page = await context.newPage();
	const urls = await annotatedUrls(`
  <html>
    <body>
      <p>Start <span>middle <b>bold</b> text</span> end</p>
    </body>
  </html>
`);
	await page.goto(urls[0]);
	await annotateText(page, 'middle bold text');
	await expectedToBeAnnotated(page, expect, ['middle bold text']);
});

test('restore annotations should not crash if one of the annotations is invalid', async ({
	annotatedUrls,
	context,
}) => {
	const page = await context.newPage();
	const urls = await annotatedUrls(`
  <html>
    <body>
    <p>Highlight1</p>
    <div>
      <p>Highlight2</p>
    </div>
    <p>Highlight3</p>
    </body>
  </html>
`);

	await page.goto(urls[0]);
	await annotateText(page, 'Highlight1');
	await annotateText(page, 'Highlight2');
	await expectedToBeAnnotated(page, expect, ['Highlight1', 'Highlight2']);

	// rewrite url
	await annotatedUrls({
		url: urls[0],
		html: `
  <html>
    <body>
    <p>Highlight1</p>
    <p>Highlight3</p>
    </body>
  </html>
`,
	});

	await page.goto(urls[0]);
	// Highlight1 is still activated, but not Highlight2 here
	await expectedToBeAnnotated(page, expect, ['Highlight1']);
});

test('does not restore annotation when DOM text changes at same XPath', async ({
	annotatedUrls,
	context,
}) => {
	const page = await context.newPage();
	const urls = await annotatedUrls(`
  <html>
    <body>
      <p>one</p>
      <p>two</p>
    </body>
  </html>
`);

	await page.goto(urls[0]);
	await annotateText(page, 'one');
	await annotateText(page, 'two');
	await expectedToBeAnnotated(page, expect, ['one', 'two']);

	// Overwrite the same URL with modified HTML: second paragraph now says "three"
	await annotatedUrls({
		url: urls[0],
		html: `
  <html>
    <body>
      <p>one</p>
      <p>three</p>
    </body>
  </html>
`,
	});

	await page.reload();

	// Only 'one' should be restored; 'two' was removed, so its XPath now
	// points to 'three', which must NOT be annotated.
	await expectedToBeAnnotated(page, expect, ['one']);
});
