import RBush from 'rbush';
import { RenderableAnnotation, DomAnnotationQueryOptions } from './types';

const domAnnotationsRegistry = new RBush();

type RTreeAnnotation<M> = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  data: RenderableAnnotation<M>;
};

export const rtree = {
  clear: (): void => {
    domAnnotationsRegistry.clear();
  },
  record: <M>(annotation: RenderableAnnotation<M>): void => {
    const rect = annotation.range.getBoundingClientRect();
    domAnnotationsRegistry.insert({
      minX: rect.left,
      maxX: rect.right,
      minY: rect.top,
      maxY: rect.bottom,
      data: annotation,
    });
  },
  query: <M>(option: DomAnnotationQueryOptions): RenderableAnnotation<M>[] => {
    const res = domAnnotationsRegistry.search({
      minX: option.x,
      minY: option.y,
      maxX: option.x,
      maxY: option.y,
    }) as RTreeAnnotation<M>[];
    return res.map((r: { data: RenderableAnnotation<M> }) => r.data);
  },
};
