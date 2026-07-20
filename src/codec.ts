import { getNodeByXPath, getNodeXPath } from './location';
import type {
  Annotation,
  DomAnnotation,
  StoredAnnotation,
  StoredRange,
} from './types';

export function encode<M, S>(
  annotation: DomAnnotation<M>,
  metadataEncode: (m: M) => S,
): StoredAnnotation<S> {
  // scroll element to annotation to.
  // This must be `Element` so we take the parent if the current node is a text node.
  const scrollElement =
    annotation.range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (annotation.range.startContainer as Element)
      : annotation.range.startContainer.parentElement!;
  return {
    ...annotation,
    createdAt: annotation.createdAt.toISOString(),
    range: {
      startContainer: getNodeXPath(annotation.range.startContainer),
      startOffset: annotation.range.startOffset,
      endContainer: getNodeXPath(annotation.range.endContainer),
      endOffset: annotation.range.endOffset,
    },
    scrollElement: getNodeXPath(scrollElement),
    metadata: metadataEncode(annotation.metadata),
  };
}

export function decode<M, S>(
  stored: StoredAnnotation<S>,
  decodeMetadata: (s: S) => M,
): Annotation<M> {
  return {
    ...stored,
    createdAt: new Date(stored.createdAt),
    metadata: decodeMetadata(stored.metadata),
  };
}

export function decodeDom<M, S>(
  stored: StoredAnnotation<S>,
  decodeMetadata: (s: S) => M,
): DomAnnotation<M> | undefined {
  const range = decodeRange(stored.range);
  if (!range) {
    return;
  }
  return {
    ...stored,
    range,
    createdAt: new Date(stored.createdAt),
    metadata: decodeMetadata(stored.metadata),
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
