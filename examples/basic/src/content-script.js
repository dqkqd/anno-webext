import { createAnno } from 'anno-webext';

const anno = createAnno({ cssRegistry: 'custom-highlight' });

// Highlight every mouseup
document.addEventListener('mouseup', () => {
  anno.content.annotate().catch(console.error);
});

// Restore highlights when the content script is loaded
anno.content.restore().catch(console.error);
