import './content-script.css';
import type { Annotation } from 'anno-webext';
import { anno } from './utils';

const container = document.createElement('div');
container.id = 'all-annos';
document.body.appendChild(container);

const ul = document.createElement('ul');
const hover = document.createElement('div');
hover.id = 'hover';
container.append(ul, hover);

function addAnnotation(a: Annotation<number>) {
  const li = document.createElement('li');

  const anchor = document.createElement('a');
  anchor.href = a.annotationUrl;
  anchor.textContent = a.text;
  li.appendChild(anchor);

  const metadataSpan = document.createElement('span');
  metadataSpan.textContent = String(a.metadata);
  li.appendChild(metadataSpan);

  const button = document.createElement('button');
  button.textContent = 'Update metadata';
  button.addEventListener('click', () => {
    void anno.popup.updateMetadata(a.id, (m) => m + 1).then((updated) => {
      metadataSpan.textContent = String(updated.metadata);
    });
  });
  li.appendChild(button);

  ul.appendChild(li);
}

// reload all annotations on pageload
void anno.content.restore().then((restored) => {
  for (const a of restored) {
    addAnnotation(a);
  }
});

// highlight on mouse up
document.addEventListener('mouseup', () => {
  void anno.content.annotate().then((a) => {
    if (a) {
      addAnnotation(a);
    }
  });
});

// check every mouse position
document.addEventListener('mousemove', (e: MouseEvent) => {
  const results = anno.content.query({ x: e.clientX, y: e.clientY });
  hover.textContent = results.length ? results[0].text : '';
});
