import { UUID } from 'crypto';
import { getRangeByText } from '../finder';
import { resolveOptions } from '../options';
import { storeSet } from '../store';
import type {
  AnnoOptions,
  RenderableAnnotation,
  ResolveAnnoOptions,
  StoredAnnotation,
} from '../types';
import { createAnnotationUrl, normalizeUrl } from '../url';
import { normalizeText } from '../utils';
import { createChromeMock } from './browser';

/**
 * Test helpers for consumers of anno-webext.
 *
 * `createAnnoTest()` installs in-memory stand-ins for the browser APIs the
 * library needs (`chrome.*`, `CSS.highlights`) plus a mock
 * `chrome.storage.local` for persistence.
 *
 * Call it from a vitest `setupFiles` module, before the library is imported:
 *
 * ```ts
 * export const { annotate, reset, options } = await createAnnoTest({...});
 * beforeEach(reset);
 * ```
 */

type AnnotateOptions = {
  root?: Node;
};

type CreateStoredAnnotationOptions<M> = {
  text: string;
  metadata: M;
  /** Defaults to `location.href`. */
  url?: string;
};

type AnnoTest<M, S> = {
  /** Resets the env: storage cleared, highlights registry cleared, id counter reset. */
  reset: () => void;

  /** Resolved annotation options. */
  options: ResolveAnnoOptions<M, S>;
  /**
   * Creates a DOM-less annotation and stores it immediately (popup flows).
   */
  createStoredAnnotation: (
    options: CreateStoredAnnotationOptions<M>,
  ) => Promise<StoredAnnotation<S>>;
  /**
   * Finds `text` in the DOM (normalized search over `root`), selects it, and
   * builds an in-memory annotation from the selection. Metadata comes from
   * `metadata.init`. The id is always deterministic
   * (`00000000-...-000000000001`, `...0002`, ...), injected into
   * `createAnnotationFromSelection` from an internal counter reset on
   * `reset()` — no mocks, so userland `crypto.randomUUID` mocks stay intact.
   * `createdAt` is the real time — freeze the clock with `vi.setSystemTime`
   * for deterministic snapshots.
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
  const { reset: resetChrome, chrome } = createChromeMock<S>();

  const installedRegistry = installCssHighlightsPolyfill();

  // Imported after the env is installed: `anno.ts` reads the globals at
  // module-evaluation time.
  const anno = await import('../anno');

  let nextId = 0;

  // Deterministic counter ids
  function nextUuid(): UUID {
    nextId++;
    return `00000000-0000-0000-0000-${
      String(nextId).padStart(12, '0')
    }` as UUID;
  }

  async function createStoredAnnotation(
    options: CreateStoredAnnotationOptions<M>,
  ): Promise<StoredAnnotation<S>> {
    const { text, metadata, url = location.href } = options;
    const id = nextUuid();
    const normalizedUrl = normalizeUrl(url);
    const stored: StoredAnnotation<S> = {
      id,
      version: chrome.runtime.getManifest().version,
      text: normalizeText(text),
      originalUrl: url,
      normalizedUrl,
      annotationUrl: createAnnotationUrl(normalizedUrl, id),
      createdAt: new Date().toISOString(),
      metadata: resolvedOptions.metadata.encode(metadata),
      // Dummy range that resolves to no node, so content flows classify the
      // annotation as unrecoverable instead of crashing.
      range: {
        startContainerXPath: '/anno/range[1]',
        startOffset: 0,
        endContainerXPath: '/anno/range[1]',
        endOffset: 0,
      },
    };
    await storeSet(stored);
    return stored;
  }

  function annotate(
    text: string,
    annotateOptions: AnnotateOptions = {},
  ): RenderableAnnotation<M> | undefined {
    const { root = document.body } = annotateOptions;
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
    const annotation = anno.createAnnotationFromSelection(
      selection,
      resolvedOptions.metadata.init,
      nextUuid(),
    );
    return annotation;
  }

  return {
    annotate,
    createStoredAnnotation,
    options: resolvedOptions,
    reset: () => {
      nextId = 0;
      resetChrome();
      installedRegistry?.clear();
    },
  };
}
