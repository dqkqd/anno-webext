import { createAnno } from 'anno-webext';

const anno = createAnno({ cssRegistry: 'custom-highlight' });

document.addEventListener('mouseup', () => {
  anno.content.annotate().catch(console.error);
});

anno.content.restore().catch(console.error);
