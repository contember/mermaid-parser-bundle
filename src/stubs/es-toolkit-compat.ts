// Replacement for `es-toolkit/compat`. Mermaid only uses `clone`, `merge`, and
// `memoize` during parsing. Real es-toolkit/compat re-exports ~250 lodash-es
// modules (≈35 KB); these native-JS equivalents come in under a KB.

export const clone = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice() as unknown as T;
  return { ...(value as object) } as T;
};

export const merge = <T>(target: any, ...sources: any[]): T => {
  for (const src of sources) {
    if (src == null) continue;
    for (const key of Object.keys(src)) {
      const sv = src[key];
      const tv = target[key];
      if (sv && typeof sv === 'object' && !Array.isArray(sv) && tv && typeof tv === 'object' && !Array.isArray(tv)) {
        merge(tv, sv);
      } else {
        target[key] = sv;
      }
    }
  }
  return target;
};

export const memoize = <F extends (...a: any[]) => any>(fn: F): F => {
  const cache = new Map<string, ReturnType<F>>();
  return ((...args: any[]) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key)!;
    const out = fn(...args);
    cache.set(key, out);
    return out;
  }) as F;
};

export const isEmpty = (v: unknown): boolean => {
  if (v == null) return true;
  if (Array.isArray(v) || typeof v === 'string') return (v as any).length === 0;
  if (v instanceof Map || v instanceof Set) return (v as any).size === 0;
  if (typeof v === 'object') return Object.keys(v as object).length === 0;
  return false;
};
