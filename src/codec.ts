import { getNodeByXPath, getNodeXPath } from './location';
import type {
  AnnoCodec,
  AnnoOptions,
  Annotation,
  RenderableAnnotation,
  StoredAnnotation,
  StoredRange,
} from './types';

export function createCodec<M, S>(options: AnnoOptions<M, S>): AnnoCodec<M, S> {
  const metadata = options.metadata;
  return {
    metadata,
    encode: (annotation: RenderableAnnotation<M>): StoredAnnotation<S> => {
      return {
        ...annotation,
        createdAt: annotation.createdAt.toISOString(),
        range: {
          startContainerXPath: getNodeXPath(annotation.range.startContainer),
          startOffset: annotation.range.startOffset,
          endContainerXPath: getNodeXPath(annotation.range.endContainer),
          endOffset: annotation.range.endOffset,
        },
        scrollElement: getNodeXPath(annotation.scrollElement),
        metadata: metadata.encode(annotation.metadata),
      };
    },

    decode: (stored: StoredAnnotation<S>): Annotation<M> => {
      return {
        ...stored,
        createdAt: new Date(stored.createdAt),
        metadata: metadata.decode(stored.metadata),
      };
    },

    decodeRenderable: (
      stored: StoredAnnotation<S>,
    ): RenderableAnnotation<M> | undefined => {
      // TODO: this should return 3 cases: valid, recoverable, unrecorverable!
      // so that outer can easily reuse!
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
        metadata: metadata.decode(stored.metadata),
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
