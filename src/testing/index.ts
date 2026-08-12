import { vi } from 'vitest';
import { getRangeByText } from '../finder';
import { resolveOptions } from '../options';
import type {
  AnnoOptions,
  RenderableAnnotation,
  ResolveAnnoOptions,
} from '../types';
import { createChromeMock } from './browser';

/**
 * Test helpers for consumers of anno-webext.
 *
 * `initAnnoTest()` installs in-memory stand-ins for the browser APIs the
 * library reads at module-evaluation time — `chrome.runtime.getManifest()`
 * (see `anno.ts`) and `CSS.highlights` (see `highlight.ts`) — plus a mock
 * `chrome.storage.local` for persistence.
 *
 * It must run BEFORE importing the library (or `anno-webext/testing/factory`,
 * which imports it). In vitest, call it from a `setupFiles` module; in other
 * runners, from the earliest possible hook.
 *
 * The mock chrome is internal: tests interact with the library through its
 * public API (`createAnno().content.*`); `initAnnoTest()` returns `reset()`
 * and `annotate()`.
 */

type AnnotateOptions = {
  root?: Node;
  /** Frozen clock for `createdAt`; strings are converted via `new Date`. */
  now?: Date | string;
  /**
   * Replaces `crypto.randomUUID` for this annotation: the id becomes
   * `00000000-0000-0000-0000-{uuid padded to 12 digits}`.
   */
  uuid?: number;
};

type AnnoTest<M, S> = {
  /**
   * Restores the env to its just-installed state: storage back to the
   * seeded contents, highlights registry cleared, uuid counter reset.
   */
  reset: () => void;

  /**
   * Resolved annotation options
   */
  options: ResolveAnnoOptions<M, S>;
  /**
   * Finds `text` in the DOM (normalized search over `options.root`), selects
   * it, and builds an in-memory annotation from the selection. Metadata comes
   * from `anno.metadata.init`. When `now` is given, the clock is frozen to it
   * (vitest `vi.setSystemTime`) so `createdAt` is deterministic. When `uuid`
   * is given, `crypto.randomUUID` is replaced for this annotation, so the id
   * is deterministic.
   */
  annotate: (
    text: string,
    options?: AnnotateOptions,
  ) => RenderableAnnotation<M> | undefined;
};

/**
 * Installs `Highlight` and `CSS.highlights` if missing (jsdom has neither).
 * Returns the registry when this call installed it, `undefined` when a
 * real implementation was already present (reset must not clear that).
 */
function installCssHighlightsPolyfill(): HighlightRegistry | undefined {
  if (typeof globalThis.Highlight === 'undefined') {
    // The library calls `new Highlight()` at runtime (highlight.ts) and
    // jsdom has no `Highlight` global; a plain `Set` provides everything
    // used: construction with no args, `.add(range)`, iteration.
    globalThis.Highlight = Set as unknown as typeof Highlight;
  }
  const css = globalThis as
    & typeof globalThis
    & Record<
      'CSS',
      { highlights?: HighlightRegistry } | undefined
    >;
  if (css.CSS?.highlights) {
    return;
  }
  css.CSS ??= {} as typeof CSS;
  const registry = new Map<string, Highlight>();
  css.CSS.highlights = registry;
  return registry;
}

export async function createAnnoTest(): Promise<AnnoTest<object, object>>;
export async function createAnnoTest<M, S>(
  options: AnnoOptions<M, S>,
): Promise<AnnoTest<M, S>>;
export async function createAnnoTest<M, S>(
  options?: AnnoOptions<M, S>,
): Promise<AnnoTest<M, S>> {
  const resolvedOptions = resolveOptions(options);
  const { reset: resetChrome } = createChromeMock();

  const installedRegistry = installCssHighlightsPolyfill();

  // Imported after the env is installed: `anno.ts` reads the globals at
  // module-evaluation time.
  const { createAnnotationFromSelection } = await import('./factory');

  function annotate(
    text: string,
    annotateOptions: AnnotateOptions = {},
  ): RenderableAnnotation<M> | undefined {
    const { root = document.body, now, uuid } = annotateOptions;
    if (now) {
      vi.setSystemTime(typeof now === 'string' ? new Date(now) : now);
    }
    const uuidSpy = uuid !== undefined
      ? vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce(
        `00000000-0000-0000-0000-${String(uuid).padStart(12, '0')}`,
      )
      : undefined;

    try {
      const range = getRangeByText(root, text);
      if (!range) {
        return;
      }
      const selection = window.getSelection();
      if (!selection) {
        return;
      }
      selection.removeAllRanges();
      selection.addRange(range);
      return createAnnotationFromSelection(
        selection,
        resolvedOptions.metadata.init,
      );
    } finally {
      if (now) {
        vi.useRealTimers();
      }
      uuidSpy?.mockRestore();
    }
  }

  return {
    annotate,
    options: resolvedOptions,
    reset: () => {
      resetChrome();
      installedRegistry?.clear();
    },
  };
}
