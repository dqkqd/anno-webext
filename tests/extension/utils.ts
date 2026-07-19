import { createAnno } from 'anno-webext';

export const anno = createAnno({
	encodeMetadata: (m: number) => String(m).padStart(20, '0'),
	decodeMetadata: (s) => Number(s),
	createMetadata: () => Date.now(),
});
