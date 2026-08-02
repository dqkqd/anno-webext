import { UUID } from 'crypto';
import {
  type AnnoHighlightRegistry,
  createHighlightRegistry,
} from './highlight';
import { resolveOptions } from './options';
import { rtree } from './rtree';
import { createStore } from './store';
import type {
  Anno,
  AnnoContent,
  AnnoOptions,
  AnnoStore,
  Annotation,
  RenderableAnnotation,
} from './types';
import {
  createAnnotationUrl,
  getAnnotationIdFromUrl,
  normalizeUrl,
} from './url';
import { getScrollElement, normalizeText } from './utils';

export function createAnno(): Anno<object>;
export function createAnno<M, S>(options: AnnoOptions<M, S>): Anno<M>;
export function createAnno<M, S>(options?: AnnoOptions<M, S>): Anno<M> {
  const resolvedOptions = resolveOptions(options);
  const store = createStore(resolvedOptions);
  const highlightRegistry = createHighlightRegistry(
    resolvedOptions.cssRegistry,
  );

  const content: AnnoContent<M> = {
    annotate: async (): Promise<RenderableAnnotation<M> | undefined> => {
      const annotation = annotate(
        resolvedOptions.metadata.init,
        highlightRegistry,
      );
      if (!annotation) {
        return;
      }
      await store.content.set(annotation);
      return annotation;
    },
    restore: async () => {
      return await restoreAnnotations(store, highlightRegistry);
    },
    remove: async (annotationId: UUID) => {
      return await store.content.remove(annotationId);
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
): RenderableAnnotation<M> | undefined {
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
): Promise<{
  valid: RenderableAnnotation<M>[];
  invalid: Annotation<M>[];
}> {
  // clear remaining inmemory annotations
  highlightRegistry.clear();
  rtree.clear();

  const { valid, recoverable, unrecoverable } = await store.content.get();
  // recover the recoverable
  for (const annotation of recoverable) {
    await store.content.set(annotation);
  }
  valid.push(...recoverable);

  for (const annotation of valid) {
    highlightRegistry.set(annotation);
    rtree.record(annotation);
  }
  scrollToAnnotation(valid);

  return { valid, invalid: unrecoverable };
}

function scrollToAnnotation<M>(
  annotations: RenderableAnnotation<M>[],
) {
  const annotationId = getAnnotationIdFromUrl();
  if (!annotationId) {
    return;
  }

  const annotation = annotations.find((a) => a.id === annotationId);
  if (annotation) {
    const scrollElement = getScrollElement(annotation.range);
    scrollToElement(scrollElement);
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
): RenderableAnnotation<M> | undefined {
  const range = selection.getRangeAt(0);
  if (range.collapsed) {
    return;
  }

  const id = crypto.randomUUID();
  const originalUrl = location.href;
  const normalizedUrl = normalizeUrl(originalUrl);
  const annotationUrl = createAnnotationUrl(normalizedUrl, id);

  return {
    id,
    version: STORE_FORMAT_VERSION,
    text: normalizeText(range.toString()),
    originalUrl,
    normalizedUrl,
    annotationUrl,
    createdAt: new Date(),
    range,
    metadata: createMetadata(),
  };
}
