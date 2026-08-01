import { UUID } from 'crypto';

export type Annotations<Meta> = {
  [normalizedUrl: string]: Annotation<Meta>[];
};

export type StoredRange = {
  startContainerXPath: string;
  startOffset: number;
  endContainerXPath: string;
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
export interface RenderableAnnotation<M> extends Annotation<M> {
  /*
   * the actual range for the annotation (highlight) on the DOM
   */
  range: Range;
}

/**
 * the annotation that can only be exists inside the chrome storage
 */
export interface StoredAnnotation<S> extends IAnnotation<S> {
  createdAt: string;
  range: StoredRange;
}

export type AnnoOptions<Memory, Storable> = {
  /**
   * Additional metadata on the highlight.
   *
   * An annotation must be persisted in the storage, so its metadata.
   * Therefore the metadata must be serializable. (i.e. firefox extension
   * storage doesn't store `Date` object, so the metadata must convert `Data`
   * string to avoid data loss)
   *
   * The metadata option requires 3 methods:
   *  - init: create a new in-memory metadata
   *  - encode: convert the in-memory metadata so that it can be stored on the storage
   *  - decode: convert the stored metadata to in-memory metadata
   *
   *  The metadata can be undefined, in such case, there is no metadata
   *  for the annotation.
   */
  metadata?: {
    init: () => Memory;
    encode: (m: Memory) => Storable;
    decode: (s: Storable) => Memory;
  };

  /**
   * The css registry name for the annotation.
   * For example, if `cssRegistry` is `highlight`, then the css will look like this:
   * ```css
   * ::highlight(user-1-highlight) {
   *   background-color: yellow;
   *   color: black;
   * }
   * ```
   * See more at [CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API#style_highlights)
   */
  cssRegistry?: string;
};

export type ResolveAnnoOptions<Memory, Storable> = Required<
  AnnoOptions<Memory, Storable>
>;

export type RenderableAnnotationQueryOptions = {
  /** Viewport-relative x coordinate (e.g. MouseEvent.clientX). */
  x: number;
  /** Viewport-relative y coordinate (e.g. MouseEvent.clientY). */
  y: number;
};

/**
 * The annotation functionalities that can be used in content script
 */
export type AnnoContent<M> = {
  /**
   * Annotate the current selected text
   */
  annotate: () => Promise<RenderableAnnotation<M> | undefined>;

  /**
   * Restore all annotations on a page
   */
  restore: () => Promise<
    { valid: RenderableAnnotation<M>[]; invalid: Annotation<M>[] }
  >;

  /**
   * Remove an annotation
   */
  remove: (annotationId: UUID) => Promise<void>;

  /**
   * Query annotations. At the moment, only the current mouse position
   *  is supported.
   */
  query: (
    options: RenderableAnnotationQueryOptions,
  ) => RenderableAnnotation<M>[];
};

/**
 * The annotation functionalities that can be used in content script
 */
export type AnnoPopup<M> = {
  /**
   * Get all the annotations
   */
  get: () => Promise<Annotations<M>>;

  /**
   * Update the metadata for an annotation
   */
  updateMetadata: (
    annotationId: UUID,
    updateFn: (m: M) => M,
  ) => Promise<Annotation<M>>;
};

/**
 * The annotation that maintain functions for content script and popup
 */
export type Anno<M> = {
  content: AnnoContent<M>;
  popup: AnnoPopup<M>;
};

export type AnnoStoreContentGet<M> = {
  valid: RenderableAnnotation<M>[];
  recoverable: RenderableAnnotation<M>[];
  unrecoverable: Annotation<M>[];
};

export type AnnoStore<M> = {
  content: {
    get: () => Promise<AnnoStoreContentGet<M>>;
    set: (annotation: RenderableAnnotation<M>) => Promise<void>;
    remove: (annotationId: UUID) => Promise<void>;
  };
  popup: {
    get: () => Promise<Annotations<M>>;
    updateMetadata: (
      annotationId: UUID,
      updateFn: (m: M) => M,
    ) => Promise<Annotation<M>>;
  };
};

export type AnnoCodecDecodeReturnType<M> =
  /*
   * The annotation is restored and can be rendered on the DOM
   */
  | { kind: 'valid'; annotation: RenderableAnnotation<M> }
  /*
   * The annotation is invalid, but can be restored using text matching.
   * And it can be rendered on the DOM.
   */
  | { kind: 'recoverable'; annotation: RenderableAnnotation<M> }
  /*
   * The annotation is invalid, cannot be restored using the text matching.
   * Cannot be rendered on the DOM.
   */
  | { kind: 'unrecoverable'; annotation: Annotation<M> };

export type AnnoCodec<M, S> = {
  /**
   * encode the `RenderableAnnotation` to `StoredAnnotation`
   */
  encode: (annotation: RenderableAnnotation<M>) => StoredAnnotation<S>;

  /**
   * decode the `StoredAnnotation` to `RenderableAnnotation`
   */
  decode: (
    stored: StoredAnnotation<S>,
  ) => AnnoCodecDecodeReturnType<M>;

  /**
   * decode the `StoredAnnotation` to `Annotation`
   */
  decodeNonRenderable: (stored: StoredAnnotation<S>) => Annotation<M>;

  metadata: {
    encode: (m: M) => S;
    decode: (s: S) => M;
  };
};
