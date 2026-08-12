import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Second build (after the main `vite build`): the testing entry, as a
// self-contained single file. The main bundle stays byte-identical.
export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/testing/index.ts'),
      name: 'anno-webext-testing',
      formats: ['es'],
      fileName: 'testing',
    },
    rollupOptions: {
      output: {
        codeSplitting: false,
      },
    },
    // the main build already emptied dist
    emptyOutDir: false,
  },
});
