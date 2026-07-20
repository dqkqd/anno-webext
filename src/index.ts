import { getNodeByXPath } from './location';
import { normalizeUrl } from './normalize-url';
import { queryDomAnnotations, recordDomAnnotation } from './registry';
import {
  create,
  getCurrentDomAnnotations,
  getStoredAnnotation,
  readAll,
  updateMetadata,
} from './store';
import type {
  Anno,
  AnnoContent,
  AnnoOptions,
  AnnoPopup,
  Annotations,
  DomAnnotation,
  UUID,
} from './types';

const STORE_FORMAT_VERSION = chrome.runtime.getManifest().version;

const ANNOTATION_CLASS = 'anno--styles';
const ANNOTATION_HASH_ANCHOR = 'anno-record-id';

/**
 * `CSS.highlights` doesn't have correct property on firefox.
 * Cause errors when looping through all the annotations.
 * We use this wrapper to ensure this works on both chrome and firefox.
 *
 * See Xray vision in firefox:
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts#xray_vision_in_firefox
 */
const highlightRegistry: HighlightRegistry =
  (window.wrappedJSObject ?? window).CSS.highlights;

export function annotate<M>(
  createMetadata: () => M,
): DomAnnotation<M> | undefined {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const annotation = createAnnotationFromSelection(selection, createMetadata);
  if (!annotation) {
    return;
  }

  const highlights = highlightRegistry.get(ANNOTATION_CLASS) ?? new Highlight();
  highlights.add(annotation.range);
  highlightRegistry.set(ANNOTATION_CLASS, highlights);
  selection.removeAllRanges();

  recordDomAnnotation(annotation);
  return annotation;
}

export async function initAnnotations<M, S>(
  decodeMetadata: (s: S) => M,
): Promise<DomAnnotation<M>[]> {
  const annotations = await restoreAnnotations(decodeMetadata);
  await scrollToAnnotation();
  return annotations;
}

// TODO: this function only run in the content script!
async function restoreAnnotations<M, S>(
  decodeMetadata: (s: S) => M,
): Promise<DomAnnotation<M>[]> {
  const normalizedUrl = normalizeUrl(location.href);
  const annotations = await getCurrentDomAnnotations(
    normalizedUrl,
    decodeMetadata,
  );

  const highlights = highlightRegistry.get(ANNOTATION_CLASS) ?? new Highlight();
  for (const annotation of annotations) {
    highlights.add(annotation.range);
    recordDomAnnotation(annotation);
  }
  highlightRegistry.set(ANNOTATION_CLASS, highlights);

  return annotations;
}

async function scrollToAnnotation(): Promise<void> {
  const annotationId = getAnnotationIdFromHash(location.hash);
  if (!annotationId) {
    return;
  }

  const context = await getStoredAnnotation(annotationId);
  if (!context?.scrollElement) {
    return;
  }

  const element = getNodeByXPath(context.scrollElement);
  if (!element) {
    return;
  }
  scrollToElement(element as Element);
}

export function createAnnotationUrl(normalizedUrl: string, id: UUID): string {
  return `${normalizedUrl}#${ANNOTATION_HASH_ANCHOR}=${id}`;
}

function getAnnotationIdFromHash(hash: string): UUID | undefined {
  const anchor = `${ANNOTATION_HASH_ANCHOR}=`;
  const index = hash.indexOf(anchor);
  if (index === -1) {
    return;
  }
  return hash.slice(index + anchor.length, index + anchor.length + 36) as UUID;
}

function scrollToElement(element: Element): void {
  element.scrollIntoView({
    block: 'start',
    inline: 'start',
    behavior: 'smooth',
  });
}

function createAnnotationFromSelection<M>(
  selection: Selection,
  createMetadata: () => M,
): DomAnnotation<M> | undefined {
  const range = selection.getRangeAt(0);
  if (range.collapsed) {
    return;
  }

  const id = crypto.randomUUID();
  const originalUrl = location.href;
  const normalizedUrl = normalizeUrl(originalUrl);
  const annotationUrl = createAnnotationUrl(normalizedUrl, id);

  // Add scroll element to the annotation.
  // This must be an `Element`, which means if we are selecting a text node,
  // then this should be its parent.
  const scrollElement = range.startContainer.nodeType === Node.ELEMENT_NODE
    ? (range.startContainer as Element)
    : range.startContainer.parentElement!;

  return {
    id,
    version: STORE_FORMAT_VERSION,
    text: selection.toString(),
    originalUrl,
    normalizedUrl,
    annotationUrl,
    createdAt: new Date(),
    range,
    scrollElement,
    metadata: createMetadata(),
  };
}

export function createAnno<M, S>(options: AnnoOptions<M, S>): Anno<M> {
  const content: AnnoContent<M> = {
    annotate: async (): Promise<DomAnnotation<M> | undefined> => {
      const annotation = annotate(options.createMetadata);
      if (!annotation) {
        return;
      }
      await create(annotation, options.encodeMetadata);
      return annotation;
    },
    restore: async (): Promise<DomAnnotation<M>[]> => {
      return await initAnnotations(options.decodeMetadata);
    },
    query: (queryOption) => {
      return queryDomAnnotations(queryOption);
    },
  };

  const popup: AnnoPopup<M> = {
    readAll: async (): Promise<Annotations<M>> => {
      return await readAll(options.decodeMetadata);
    },
    updateMetadata: async (annotationId: UUID, updateFn: (m: M) => M) => {
      return await updateMetadata(
        annotationId,
        options.encodeMetadata,
        options.decodeMetadata,
        updateFn,
      );
    },
  };
  return {
    content,
    popup,
  };
}
