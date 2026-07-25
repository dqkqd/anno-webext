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
  await annotateText(page, (document) => {
    const p = document.querySelector('p')!;
    const range = document.createRange();
    range.setStart(p.firstChild!, 0);
    range.setEnd(p.firstChild!, 11);
    return range;
  });
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
  await annotateText(page, (document) => {
    const p = document.querySelector('p')!;
    const b = p.querySelector('b')!;
    const range = document.createRange();
    range.setStart(b.firstChild!, 0);
    range.setEnd(p.childNodes[2], 6);
    return range;
  });
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
  await annotateText(page, (document) => {
    const p = document.querySelectorAll('p')[1];
    const range = document.createRange();
    range.setStart(p.firstChild!, 0);
    range.setEnd(p.firstChild!, 16);
    return range;
  });
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
  await annotateText(page, (document) => {
    const p = document.querySelectorAll('p')[0];
    const range = document.createRange();
    range.setStart(p.firstChild!, 0);
    range.setEnd(p.firstChild!, 15);
    return range;
  });
  await annotateText(page, (document) => {
    const p = document.querySelectorAll('p')[2];
    const range = document.createRange();
    range.setStart(p.firstChild!, 0);
    range.setEnd(p.firstChild!, 15);
    return range;
  });
  await expectedToBeAnnotated(page, expect, [
    'First paragraph',
    'Third paragraph',
  ]);
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
  await annotateText(page, (document) => {
    const div = document.querySelectorAll('div')[1];
    const range = document.createRange();
    range.setStart(div.firstChild!, 0);
    range.setEnd(div.firstChild!, 5);
    return range;
  });
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
  await annotateText(page, (document) => {
    const p = document.querySelector('p')!;
    const range = document.createRange();
    range.setStart(p.firstChild!, 0);
    range.setEnd(p.firstChild!, 18);
    return range;
  });
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
  await annotateText(page, (document) => {
    const p = document.querySelectorAll('p')[1];
    const range = document.createRange();
    range.setStart(p.firstChild!, 0);
    range.setEnd(p.firstChild!, 13);
    return range;
  });
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
  await annotateText(page, (document) => {
    const p = document.querySelector('p')!;
    const range = document.createRange();
    range.setStart(p.firstChild!, 5);
    range.setEnd(p.firstChild!, 11);
    return range;
  });
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
  await annotateText(page, (document) => {
    const p = document.querySelector('p')!;
    const range = document.createRange();
    range.setStart(p.firstChild!, 6);
    range.setEnd(p.firstChild!, 10);
    return range;
  });
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
  await annotateText(page, (document) => {
    const p = document.querySelector('p')!;
    const b = p.querySelector('b')!;
    const range = document.createRange();
    range.setStart(p.firstChild!, 3);
    range.setEnd(b.firstChild!, 3);
    return range;
  });
  await expectedToBeAnnotated(page, expect, ['n Tur']);
});

test('annotate text in large list of same-tag siblings', async ({ annotatedUrls, context }) => {
  const page = await context.newPage();
  const listItems = Array.from(
    { length: 50 },
    (_, i) => `<li>Item ${i + 1}</li>`,
  ).join('\n');
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
  await annotateText(page, (document) => {
    const li = document.querySelectorAll('li')[24];
    const range = document.createRange();
    range.setStart(li.firstChild!, 0);
    range.setEnd(li.firstChild!, 7);
    return range;
  });
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
  await annotateText(page, (document) => {
    const span = document.querySelector('span')!;
    const range = document.createRange();
    range.setStart(span.firstChild!, 0);
    range.setEnd(span.childNodes[2], 5);
    return range;
  });
  await expectedToBeAnnotated(page, expect, ['middle bold text']);
});

test('annotate text across paragraph elements', async ({ annotatedUrls, context }) => {
  const page = await context.newPage();
  const urls = await annotatedUrls(`
    <html>
      <body>
        <p>Hello</p>
        <p>World</p>
      </body>
    </html>
  `);
  await page.goto(urls[0]);
  await annotateText(page, (document) => {
    const ps = document.querySelectorAll('p');
    const range = document.createRange();
    range.setStart(ps[0].firstChild!, 0);
    range.setEnd(ps[1].firstChild!, 5);
    return range;
  });

  // highlight: Range.toString() — raw text content, no block separators
  // annotation: selection.toString() — browser inserts newlines between blocks
  await expectedToBeAnnotated(page, expect, ['Hello World']);
});

test('restore annotations should not crash if one of the annotations is invalid', async ({ annotatedUrls, context }) => {
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
  await annotateText(page, (document) => {
    const p = document.querySelectorAll('p')[0];
    const range = document.createRange();
    range.setStart(p.firstChild!, 0);
    range.setEnd(p.firstChild!, 10);
    return range;
  });
  await annotateText(page, (document) => {
    const p = document.querySelectorAll('p')[1];
    const range = document.createRange();
    range.setStart(p.firstChild!, 0);
    range.setEnd(p.firstChild!, 10);
    return range;
  });
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

test('does not restore annotation when DOM text changes at same XPath', async ({ annotatedUrls, context }) => {
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
  await annotateText(page, (document) => {
    const p = document.querySelectorAll('p')[0];
    const range = document.createRange();
    range.setStart(p.firstChild!, 0);
    range.setEnd(p.firstChild!, 3);
    return range;
  });
  await annotateText(page, (document) => {
    const p = document.querySelectorAll('p')[1];
    const range = document.createRange();
    range.setStart(p.firstChild!, 0);
    range.setEnd(p.firstChild!, 3);
    return range;
  });
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
