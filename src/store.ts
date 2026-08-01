import { UUID } from 'crypto';
import { createCodec } from './codec';
import type {
  AnnoCodec,
  AnnoStore,
  AnnoStoreContentGet,
  Annotation,
  Annotations,
  RenderableAnnotation,
  ResolveAnnoOptions,
  StoredAnnotation,
} from './types';
import { normalizeUrl } from './url';

export function createStore<M, S>(
  options: ResolveAnnoOptions<M, S>,
): AnnoStore<M> {
  const codec = createCodec(options);
  return {
    content: {
      get: async () => {
        return await contentGet(codec);
      },
      set: async (annotation) => {
        return await contentSet(annotation, codec);
      },
      remove: async (annotationId: UUID) => {
        return await remove(annotationId);
      },
    },
    popup: {
      get: async () => {
        return popupGet(codec);
      },
      updateMetadata: async (annotationId, updateFn) => {
        return await popupUpdateMetadata(annotationId, codec, updateFn);
      },
    },
  };
}

export type StoredAnnotations<Meta> = {
  [normalizedUrl: string]: StoredAnnotation<Meta>[];
};

// browser extension storage
const browserStorage = {
  get: async <S>(): Promise<StoredAnnotations<S>> => {
    const result = await chrome.storage.local.get({ annotations: {} });
    return result.annotations as StoredAnnotations<S>;
  },
  set: async <S>(
    storedAnnotations: StoredAnnotations<S>,
  ): Promise<void> => {
    await chrome.storage.local.set({ annotations: storedAnnotations });
  },
  getByUrl: async <S>(url: string): Promise<StoredAnnotation<S>[]> => {
    const result = await browserStorage.get<S>();
    return result[url] ?? [];
  },
};

async function contentGet<M, S>(
  codec: AnnoCodec<M, S>,
): Promise<AnnoStoreContentGet<M>> {
  const url = normalizeUrl(location.href);
  const storedAnnotations = await browserStorage.getByUrl<S>(url);

  const valid: RenderableAnnotation<M>[] = [];
  const recoverable: RenderableAnnotation<M>[] = [];
  const unrecoverable: Annotation<M>[] = [];

  for (const stored of storedAnnotations) {
    const decoded = codec.decode(stored);
    switch (decoded.kind) {
      case 'valid': {
        valid.push(decoded.annotation);
        break;
      }
      case 'recoverable': {
        recoverable.push(decoded.annotation);
        break;
      }
      case 'unrecoverable': {
        unrecoverable.push(decoded.annotation);
        break;
      }
    }
  }

  return { valid, recoverable, unrecoverable };
}

async function contentSet<M, S>(
  annotation: RenderableAnnotation<M>,
  codec: AnnoCodec<M, S>,
): Promise<void> {
  const storedAnnotations = await browserStorage.get<S>();
  const annotationsInUrl = storedAnnotations[annotation.normalizedUrl] ?? [];
  const index = annotationsInUrl.findIndex((s) => s.id == annotation.id);

  const stored = codec.encode(annotation);
  if (index === -1) {
    annotationsInUrl.push(stored);
  } else {
    annotationsInUrl[index] = stored;
  }

  storedAnnotations[annotation.normalizedUrl] = annotationsInUrl;
  await browserStorage.set(storedAnnotations);
}

async function popupGet<M, S>(
  codec: AnnoCodec<M, S>,
): Promise<Annotations<M>> {
  const stored = await browserStorage.get<S>();
  const annotations = Object.fromEntries(
    Object.entries(stored).map(([url, storedAnnotations]) => [
      url,
      storedAnnotations.map((s) => codec.decodeNonRenderable(s)),
    ]),
  );
  return annotations;
}

async function popupUpdateMetadata<M, S>(
  annotationId: UUID,
  codec: AnnoCodec<M, S>,
  updateFn: (m: M) => M,
): Promise<Annotation<M>> {
  const storedAnnotations = await browserStorage.get<S>();
  let stored: StoredAnnotation<S> | undefined = undefined;
  let storedIndex: number | undefined = undefined;
  for (const annotationsInUrl of Object.values(storedAnnotations)) {
    const index = annotationsInUrl.findIndex((a) => a.id === annotationId);
    if (index !== -1) {
      storedIndex = index;
      stored = annotationsInUrl[index];
      break;
    }
  }

  if (storedIndex === undefined || stored === undefined) {
    throw Error(`An annotation with id ${annotationId} does not exist`);
  }

  const metadata = codec.metadata.decode(stored.metadata);
  const updated = updateFn(metadata);
  stored.metadata = codec.metadata.encode(updated);

  storedAnnotations[stored.normalizedUrl][storedIndex] = stored;
  await browserStorage.set(storedAnnotations);

  return codec.decodeNonRenderable(stored);
}

async function remove<S>(annotationId: UUID) {
  const storedAnnotations = await browserStorage.get<S>();
  for (const [url, annotations] of Object.entries(storedAnnotations)) {
    const filteredAnnotations = annotations.filter((a) =>
      a.id !== annotationId
    );
    if (filteredAnnotations.length !== annotations.length) {
      storedAnnotations[url] = filteredAnnotations;
      await browserStorage.set(storedAnnotations);
      return;
    }
  }
}
