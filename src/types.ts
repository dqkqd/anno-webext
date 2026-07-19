export type UUID = `${string}-${string}-${string}-${string}-${string}`;

export type StoredAnnotations<Meta> = {
	[normalizedUrl: string]: StoredAnnotation<Meta>[];
};

export type Annotations<Meta> = {
	[normalizedUrl: string]: Annotation<Meta>[];
};

export type StoredNode = {
	xpath: string;
};

export type StoredRange = {
	startContainer: StoredNode;
	startOffset: number;
	endContainer: StoredNode;
	endOffset: number;
};

interface IAnnotation<T> {
	id: UUID;
	version: string;
	text: string;
	originalUrl: string;
	normalizedUrl: string;
	annotationUrl: string;
	metadata: T;
}

export interface DomAnnotation<M> extends IAnnotation<M> {
	createdAt: Date;
	range: Range;
}

export interface Annotation<M> extends IAnnotation<M> {
	createdAt: Date;
}

export interface StoredAnnotation<S> extends IAnnotation<S> {
	createdAt: string;
	range: StoredRange;
	scrollElement: StoredNode;
}

export type AnnoOptions<Memory, Storable> = {
	encodeMetadata: (m: Memory) => Storable;
	decodeMetadata: (s: Storable) => Memory;
	createMetadata: () => Memory;
};

export type Anno<M> = {
	annotate: () => Promise<DomAnnotation<M> | undefined>;
	restore: () => Promise<DomAnnotation<M>[]>;
	readAll: () => Promise<Annotations<M>>;
	updateMetadata: (annotationId: UUID, updateFn: (m: M) => M) => Promise<Annotation<M>>;
};
