export type UUID = `${string}-${string}-${string}-${string}-${string}`;

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
  /**
   * unique identifier for the annotation
   */
  id: UUID;

  /**
   * the storage version when this annotation is saved
   */
  version: string;

  /**
   * the actual annotated content
   */
  text: string;

  /**
   * the original url for the annotation
   */
  originalUrl: string;

  /**
   * the normalized url, used for look up
   */
  normalizedUrl: string;

  /**
   * the url that can be used to jump to the element on the page
   */
  annotationUrl: string;

  /**
   * optional metadata from users
   */
  metadata: T;
}

/**
 * The annotation that can be used / queried in both content script and popup
 */
export interface Annotation<M> extends IAnnotation<M> {
  /**
   * createdAt: when was this annotation created
   */
  createdAt: Date;
}

/**
 * the annotation exists on the dom. This can only be created / queried inside content_script
 */
export interface DomAnnotation<M> extends Annotation<M> {
  /*
   * the actual range for the annotation (highlight) on the DOM
   */
  range: Range;
  /*
   * the closet element for the annotation
   */
  scrollElement: Element;
}

/**
 * the annotation that can only be exists inside the chrome storage
 */
export interface StoredAnnotation<S> extends IAnnotation<S> {
  createdAt: string;
  range: StoredRange;
  scrollElement: StoredNode;
}

export type AnnoOptions<Memory, Storable> = {
  metadata: {
    init: () => Memory;
    encode: (m: Memory) => Storable;
    decode: (s: Storable) => Memory;
  };
  cssClass?: string;
};

export type DomAnnotationQueryOptions = {
  x: number;
  y: number;
};

export type AnnoContent<M> = {
  annotate: () => Promise<DomAnnotation<M> | undefined>;
  restore: () => Promise<DomAnnotation<M>[]>;
  query: (options: DomAnnotationQueryOptions) => DomAnnotation<M>[];
};

export type AnnoPopup<M> = {
  get: () => Promise<Annotations<M>>;
  updateMetadata: (
    annotationId: UUID,
    updateFn: (m: M) => M,
  ) => Promise<Annotation<M>>;
};

export type Anno<M> = {
  content: AnnoContent<M>;
  popup: AnnoPopup<M>;
};

export type AnnoStore<M> = {
  content: {
    get: () => Promise<DomAnnotation<M>[]>;
    set: (annotation: DomAnnotation<M>) => Promise<void>;
  };
  popup: {
    get: () => Promise<Annotations<M>>;
    updateMetadata: (
      annotationId: UUID,
      updateFn: (m: M) => M,
    ) => Promise<Annotation<M>>;
  };
};

export type AnnoCodec<M, S> = {
  /**
   * encode the `DomAnnotation` to `StoredAnnotation`
   */
  encode: (annotation: DomAnnotation<M>) => StoredAnnotation<S>;

  /**
   * decode the `StoredAnnotation` to `Annotation`
   */
  decode: (stored: StoredAnnotation<S>) => Annotation<M>;

  /**
   * decode the `StoredAnnotation` to `DomAnnotation`
   */
  decodeDom: (stored: StoredAnnotation<S>) => DomAnnotation<M> | undefined;

  metadata: {
    encode: (m: M) => S;
    decode: (s: S) => M;
  };
};
