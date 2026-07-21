import { AnnoHighlightRegistry, createHighlightRegistry } from './highlight';
import { rtree } from './rtree';
import { createStore } from './store';
import type {
  Anno,
  AnnoContent,
  AnnoOptions,
  AnnoStore,
  DomAnnotation,
} from './types';
import {
  createAnnotationUrl,
  getAnnotationIdFromUrl,
  normalizeUrl,
} from './url';

export function createAnno<M, S>(options: AnnoOptions<M, S>): Anno<M> {
  const store = createStore(options);
  const highlightRegistry = createHighlightRegistry(options.cssClass);

  const content: AnnoContent<M> = {
    annotate: async (): Promise<DomAnnotation<M> | undefined> => {
      const annotation = annotate(options.metadata.init, highlightRegistry);
      if (!annotation) {
        return;
      }
      await store.content.set(annotation);
      return annotation;
    },
    restore: async (): Promise<DomAnnotation<M>[]> => {
      return await restoreAnnotations(store, highlightRegistry);
    },
    query: rtree.query,
  };

  const popup = {
    get: store.popup.get,
    updateMetadata: store.popup.updateMetadata,
  };

  return {
    content,
    popup,
  };
}

const STORE_FORMAT_VERSION = chrome.runtime.getManifest().version;

function annotate<M>(
  createMetadata: () => M,
  highlightRegistry: AnnoHighlightRegistry,
): DomAnnotation<M> | undefined {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const annotation = createAnnotationFromSelection(selection, createMetadata);
  if (!annotation) {
    return;
  }

  highlightRegistry.set(annotation);
  selection.removeAllRanges();

  rtree.record(annotation);
  return annotation;
}

async function restoreAnnotations<M>(
  store: AnnoStore<M>,
  highlightRegistry: AnnoHighlightRegistry,
): Promise<DomAnnotation<M>[]> {
  const annotations = await store.content.get();
  for (const annotation of annotations) {
    highlightRegistry.set(annotation);
    rtree.record(annotation);
  }
  scrollToAnnotation(annotations);
  return annotations;
}

function scrollToAnnotation<M>(
  annotations: DomAnnotation<M>[],
) {
  const annotationId = getAnnotationIdFromUrl();
  if (!annotationId) {
    return;
  }

  const annotation = annotations.find((a) => a.id === annotationId);
  if (annotation) {
    scrollToElement(annotation.scrollElement);
  }
}

function scrollToElement(element: Element): void {
  element.scrollIntoView({
    block: 'start',
    inline: 'start',
    behavior: 'smooth',
  });
}

export function createAnnotationFromSelection<M>(
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
