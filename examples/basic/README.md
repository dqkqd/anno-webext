# anno-webext basic example

A dead simple extension using the `anno-webext` library.

- Highlight on every mouse up event (every time user selects some text)
- Restore the highlights when user reloads the page

This can be illustrate in [content-script.js](./src/content-script.js)

```js
import { createAnno } from 'anno-webext';

const anno = createAnno({ cssRegistry: 'custom-highlight' });

// Highlight every mouseup
document.addEventListener('mouseup', () => {
  anno.content.annotate().catch(console.error);
});

// Restore highlights when the content script is loaded
anno.content.restore().catch(console.error);
```

The highlight is styled in [content-script.css](./src/content-script.css)

```css
::highlight(custom-highlight) {
  background-color: #ff0066;
  color: white;
}
```

## How to run

For chrome users

```bash
npm run web-ext:chrome
```

For firefox users

```bash
npm run web-ext:firefox
```
