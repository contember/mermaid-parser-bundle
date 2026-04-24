// DOMPurify stub. For a parser-only bundle there's nothing to sanitize
// (SVG never gets assembled). `sanitize` becomes identity; `addHook` is
// a no-op so module top-level calls in mermaid/src/diagrams/common/common.ts
// succeed.
const api = {
  sanitize: (text: unknown) => (text == null ? '' : String(text)),
  addHook: () => {},
  removeHook: () => {},
  removeHooks: () => {},
  isValidAttribute: () => true,
  isSupported: true,
  version: 'stub',
  setConfig: () => {},
  clearConfig: () => {},
};
export default api;
