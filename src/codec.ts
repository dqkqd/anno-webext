import { getRangeByText } from './finder';
import { getNodeByXPath, getNodeXPath } from './location';
import type {
  AnnoCodec,
  AnnoCodecDecodeReturnType,
  AnnoOptions,
  Annotation,
  RenderableAnnotation,
  StoredAnnotation,
  StoredRange,
} from './types';
import { normalizeText } from './utils';

export function createCodec<M, S>(options: AnnoOptions<M, S>): AnnoCodec<M, S> {
  const metadata = options.metadata;

  function decodeNonRenderable(stored: StoredAnnotation<S>): Annotation<M> {
    return {
      ...stored,
      createdAt: new Date(stored.createdAt),
      metadata: metadata.decode(stored.metadata),
    };
  }

  function encode(annotation: RenderableAnnotation<M>): StoredAnnotation<S> {
    return {
      ...annotation,
      createdAt: annotation.createdAt.toISOString(),
      range: {
        startContainerXPath: getNodeXPath(annotation.range.startContainer),
        startOffset: annotation.range.startOffset,
        endContainerXPath: getNodeXPath(annotation.range.endContainer),
        endOffset: annotation.range.endOffset,
      },
      metadata: metadata.encode(annotation.metadata),
    };
  }

  function decode(
    stored: StoredAnnotation<S>,
  ): AnnoCodecDecodeReturnType<M> {
    const annotation = decodeNonRenderable(stored);
    const range = decodeRange(stored.range);

    // a range is valid if and only if its string match the stored text.
    const isValid = range !== undefined
      && normalizeText(range.toString())
        === normalizeText(stored.text);

    if (isValid) {
      return {
        kind: 'valid',
        annotation: { ...annotation, range },
      };
    }

    // The annotation is not valid, which means the DOM xpath is stale and it now point to a different node, or not exist anymore.
    // We try to search by the stored text first, to get the matching node first.
    // TODO: should we search the whole body?
    const recoverableRange = getRangeByText(document.body, stored.text);
    if (recoverableRange) {
      return {
        kind: 'recoverable',
        annotation: { ...annotation, range: recoverableRange },
      };
    }
    // The range is invalid, and the text itself is unrecoverable, return the unrecoverable annotation
    // and let caller decide
    return {
      kind: 'unrecoverable',
      annotation,
    };
  }

  return {
    metadata,
    encode,
    decode,
    decodeNonRenderable,
  };
}

/**
 * Evaluate the range with the current DOM.
 * Return undefined if it is invalid.
 */
function decodeRange(r: StoredRange): Range | undefined {
  const range = document.createRange();
  const startNode = getNodeByXPath(r.startContainerXPath);
  if (!startNode) {
    return;
  }
  const endNode = getNodeByXPath(r.endContainerXPath);
  if (!endNode) {
    return;
  }

  range.setStart(startNode, r.startOffset);
  range.setEnd(endNode, r.endOffset);
  if (range.collapsed) {
    return;
  }

  return range;
}
