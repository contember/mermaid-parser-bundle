// d3 is only needed by renderers. Parsing may reference `select` and friends
// from some `*Db.ts` modules, but those call sites run at render time
// (tooltips, class wiring). A chainable no-op proxy satisfies the imports and
// lets esbuild drop hundreds of KB of d3 code from the bundle.

const noop = () => proxy;
const handler: ProxyHandler<any> = {
  get: () => proxy,
  apply: () => proxy,
  construct: () => proxy,
};
const proxy: any = new Proxy(noop, handler);

// Hand-enumerated subset actually imported from mermaid source. If mermaid
// adds new d3 imports, esbuild will fail with "No matching export" — extend
// the list then.
export const select = proxy;
export const selectAll = proxy;
export const scaleLinear = proxy;
export const scaleBand = proxy;
export const scaleOrdinal = proxy;
export const curveBasis = proxy;
export const curveBasisClosed = proxy;
export const curveBasisOpen = proxy;
export const curveBumpX = proxy;
export const curveBumpY = proxy;
export const curveBundle = proxy;
export const curveCardinal = proxy;
export const curveCardinalClosed = proxy;
export const curveCardinalOpen = proxy;
export const curveCatmullRom = proxy;
export const curveCatmullRomClosed = proxy;
export const curveCatmullRomOpen = proxy;
export const curveLinear = proxy;
export const curveLinearClosed = proxy;
export const curveMonotoneX = proxy;
export const curveMonotoneY = proxy;
export const curveNatural = proxy;
export const curveStep = proxy;
export const curveStepAfter = proxy;
export const curveStepBefore = proxy;
export const arc = proxy;
export const pie = proxy;
export const line = proxy;
export const format = proxy;
export const hierarchy = proxy;
export const treemap = proxy;
export const stratify = proxy;
export const axisBottom = proxy;
export const axisTop = proxy;
export const axisLeft = proxy;
export const axisRight = proxy;
export const interpolateNumber = proxy;
export const interpolateHcl = proxy;
export const max = proxy;
export const min = proxy;
export const extent = proxy;
export const range = proxy;
export const zoom = proxy;
export const zoomIdentity = proxy;
export const drag = proxy;
export const ascending = proxy;
export const descending = proxy;
export const sum = proxy;
export const group = proxy;
export const cluster = proxy;
export const tree = proxy;
export const easeLinear = proxy;
export const easeCubic = proxy;
export const easeCubicOut = proxy;
export const transition = proxy;
export const path = proxy;
export default proxy;
