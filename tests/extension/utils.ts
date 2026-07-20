import { createAnno } from 'anno-webext';

export const anno = createAnno({
  metadata: {
    init: () => Date.now(),
    encode: (m: number) => String(m).padStart(20, '0'),
    decode: (s) => Number(s),
  },
});
