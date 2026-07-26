/*
 * Finding the matching DOM range for a given text
 * The idea is based in https://github.com/obsidianmd/obsidian-clipper/blob/main/src/utils/highlighter-overlays.ts
 */

import { normalizeText } from './utils';

interface TextNodeSegment {
  node: Text;
  // the actual locations in the text itself
  start: number;
  end: number;
  // the location to the normalized text
  normStart: number;
  normEnd: number;
}

interface TextIndex {
  root: Node;
  text: string;
  normalizedText: string;
  segments: TextNodeSegment[];
}

function buildTextIndex(root: Node): TextIndex {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  let text = '';
  let normalizedText = '';
  const segments: TextNodeSegment[] = [];

  let node: Node | null;
  while ((node = walker.nextNode())) {
    const start = text.length;
    const normStart = normalizedText.length;

    const textContent = node.textContent ?? '';
    text += textContent;

    const normalizedTextContent = normalizeText(textContent);
    if (normalizedTextContent) {
      // textContent might have trailing spaces at the beginning or at the end, we need to consider that

      // Spaces at the start: only include if the current normalizedText doesn't have ending spaces
      if (
        normalizedText
        && !/\s/.test(normalizedText[normalizedText.length - 1])
        && /\s/.test(textContent[0])
      ) {
        normalizedText += ' ';
      }

      // the actual text (no space)
      normalizedText += normalizedTextContent;

      // Spaces at the end: only include the space if it is not the last node
      if (/\s/.test(textContent[textContent.length - 1])) {
        normalizedText += ' ';
      }
    }

    segments.push({
      node: node as Text,
      start,
      end: text.length,
      normStart,
      normEnd: normalizedText.length,
    });
  }

  // the last node can be empty, but one of the previous node appended a space
  // leaving the normalizedText contain trailing spaces
  if (/\s/.test(normalizedText[normalizedText.length - 1])) {
    for (let i = segments.length - 1; i >= 0; i--) {
      if (segments[i].normStart !== segments[i].normEnd) {
        segments[i].normEnd -= 1;
        normalizedText = normalizedText.slice(0, -1);
        break;
      }
    }
  }

  return { root, text, normalizedText, segments };
}

// Segments are contiguous and sorted by normStart, so binary-search for the one
// whose [normStart, normEnd) range owns the offset. Empty segments (no emitted
// chars) are skipped naturally since offset >= normEnd moves the search right.
function findSegmentForOffset(
  segments: TextNodeSegment[],
  offset: number,
): TextNodeSegment | undefined {
  let lo = 0;
  let hi = segments.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const seg = segments[mid];
    if (offset < seg.normStart) {
      hi = mid - 1;
    } else if (offset >= seg.normEnd) {
      lo = mid + 1;
    } else {
      return seg;
    }
  }
}

function domPositionForNormalizedOffset(
  index: TextIndex,
  normOffset: number,
): { node: Text; offset: number } | undefined {
  const seg = findSegmentForOffset(index.segments, normOffset);
  if (!seg) {
    return;
  }

  const normalizedText = index.normalizedText.slice(seg.normStart, normOffset);
  const normalizedSpaces = normalizedText.match(/\s/g)?.length ?? 0;
  // The total non spaces characters that we need to emit
  const target = normOffset - seg.normStart - normalizedSpaces;
  let start = seg.start;
  let emitted = 0;
  while (start < seg.end && emitted < target) {
    // normal character, emit
    if (!/\s/.test(index.text[start])) {
      emitted++;
    }
    start++;
  }

  // the current position might be space, skip that
  while (start < seg.end && /\s/.test(index.text[start])) {
    start++;
  }
  return { node: seg.node, offset: start - seg.start };
}

// Search the range based on the given text.
// The query will be normalized before searching.
export function getRangeByText(node: Node, text: string): Range | undefined {
  const index = buildTextIndex(node);
  const normalizedText = normalizeText(text);
  const normStart = index.normalizedText.indexOf(normalizedText);
  if (normStart === -1) {
    return;
  }
  // the binary-search looks for the actual index, so we need to offset 1 here
  const normEnd = normStart + normalizedText.length - 1;

  const startRange = domPositionForNormalizedOffset(index, normStart);
  const endRange = domPositionForNormalizedOffset(index, normEnd);
  if (!startRange || !endRange) {
    return;
  }
  const range = document.createRange();
  range.setStart(startRange.node, startRange.offset);
  // the returned .offset gives the actual offset, so we need to add 1 here
  range.setEnd(endRange.node, endRange.offset + 1);
  return range;
}
