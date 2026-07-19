import { decodeDom } from './codec';
import { getNodeByXPath } from './location';
import { normalizeUrl } from './normalize-url';
import { create, getStoredAnnotation, getStoredAnnotations, readAll } from './store';
import type {
	Anno,
	AnnoOptions,
	Annotation,
	Annotations,
	DefaultAnnoOptions,
	DomAnnotation,
	UUID,
} from './types';

const STORE_FORMAT_VERSION = chrome.runtime.getManifest().version;

const ANNOTATION_CLASS = 'anno--styles';
const ANNOTATION_HASH_ANCHOR = 'anno-record-id';

/**
 *
 * `CSS.highlights` doesn't have correct property on firefox.
 * Cause errors when looping through all the annotations.
 * We use this wrapper to ensure this works on both chrome and firefox.
 *
 * See Xray vision in firefox:
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts#xray_vision_in_firefox
 *
 */
const highlightRegistry: HighlightRegistry = (window.wrappedJSObject ?? window).CSS.highlights;

export function annotate<M>(createMetadata: () => M): DomAnnotation<M> | undefined {
	const selection = window.getSelection();
	if (!selection) {
		return;
	}

	const annotation = createAnnotationFromSelection(selection, createMetadata);
	if (!annotation) {
		return;
	}

	const highlights = highlightRegistry.get(ANNOTATION_CLASS) ?? new Highlight();
	highlights.add(annotation.range);
	highlightRegistry.set(ANNOTATION_CLASS, highlights);
	selection.removeAllRanges();
	return annotation;
}

export function getAnnotationRangeAtPoint(x: number, y: number): Range | undefined {
	const highlights = highlightRegistry.get(ANNOTATION_CLASS);
	if (!highlights) {
		return;
	}

	for (const range of highlights.values()) {
		const r = range as Range;
		for (const rect of r.getClientRects()) {
			if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
				return r;
			}
		}
	}
}

export async function initAnnotations<M, S>(decodeMetadata: (s: S) => M): Promise<Annotation<M>[]> {
	const annotations = await restoreAnnotations(decodeMetadata);
	await scrollToAnnotation();
	return annotations;
}

// TODO: this function only run in the content script!
async function restoreAnnotations<M, S>(decodeMetadata: (s: S) => M): Promise<Annotation<M>[]> {
	const normalizedUrl = normalizeUrl(location.href);
	const allContexts = await getStoredAnnotations<S>();
	const contextsInUrl = allContexts[normalizedUrl];
	if (!contextsInUrl) {
		return [];
	}

	const annotations: Annotation<M>[] = [];
	const highlights = highlightRegistry.get(ANNOTATION_CLASS) ?? new Highlight();
	for (const c of contextsInUrl) {
		const annotation = decodeDom(c, decodeMetadata);
		if (!annotation) {
			// TODO: handle missing annotation (This is because range is missing)
			continue;
		}
		const validRange = normalizeText(annotation.range.toString()) === normalizeText(c.text);
		if (validRange) {
			highlights.add(annotation.range);
			annotations.push(annotation);
		}
		// TODO: handle deleted / invalid annotation!
	}
	highlightRegistry.set(ANNOTATION_CLASS, highlights);
	return annotations;
}

async function scrollToAnnotation(): Promise<void> {
	const annotationId = getAnnotationIdFromHash(location.hash);
	if (!annotationId) {
		return;
	}

	const context = await getStoredAnnotation(annotationId);
	if (!context?.scrollElement) {
		return;
	}

	const element = getNodeByXPath(context.scrollElement);
	if (!element) {
		return;
	}
	scrollToElement(element as Element);
}

export function createAnnotationUrl(normalizedUrl: string, id: UUID): string {
	return `${normalizedUrl}#${ANNOTATION_HASH_ANCHOR}=${id}`;
}

function getAnnotationIdFromHash(hash: string): UUID | undefined {
	const anchor = `${ANNOTATION_HASH_ANCHOR}=`;
	const index = hash.indexOf(anchor);
	if (index === -1) {
		return;
	}
	return hash.slice(index + anchor.length, index + anchor.length + 36) as UUID;
}

function scrollToElement(element: Element): void {
	element.scrollIntoView({ block: 'start', inline: 'start', behavior: 'smooth' });
}

function normalizeText(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}

function createAnnotationFromSelection<M>(
	selection: Selection,
	createMetadata: () => M,
): DomAnnotation<M> | undefined {
	const range = selection.getRangeAt(0);
	if (range.collapsed) {
		return;
	}

	const id = crypto.randomUUID();
	const originalUrl = location.href;
	const normalizedUrl = normalizeUrl(originalUrl);
	const annotationUrl = createAnnotationUrl(normalizedUrl, id);

	return {
		id,
		version: STORE_FORMAT_VERSION,
		text: selection.toString(),
		originalUrl,
		normalizedUrl,
		annotationUrl,
		createdAt: new Date(),
		metadata: createMetadata(),
		range,
	};
}

export function createAnno(): Anno<unknown>;
export function createAnno<M, S>(options: AnnoOptions<M, S>): Anno<M>;
export function createAnno<M, S>(options?: AnnoOptions<M, S>): Anno<M> | Anno<unknown> {
	if (options) {
		return {
			annotate: async (): Promise<DomAnnotation<M> | undefined> => {
				const annotation = annotate(options.createMetadata);
				if (!annotation) {
					return;
				}
				await create(annotation, options.encodeMetadata);
				return annotation;
			},
			restore: async (): Promise<Annotation<M>[]> => {
				return await initAnnotations(options.decodeMetadata);
			},
			readAll: async (): Promise<Annotations<M>> => {
				return await readAll(options.decodeMetadata);
			},
		};
	} else {
		const defaultOptions: DefaultAnnoOptions = {
			encodeMetadata: (m) => m,
			decodeMetadata: (s) => s,
			createMetadata: () => ({}),
		};
		return {
			annotate: async (): Promise<DomAnnotation<unknown> | undefined> => {
				const annotation = annotate(defaultOptions.createMetadata);
				if (!annotation) {
					return;
				}
				await create(annotation, defaultOptions.encodeMetadata);
				return annotation;
			},
			restore: async (): Promise<Annotation<unknown>[]> => {
				return await initAnnotations(defaultOptions.decodeMetadata);
			},
			readAll: async (): Promise<Annotations<unknown>> => {
				return await readAll(defaultOptions.decodeMetadata);
			},
		};
	}
}
