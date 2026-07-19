import { Annotations } from 'anno-webext';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { anno } from './utils';

function Popup() {
	const [annotations, setAnnotations] = useState<Annotations<number>>({});
	useEffect(() => {
		anno.readAll().then(setAnnotations);
	}, []);

	const entries = Object.entries(annotations);

	return (
		<>
			{entries.length === 0
				? 'No annotations saved yet.'
				: entries.map(([url, annos]) => (
						<div key={url}>
							<h3>{url}</h3>
							<ul>
								{annos.map((a) => (
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

createRoot(document.getElementById('anno-popup')!).render(<Popup />);
