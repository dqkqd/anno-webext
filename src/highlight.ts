import { DomAnnotation } from './types';

export type AnnoHighlightRegistry = {
  get: () => Highlight;
  set: <M>(annotation: DomAnnotation<M>) => void;
};

const ANNOTATION_CLASS = 'anno--styles';

/**
 * `CSS.highlights` doesn't have correct property on firefox.
 * Cause errors when looping through all the annotations.
 * We use this wrapper to ensure this works on both chrome and firefox.
 *
 * See Xray vision in firefox:
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts#xray_vision_in_firefox
 */
const highlightRegistry: HighlightRegistry =
  (window.wrappedJSObject ?? window).CSS.highlights;

export function createHighlightRegistry(): AnnoHighlightRegistry {
  function get() {
    return highlightRegistry.get(ANNOTATION_CLASS) ?? new Highlight();
  }

  function set<M>(annotation: DomAnnotation<M>) {
    const highlights = get();
    highlights.add(annotation.range);
    highlightRegistry.set(ANNOTATION_CLASS, highlights);
  }

  return { get, set };
}
