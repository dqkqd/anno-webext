// Get the scroll element to the annotation for a given range
// The scroll element must be an element (not a text node)
// We will try the node first, if it is not, then we take its parent.
export function getScrollElement(range: Range): Element {
  return range.startContainer.nodeType === Node.ELEMENT_NODE
    ? (range.startContainer as Element)
    : range.startContainer.parentElement!;
}
