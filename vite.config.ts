import { resolve } from 'node:path';
import dts from 'unplugin-dts/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		lib: {
			entry: resolve(import.meta.dirname, 'src/index.ts'),
			name: 'annot',
			formats: ['es'],
			fileName: 'annot',
		},
		emptyOutDir: true,
	},
	plugins: [
		dts({
			entryRoot: resolve(import.meta.dirname, 'src'),
			include: ['src/**/*.ts'],
		}),
	],
});
