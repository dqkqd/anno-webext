# anno-webext

`anno-webext` is an annotation / highlight library for web extensions written in TypeScript.

> [!WARNING]
> This is a Work In Progress, the library is used internally and the APIs is not
> yet stable.

## Features

- CSS Custom highlight API, no DOM modification
- Auto recover highlights on DOM changes
- Support Chrome extension, Firefox addons.

## Install

```bash
npm install anno-webext
```

## Usage

This contains the basic usages, for complete examples, please see [examples](./examples/README.md)

### Initialize the annotation

Declare a global annotation object. The default option will add highlight to a
registry called `anno--styles`, you can specify different registry name using
the `cssRegistry` option. (See more at [CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API#register_highlights))

```ts
import { createAnno } from 'anno-webext';

export const anno = createAnno({ cssRegistry: 'custom-highlight' });
```

### Add a new highlight

Highlights will be created from the [Selection](https://developer.mozilla.org/en-US/docs/Web/API/Selection),
(that is if users select a chunk of text on the DOM). To add a new highlight to
the store, use `anno.content.annotate`, this saves the highlight to the extension
storage and register the highlights to the `cssRegistry` above.

```ts
await anno.content.annotate();
```

### Style highlights

Styles can be applied to highlights in `css`. This assumes `cssRegistry` is `custom-highlight`.

```css
::highlight(custom-highlight) {
  background-color: #ff0066;
  color: white;
}
```

### Restore highlights

To restore the highlight (when user first load the pages, etc.), use `anno.content.restore`.

```ts
await anno.content.restore();
```
