import { createCodec } from './codec';
import { getRangeByText, normalizeText } from './finder';
import type {
  AnnoCodec,
  AnnoOptions,
  AnnoStore,
  Annotation,
  Annotations,
  DomAnnotation,
  StoredAnnotation,
  UUID,
} from './types';
import { normalizeUrl } from './url';

export function createStore<M, S>(options: AnnoOptions<M, S>): AnnoStore<M> {
  const codec = createCodec(options);
  return {
    content: {
      get: async () => {
        return await contentGet(codec);
      },
      set: async (annotation) => {
        return await contentSet(annotation, codec);
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
): Promise<{ restored: DomAnnotation<M>[]; recovered: DomAnnotation<M>[] }> {
  const url = normalizeUrl(location.href);
  const storedAnnotations = await browserStorage.getByUrl<S>(url);
  const restoredAnnotations: DomAnnotation<M>[] = [];
  const recoveredAnnotations: DomAnnotation<M>[] = [];
  for (const stored of storedAnnotations) {
    const annotation = codec.decodeDom(stored);
    if (
      annotation
      && normalizeText(annotation.range.toString())
        === normalizeText(stored.text)
    ) {
      // valid annotation!
      restoredAnnotations.push(annotation);
    } else {
      // invalid annotaiton! this is due to xpath stale
      const range = getRangeByText(document.body, stored.text);
      if (range !== undefined) {
        const scrollElement =
          range.startContainer.nodeType === Node.ELEMENT_NODE
            ? (range.startContainer as Element)
            : range.startContainer.parentElement!;
        const newAnnotation: DomAnnotation<M> = {
          ...codec.decode(stored),
          range,
          scrollElement,
          metadata: codec.metadata.decode(stored.metadata),
        };
        recoveredAnnotations.push(newAnnotation);
      } else {
        console.warn(`Cannot find correct range for text: ${stored.text}`);
      }
    }
  }
  // TODO: handle missing annotation (This is because range is missing)
  // TODO: handle deleted / invalid annotation!
  // const validAnnotations = annotations.filter((a) => a !== undefined)
  //   .filter((
  //     a,
  //   ) => normalizeText(a.range.toString()) === normalizeText(a.text));
  return { restored: restoredAnnotations, recovered: recoveredAnnotations };
}

async function contentSet<M, S>(
  annotation: DomAnnotation<M>,
  codec: AnnoCodec<M, S>,
): Promise<void> {
  const storedAnnotations = await browserStorage.get<S>();
  const annotationsInUrl = storedAnnotations[annotation.normalizedUrl] ?? [];
  if (annotationsInUrl.find((s) => s.id == annotation.id)) {
    throw Error(`An annotation with id ${annotation.id} already exists`);
  }
  const stored = codec.encode(annotation);
  annotationsInUrl.push(stored);

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
      storedAnnotations.map((s) => codec.decode(s)),
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

  return codec.decode(stored);
}
