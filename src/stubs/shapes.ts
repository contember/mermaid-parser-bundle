// Tiny replacement for `rendering-util/rendering-elements/shapes.ts`.
// The full module imports ~50 render-only shape modules; the parser only
// reaches `isValidShape`, so we hardcode the shape id list.
export const shapesDefs: never[] = [];
export const shapes: Record<string, true> = Object.create(null);

const SHAPE_IDS = [
  'anchor','bowTieRect','card','choice','circle','crossedCircle','curlyBraceLeft',
  'curlyBraceRight','curlyBraces','curvedTrapezoid','cylinder','datastore',
  'dividedRectangle','doublecircle','filledCircle','flippedTriangle','forkJoin',
  'halfRoundedRectangle','hexagon','hourglass','icon','iconCircle','iconRounded',
  'iconSquare','imageSquare','inv_trapezoid','labelRect','lean_left','lean_right',
  'lightningBolt','linedCylinder','linedWaveEdgedRect','multiRect','multiWaveEdgedRectangle',
  'note','question','rect','rect_left_inv_arrow','rectWithTitle','roundedRect',
  'shadedProcess','slopedRect','squareRect','stadium','stateEnd','stateStart',
  'subroutine','taggedRect','taggedWaveEdgedRectangle','text','tiltedCylinder',
  'trapezoid','trapezoidalPentagon','triangle','waveEdgedRectangle','waveRectangle',
  'windowPane','classBox','erBox','kanbanItem','labelledCircle','stadiumPath',
  'odd','diamond','hexagon2','circle2','stadium2','stateMarker','stateBox'
];
for (const id of SHAPE_IDS) shapes[id] = true;

export const isValidShape = (shape: string): boolean => shape in shapes;
