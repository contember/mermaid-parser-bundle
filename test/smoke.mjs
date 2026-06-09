// Smoke test: import the built bundle and parse one sample of each diagram
// type. Reports pass/fail per type.
import { parse } from '../dist/index.mjs';

const samples = [
  ['flowchart-v2', `flowchart TD\n  A --> B\n  B --> C\n  A --> C`],
  ['flowchart', `graph LR\n  A --> B`],
  ['swimlane', `swimlane TD\n  A --> B\n  B --> C`],
  ['sequence', `sequenceDiagram\n  Alice->>Bob: Hello\n  Bob-->>Alice: Hi`],
  ['class', `classDiagram\n  class Animal\n  class Dog\n  Animal <|-- Dog`],
  ['er', `erDiagram\n  CUSTOMER ||--o{ ORDER : places`],
  ['gantt', `gantt\n  title Roadmap\n  dateFormat YYYY-MM-DD\n  section One\n  task :a1, 2024-01-01, 7d`],
  ['gitGraph', `gitGraph\n  commit\n  branch dev\n  commit\n  checkout main\n  merge dev`],
  ['stateDiagram', `stateDiagram-v2\n  [*] --> A\n  A --> [*]`],
  ['state', `stateDiagram\n  [*] --> A\n  A --> [*]`],
  ['journey', `journey\n  title My day\n  section Morning\n    Breakfast: 5: Me`],
  ['quadrantChart', `quadrantChart\n  title Reach vs Effort\n  x-axis Low --> High\n  y-axis Low --> High`],
  ['sankey', `sankey-beta\nA,B,1\nB,C,2`],
  ['xychart', `xychart-beta\n  title "X/Y"\n  x-axis [jan, feb]\n  y-axis "Sales" 0 --> 10\n  bar [5, 7]`],
  ['block', `block-beta\n  a --> b\n  b --> c`],
  ['mindmap', `mindmap\n  Root\n    A\n    B`],
  ['requirement', `requirementDiagram\n\nrequirement test_req {\n  id: 1\n  text: the test\n  risk: high\n  verifymethod: test\n}`],
  ['timeline', `timeline\n  title My timeline\n  2020: Event 1\n  2021: Event 2`],
  ['c4', `C4Context\n  Person(a, "Alice")\n  System(b, "System")\n  Rel(a, b, "uses")`],
  ['kanban', `kanban\n  Todo\n    Task 1`],
  ['info', `info`],
  ['pie', `pie\n  title Pie\n  "A": 10\n  "B": 20`],
  ['packet', `packet-beta\n  0-15: "Source"\n  16-31: "Dest"`],
  ['radar', `radar-beta\n  title Radar\n  axis A, B, C\n  curve c1{1, 2, 3}`],
  ['treemap', `treemap\n"Root"\n"Child": 100`],
  ['wardley', `wardley-beta\ntitle Example\ncomponent Alpha [0.2, 0.1]`],
  ['architecture', `architecture-beta\n  group api(cloud)[API]\n  service db(database)[Database] in api`],
  ['treeView', `treeView-beta\nsrc\n  index.js`],
  ['eventmodeling', `eventmodeling\n  tf 01 ui UI\n  tf 02 cmd RunAction\n  tf 03 evt ActionExecuted`],
  ['ishikawa', `ishikawa-beta\n  Blurry Photo\n    Process\n      Out of focus`],
  ['venn', `venn-beta\n  set A\n  set B\n  union A,B`],
  ['railroad', `railroad-diagram\n  rule = terminal("hello") ;`],
  ['railroadEbnf', `railroad-ebnf\n  rule = "terminal" ;`],
  ['railroadAbnf', `railroad-abnf\n  rule = "hello" ;`],
  ['railroadPeg', `railroad-peg\n  rule <- "hello" ;`],
  ['cynefin', `cynefin-beta\n  complex\n    "Emergent practice"\n  clear\n    "Best practice"`],
];

const results = [];
for (const [name, text] of samples) {
  try {
    const r = await parse(text);
    results.push({ name, ok: true, type: r.type });
  } catch (e) {
    results.push({ name, ok: false, err: String(e?.message ?? e).slice(0, 200) });
  }
}

let pass = 0;
for (const r of results) {
  const status = r.ok ? `✓  ${r.type}` : `✗  ${r.err}`;
  console.log(`${r.name.padEnd(16)} ${status}`);
  if (r.ok) pass++;
}
console.log(`\n${pass}/${results.length} passed`);
if (pass !== results.length) process.exitCode = 1;
