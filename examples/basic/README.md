# anno-webext examples basic

The dead simple extensions using the `anno-webext` library.

- Highlight every mouse up event (every time user selects some text)
- Restore the highlight when reload the page

All the code for this is in [content-script.js](./src/content-script.js)

```js
import { createAnno } from 'anno-webext';

const anno = createAnno({ cssRegistry: 'highlight' });

document.addEventListener('mouseup', () => {
  anno.content.annotate().catch(console.error);
});

anno.content.restore().catch(console.error);
```
