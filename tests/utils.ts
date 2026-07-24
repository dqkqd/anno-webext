import type { Expect, Page } from '@playwright/test';

export async function waitForAnnotationsDom(page: Page) {
  await page.waitForSelector('#all-annos a');
}

export async function annotateText(page: Page, text: string) {
  await selectText(page, text);
  await waitAnnotation(page);
  await waitForAnnotationsDom(page);
}

async function waitAnnotation(page: Page) {
  // wait to make sure browser has loaded the annotation!
  await page.waitForFunction(
    () => {
      const annotation = CSS.highlights?.get('highlight--styles');
      return annotation !== undefined;
    },
    null,
  );
}

export async function getAllAnnotatedUrls(
  page: Page,
): Promise<{ url: string; text: string }[]> {
  const res = await page.locator('#all-annos a').evaluateAll((anchors) => {
    return anchors.map((a) => ({
      url: (a as HTMLAnchorElement).href,
      text: a.textContent,
    }));
  });
  return res;
}

// Range.toString() extracts raw text from DOM ranges registered in
// CSS.highlights. This verifies the highlight API pipeline and serves as
// a proxy for checking highlight region boundaries in the DOM.
async function assertAnnotations(page: Page, expect: Expect, texts: string[]) {
  await waitAnnotation(page);
  const annotatedText = await page.evaluate(() => {
    const annotation = CSS.highlights.get('highlight--styles');
    if (!annotation) {
      return null;
    }
    return [...annotation.values()].map((r) => (r as Range).toString());
  });
  expect(annotatedText).not.toBeNull();
  expect(annotatedText!.length).toBe(texts.length);
  expect([...annotatedText!].sort()).toEqual([...texts].sort());
}

async function assertAnnotationTexts(
  page: Page,
  expect: Expect,
  texts: string[],
) {
  await waitForAnnotationsDom(page);
  const annotationTexts = await page.locator('#all-annos a').allTextContents();
  expect(annotationTexts.length).toBe(texts.length);
  expect([...annotationTexts].sort()).toEqual([...texts].sort());
}

type ExpectedOptions = {
  highlightTexts: string[];
  annotationTexts: string[];
};

export async function expectedToBeAnnotated(
  page: Page,
  expect: Expect,
  options: ExpectedOptions,
) {
  await assertAnnotations(page, expect, options.highlightTexts);
  await assertAnnotationTexts(page, expect, options.annotationTexts);
  await page.reload();
  await assertAnnotations(page, expect, options.highlightTexts);
  await assertAnnotationTexts(page, expect, options.annotationTexts);
}

async function selectText(page: Page, text: string): Promise<void> {
  const locator = page.locator('body');
  await locator.evaluate((element, text) => {
    // grab all the text nodes
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node: Text;
    while ((node = walker.nextNode() as Text)) {
      textNodes.push(node);
    }

    // build a map of each node's start position in the full text
    const positions: { node: Text; start: number; end: number }[] = [];
    let offset = 0;
    for (const textNode of textNodes) {
      const len = textNode.textContent.length;
      positions.push({ node: textNode, start: offset, end: offset + len });
      offset += len;
    }

    const fullText = positions.map((p) => p.node.textContent).join('');
    const idx = fullText.indexOf(text);
    if (idx === -1) {
      throw new Error(`Text not found: ${text}`);
    }

    const matchStart = idx;
    const matchEnd = idx + text.length;

    const startEntry = positions.find((p) =>
      p.start <= matchStart && matchStart < p.end
    )!;
    const endEntry = positions.find((p) =>
      p.start < matchEnd && matchEnd <= p.end
    )!;

    const range = document.createRange();
    range.setStart(startEntry.node, matchStart - startEntry.start);
    range.setEnd(endEntry.node, matchEnd - endEntry.start);

    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, text);

  await page.mouse.up();
}
