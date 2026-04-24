// Stubs for common/svgDrawCommon.js helpers — render-only.
export const createTooltip = () => ({
  html: () => ({ style: () => ({ style: () => ({}) }) }),
  style: () => ({ style: () => ({}) }),
  remove: () => ({}),
});
export const drawRect = () => {};
export const drawText = () => {};
export const drawImage = () => {};
export const drawEmbeddedImage = () => {};
export const getNoteRect = () => ({ x: 0, y: 0, width: 0, height: 0, rx: 0, ry: 0 });
export const getTextObj = () => ({ x: 0, y: 0, anchor: 'start', fill: '#000', style: '#666', width: 100, height: 100, textMargin: 0, rx: 0, ry: 0, tspan: true });
export const drawBackgroundRect = () => {};
export const drawKatex = () => ({});
