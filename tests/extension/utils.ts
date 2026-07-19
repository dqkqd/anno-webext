import { createAnnot } from 'annot';

export const annot = createAnnot({
	encodeMetadata: (m: number) => String(m).padStart(20, '0'),
	decodeMetadata: (s) => Number(s),
	createMetadata: () => Date.now(),
});
