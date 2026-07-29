/**
 * Global `fetch` must not be extracted and called unbound (`fetch(url)` fails in Workers).
 * @param {typeof fetch} [fetchImpl]
 * @returns {typeof fetch}
 */
export function bindFetch(fetchImpl = globalThis.fetch) {
  return (input, init) => fetchImpl.call(globalThis, input, init);
}
