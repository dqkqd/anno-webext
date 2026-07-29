import RBush from 'rbush';
import {
  RenderableAnnotation,
  RenderableAnnotationQueryOptions,
} from './types';

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
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    domAnnotationsRegistry.insert({
      minX: rect.left + scrollX,
      maxX: rect.right + scrollX,
      minY: rect.top + scrollY,
      maxY: rect.bottom + scrollY,
      data: annotation,
    });
  },
  query: <M>(
    option: RenderableAnnotationQueryOptions,
  ): RenderableAnnotation<M>[] => {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const res = domAnnotationsRegistry.search({
      minX: option.x + scrollX,
      minY: option.y + scrollY,
      maxX: option.x + scrollX,
      maxY: option.y + scrollY,
    }) as RTreeAnnotation<M>[];
    return res.map((r: { data: RenderableAnnotation<M> }) => r.data);
  },
};
