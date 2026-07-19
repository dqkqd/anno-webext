import { Annotations } from 'annot';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { annot } from './utils';

function Popup() {
	const [annotations, setAnnotations] = useState<Annotations<number>>({});
	useEffect(() => {
		annot.readAll().then(setAnnotations);
	}, []);

	const entries = Object.entries(annotations);

	return (
		<>
			{entries.length === 0
				? 'No annotations saved yet.'
				: entries.map(([url, annots]) => (
						<div key={url}>
							<h3>{url}</h3>
							<ul>
								{annots.map((a) => (
									<li key={a.id}>
										{a.text}
										<br />
										{JSON.stringify(a.metadata)}
									</li>
								))}
							</ul>
						</div>
					))}
		</>
	);
}

createRoot(document.getElementById('annot-popup')!).render(<Popup />);
