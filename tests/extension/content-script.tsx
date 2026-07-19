import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { produce } from 'immer';
import './content-script.css';
import type { Annotation } from 'anno-webext/types';
import { anno } from './utils';

function Annos() {
	const [annotations, setAnnotations] = useState<Annotation<number>[]>([]);
	useEffect(() => {
		anno.restore().then(setAnnotations);
	}, []);

	useEffect(() => {
		const handler = () => {
			anno.annotate().then((a) => a && setAnnotations((prev) => [...prev, a]));
		};
		document.addEventListener('mouseup', handler);
		return () => document.removeEventListener('mouseup', handler);
	}, []);

	async function updateMetadata(index: number) {
		const old = annotations[index];
		const newAnnotation = await anno.updateMetadata(old.id, (m) => m + 1);
		const newAnnotations = produce(annotations, (next) => {
			next[index] = newAnnotation;
		});
		setAnnotations(newAnnotations);
	}

	return (
		<ul>
			{annotations.map((a, index) => (
				<li key={a.id}>
					<a href={a.annotationUrl}>{a.text}</a>
					<span>{a.metadata}</span>
					<button onClick={() => updateMetadata(index)}>Update metadata</button>
				</li>
			))}
		</ul>
	);
}

const container = document.createElement('div');
container.id = 'all-annos';
document.body.appendChild(container);

createRoot(container).render(<Annos />);
