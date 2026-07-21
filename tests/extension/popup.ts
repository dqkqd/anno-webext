import { anno } from './utils';

const root = document.getElementById('anno-popup')!;

void anno.popup.get().then((result) => {
  const entries = Object.entries(result);
  root.textContent = '';

  if (entries.length === 0) {
    root.textContent = 'No annotations saved yet.';
    return;
  }

  for (const [url, annos] of entries) {
    const div = document.createElement('div');

    const h3 = document.createElement('h3');
    h3.textContent = url;
    div.appendChild(h3);

    const ul = document.createElement('ul');
    for (const a of annos) {
      const li = document.createElement('li');

      const textSpan = document.createElement('span');
      textSpan.textContent = a.text;
      li.appendChild(textSpan);

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
    div.appendChild(ul);
    root.appendChild(div);
  }
});
