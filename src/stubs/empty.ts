// Generic empty stub — used for render-only deps (cytoscape, katex, roughjs,
// marked, stylis, @iconify/utils, @upsetjs/venn.js, d3-sankey, khroma,
// cytoscape-fcose, cytoscape-cose-bilkent, layout-base, cose-base, …).
// If the parse-only path ever exercises one of these, we'll get an obvious
// runtime error and can add a targeted stub; until then they contribute 0B.
const noop = () => {};
const handler: ProxyHandler<any> = {
  get: (_target, prop) => {
    if (prop === 'default' || prop === '__esModule') return proxy;
    return proxy;
  },
  apply: () => proxy,
  construct: () => proxy,
};
const proxy: any = new Proxy(noop, handler);

export default proxy;
