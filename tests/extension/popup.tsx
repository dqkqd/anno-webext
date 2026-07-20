import type { Annotations } from 'anno-webext/types';
import { produce } from 'immer';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { anno } from './utils';

function Popup() {
  const [annotations, setAnnotations] = useState<Annotations<number>>({});
  useEffect(() => {
    anno.popup.get().then(setAnnotations);
  }, []);

  const entries = Object.entries(annotations);

  async function updateAnnoMetadata(url: string, index: number) {
    const old = annotations[url][index];
    const newAnnotation = await anno.popup.updateMetadata(
      old.id,
      (metadata) => metadata + 1,
    );
    const newAnnotations = produce(annotations, (next) => {
      next[url][index] = newAnnotation;
    });
    setAnnotations(newAnnotations);
  }

  return (
    <>
      {entries.length === 0
        ? 'No annotations saved yet.'
        : entries.map(([url, annos]) => (
          <div key={url}>
            <h3>{url}</h3>
            <ul>
              {annos.map((a, index) => (
                <li key={a.id}>
                  <span>{a.text}</span>
                  <span>{a.metadata}</span>
                  <button onClick={() => updateAnnoMetadata(url, index)}>
                    Update metadata
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </>
  );
}

createRoot(document.getElementById('anno-popup')!).render(<Popup />);
