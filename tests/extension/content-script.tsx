import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './content-script.css';
import type { Annotation } from 'anno-webext';
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

	return (
		<ul>
			{annotations.map((a) => (
				<li key={a.id}>
					<a href={a.annotationUrl}>{a.text}</a>
				</li>
			))}
		</ul>
	);
}

const container = document.createElement('div');
container.id = 'all-annos';
document.body.appendChild(container);

createRoot(container).render(<Annos />);
