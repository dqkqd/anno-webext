import type { StoredAnnotations } from '../store';

/**
 * Internal chrome mock for the library's own test suite.
 *
 * Not part of the public `anno-webext/testing` API — consumers interact with
 * the library through its public API (`createAnno().content.*`). This module
 * is reachable only via relative imports inside this repo (the package
 * `exports` map blocks consumer access).
 */

export type AnnoStorage<S> = { annotations?: StoredAnnotations<S> };

export type MockChromeStorageLocal<S> = {
  get: (keys?: AnnoStorage<S>) => Promise<AnnoStorage<S>>;
  set: (items: AnnoStorage<S>) => Promise<void>;
  remove: (keys: string | string[]) => Promise<void>;
};

export type MockChrome<S> = {
  storage: { local: MockChromeStorageLocal<S> };
  runtime: { getManifest: () => { version: string } };
};

export function createChromeMock<S>(): { reset: () => void } {
  let state: AnnoStorage<S> = {};

  const local: MockChromeStorageLocal<S> = {
    get: (keys) => {
      if (keys === undefined) {
        return Promise.resolve(structuredClone(state));
      }
      // Object form: the value is the default when nothing is stored
      // (chrome semantics — stored values win wholesale).
      return Promise.resolve({
        annotations: state.annotations !== undefined
          ? structuredClone(state.annotations)
          : keys.annotations ?? {},
      });
    },
    set: (items) => {
      Object.assign(state, structuredClone(items));
      return Promise.resolve();
    },
    remove: (keys) => {
      const requested = typeof keys === 'string' ? [keys] : keys;
      if (requested.includes('annotations')) {
        delete state.annotations;
      }
      return Promise.resolve();
    },
  };

  const chrome: MockChrome<S> = {
    storage: { local },
    // Fixed manifest version: consumers don't control it, tests must not
    // depend on it changing.
    runtime: { getManifest: () => ({ version: '1.0.0' }) },
  };

  (globalThis as { chrome?: MockChrome<S> }).chrome = chrome;

  return {
    reset: () => {
      state = {};
    },
  };
}
