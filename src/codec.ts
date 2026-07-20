import { getNodeByXPath, getNodeXPath } from './location';
import type {
  AnnoOptions,
  Annotation,
  Codec,
  DomAnnotation,
  StoredAnnotation,
  StoredRange,
} from './types';

export function createCodec<M, S>(options: AnnoOptions<M, S>): Codec<M, S> {
  return {
    metadata: {
      encode: options.encodeMetadata,
      decode: options.decodeMetadata,
    },
    encode: (annotation: DomAnnotation<M>): StoredAnnotation<S> => {
      return {
        ...annotation,
        createdAt: annotation.createdAt.toISOString(),
        range: {
          startContainer: getNodeXPath(annotation.range.startContainer),
          startOffset: annotation.range.startOffset,
          endContainer: getNodeXPath(annotation.range.endContainer),
          endOffset: annotation.range.endOffset,
        },
        scrollElement: getNodeXPath(annotation.scrollElement),
        metadata: options.encodeMetadata(annotation.metadata),
      };
    },

    decode: (stored: StoredAnnotation<S>): Annotation<M> => {
      return {
        ...stored,
        createdAt: new Date(stored.createdAt),
        metadata: options.decodeMetadata(stored.metadata),
      };
    },

    decodeDom: (stored: StoredAnnotation<S>): DomAnnotation<M> | undefined => {
      const range = decodeRange(stored.range);
      if (!range) {
        return;
      }
      const scrollElement = getNodeByXPath(stored.scrollElement);
      if (!scrollElement) {
        return;
      }

      return {
        ...stored,
        range,
        createdAt: new Date(stored.createdAt),
        // scroll element (if exist) must be `Element`
        scrollElement: scrollElement as Element,
        metadata: options.decodeMetadata(stored.metadata),
      };
    },
  };
}

/**
 * Evaluate the range with the current DOM.
 * Return undefined if it is invalid.
 */
function decodeRange(r: StoredRange): Range | undefined {
  const range = document.createRange();
  const startNode = getNodeByXPath(r.startContainer);
  if (!startNode) {
    return;
  }
  const endNode = getNodeByXPath(r.endContainer);
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
