import RBush from 'rbush';
import { DomAnnotation, DomAnnotationQueryOptions } from './types';

const domAnnotationsRegistry = new RBush();

type RTreeAnnotation<M> = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  data: DomAnnotation<M>;
};

export function recordDomAnnotation<M>(annotation: DomAnnotation<M>) {
  const rect = annotation.range.getBoundingClientRect();
  domAnnotationsRegistry.insert({
    minX: rect.left,
    maxX: rect.right,
    minY: rect.top,
    maxY: rect.bottom,
    data: annotation,
  });
}

export function queryDomAnnotations<M>(
  option: DomAnnotationQueryOptions,
): DomAnnotation<M>[] {
  const res = domAnnotationsRegistry.search({
    minX: option.x,
    minY: option.y,
    maxX: option.x,
    maxY: option.y,
  }) as RTreeAnnotation<M>[];
  return res.map((r: { data: DomAnnotation<M> }) => r.data);
}
