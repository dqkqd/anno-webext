import { copyFileSync } from 'fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: './tests/extension',
  define: {
    global: 'globalThis',
  },
  publicDir: false,
  plugins: [
    {
      name: 'copy-to-tests',
      closeBundle() {
        copyFileSync(
          './tests/extension/manifest.json',
          'tests/dist/manifest.json',
        );
      },
    },
  ],
  build: {
    outDir: resolve(import.meta.dirname, 'tests/dist'),
    cssTarget: 'chrome111',
    cssMinify: 'esbuild',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'content-script': './tests/extension/content-script.ts',
        'content-script-entry': './tests/extension/content-script-entry.ts',
        'background-script': './tests/extension/background-script.ts',
        index: './tests/extension/index.html',
      },
      output: {
        dir: resolve(import.meta.dirname, 'tests/dist'),
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
});
