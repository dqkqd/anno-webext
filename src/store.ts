import { decode, decodeDom, encode } from './codec';
import type {
  Annotation,
  Annotations,
  DomAnnotation,
  StoredAnnotation,
  StoredAnnotations,
  UUID,
} from './types';

async function getStoredAnnotations<Meta>(): Promise<
  StoredAnnotations<Meta>
> {
  const result = await chrome.storage.local.get({ highlights: {} });
  return result.highlights as StoredAnnotations<Meta>;
}

export async function getCurrentDomAnnotations<M, S>(
  url: string,
  decodeMetadata: (s: S) => M,
): Promise<DomAnnotation<M>[]> {
  const allStoredAnnotations = await getStoredAnnotations<S>();
  const storedAnnotations = allStoredAnnotations[url] ?? [];
  const annotations = storedAnnotations.map((s) =>
    decodeDom(s, decodeMetadata)
  );
  // TODO: handle missing annotation (This is because range is missing)
  // TODO: handle deleted / invalid annotation!
  const validAnnotations = annotations.filter((a) => a !== undefined).filter((
    a,
  ) => normalizeText(a.range.toString()) === normalizeText(a.text));
  return validAnnotations;
}

export async function readAll<M, S>(
  decodeMetadata: (s: S) => M,
): Promise<Annotations<M>> {
  const result = await chrome.storage.local.get({ highlights: {} });
  const stored = result.highlights as StoredAnnotations<S>;
  const annotations = Object.fromEntries(
    Object.entries(stored).map(([url, storedAnnotations]) => [
      url,
      storedAnnotations.map((s) => decode(s, decodeMetadata)),
    ]),
  );
  return annotations;
}

// TODO: remove the export
export async function create<M, S>(
  annotation: DomAnnotation<M>,
  encodeMetadata: (m: M) => S,
): Promise<void> {
  const storedAnnotations = await getStoredAnnotations<S>();
  const annotationsInUrl = storedAnnotations[annotation.normalizedUrl] ?? [];
  if (annotationsInUrl.find((s) => s.id == annotation.id)) {
    throw Error(`An annotation with id ${annotation.id} already exists`);
  }
  const stored = encode(annotation, encodeMetadata);
  annotationsInUrl.push(stored);

  storedAnnotations[annotation.normalizedUrl] = annotationsInUrl;
  await chrome.storage.local.set({ highlights: storedAnnotations });
}

export async function updateMetadata<M, S>(
  annotationId: UUID,
  encodeMetadata: (m: M) => S,
  decodeMetadata: (s: S) => M,
  updateFn: (m: M) => M,
): Promise<Annotation<M>> {
  const storedAnnotations = await getStoredAnnotations<S>();
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

  const metadata = decodeMetadata(stored.metadata);
  const updated = updateFn(metadata);
  stored.metadata = encodeMetadata(updated);

  storedAnnotations[stored.normalizedUrl][storedIndex] = stored;
  await chrome.storage.local.set({ highlights: storedAnnotations });

  return decode(stored, decodeMetadata);
}

export async function getStoredAnnotation<Meta>(
  annotationId: UUID,
): Promise<StoredAnnotation<Meta> | undefined> {
  // TODO: this function should accept url!
  const storedAnnotations = await getStoredAnnotations<Meta>();
  for (const annotationsInUrl of Object.values(storedAnnotations)) {
    const annotation = annotationsInUrl.find((a) => a.id === annotationId);
    if (annotation) {
      return annotation;
    }
  }
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
