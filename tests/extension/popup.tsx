import type { Annotations, Annotation } from 'anno-webext';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { anno } from './utils';

function Popup() {
	const [annotations, setAnnotations] = useState<Annotations<number>>({});
	useEffect(() => {
		anno.readAll().then(setAnnotations);
	}, []);

	const entries = Object.entries(annotations);

	async function updateAnnoMetadata(index: number) {
		const newAnnotation = await anno.updateMetadata(
			annotations[index].id,
			(metadata) => metadata + 1,
		);
		setAnnotations((prev) => prev.map((a, i) => (i === index ? newAnnotation : a)));
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
										<button onClick={() => updateAnnoMetadata(index)}>Update metadata</button>
									</li>
								))}
							</ul>
						</div>
					))}
		</>
	);
}

createRoot(document.getElementById('anno-popup')!).render(<Popup />);
