import { AnnoOptions, ResolveAnnoOptions } from './types';

export function resolveOptions<M, S>(
  options?: AnnoOptions<M, S>,
): ResolveAnnoOptions<M, S> {
  const metadata = options?.metadata
    // default metadata conversion, just an empty object
    ?? {
      init: () => ({} as M),
      encode: () => ({} as S),
      decode: () => ({} as M),
    };
  const cssRegistry = options?.cssRegistry ?? 'anno--styles';

  return { metadata, cssRegistry };
}
