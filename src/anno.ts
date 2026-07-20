import { normalizeUrl } from './normalize-url';
import { queryDomAnnotations, recordDomAnnotation } from './registry';
import { createStore } from './store';
import type {
  Anno,
  AnnoContent,
  AnnoOptions,
  AnnoPopup,
  Annotations,
  DomAnnotation,
  Store,
  UUID,
} from './types';

export function createAnno<M, S>(options: AnnoOptions<M, S>): Anno<M> {
  const store = createStore(options);
  const content: AnnoContent<M> = {
    annotate: async (): Promise<DomAnnotation<M> | undefined> => {
      const annotation = annotate(options.createMetadata);
      if (!annotation) {
        return;
      }
      await store.content.set(annotation);
      return annotation;
    },
    restore: async (): Promise<DomAnnotation<M>[]> => {
      return await initAnnotations(store);
    },
    query: (queryOption) => {
      return queryDomAnnotations(queryOption);
    },
  };

  const popup: AnnoPopup<M> = {
    get: async (): Promise<Annotations<M>> => {
      return await store.popup.get();
    },
    updateMetadata: async (annotationId: UUID, updateFn: (m: M) => M) => {
      return await store.popup.updateMetadata(
        annotationId,
        updateFn,
      );
    },
  };
  return {
    content,
    popup,
  };
}

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

export async function initAnnotations<M>(
  store: Store<M>,
): Promise<DomAnnotation<M>[]> {
  const annotations = await restoreAnnotations(store);
  scrollToAnnotation(annotations);
  return annotations;
}

// TODO: this function only run in the content script!
async function restoreAnnotations<M>(
  store: Store<M>,
): Promise<DomAnnotation<M>[]> {
  const annotations = await store.content.get();
  const highlights = highlightRegistry.get(ANNOTATION_CLASS) ?? new Highlight();
  for (const annotation of annotations) {
    highlights.add(annotation.range);
    recordDomAnnotation(annotation);
  }
  highlightRegistry.set(ANNOTATION_CLASS, highlights);

  return annotations;
}

function scrollToAnnotation<M>(
  annotations: DomAnnotation<M>[],
) {
  const annotationId = getAnnotationIdFromHash(location.hash);
  if (!annotationId) {
    return;
  }

  const annotation = annotations.find((a) => a.id === annotationId);
  if (annotation) {
    scrollToElement(annotation.scrollElement);
  }
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
    text: range.toString(),
    originalUrl,
    normalizedUrl,
    annotationUrl,
    createdAt: new Date(),
    range,
    scrollElement,
    metadata: createMetadata(),
  };
}
