/**
 * The raw annotation factory, re-exported from the library.
 *
 * Kept in a separate module from `./index` so that importing the env helpers
 * (`initAnnoTest`) does not evaluate the library — `anno.ts` reads
 * `chrome.runtime.getManifest()` at module-evaluation time, so the env must be
 * installed (from a vitest `setupFiles` module) before this module is imported.
 */
export { createAnnotationFromSelection } from '../anno';
