import type { Expect, Page } from '@playwright/test';

export async function waitForAnnotationsDom(page: Page) {
  await page.waitForSelector('#all-annos a');
}

export async function annotateText(
  page: Page,
  addSelection: (doc: Document) => Range,
) {
  // Wait for the content script to be injected before running the annotation
  await page.waitForSelector('#all-annos', { state: 'attached' });
  await page.evaluate((fnString: string) => {
    const addSelection = eval(`(${fnString})`) as (doc: Document) => Range;
    const range = addSelection(document);
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, addSelection.toString());
  await page.mouse.up();
  await waitAnnotation(page);
  await waitForAnnotationsDom(page);
}

async function waitAnnotation(page: Page) {
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
  expect([...annotatedText!.map(normalizeText)].sort()).toEqual(
    [...texts.map(normalizeText)].sort(),
  );
}

export async function expectedToBeAnnotated(
  page: Page,
  expect: Expect,
  texts: string[],
) {
  await assertAnnotations(page, expect, texts);
  await page.reload();
  await assertAnnotations(page, expect, texts);
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
