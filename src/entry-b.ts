// Custom parser-only entrypoint for mermaid.
//
// Exposes `parse(text)` → `{ type, db }`. Bypasses `mermaidAPI`, `Diagram`,
// `addDiagrams` and every `*Diagram.ts` file (all of which drag in renderer
// code via their top-level `import renderer from ...` line). Instead we load
// the exact same `parser` and `db` modules each `*Diagram.ts` would load,
// minus renderer + styles.
//
// Heavy render-only deps (d3, cytoscape, katex, roughjs, marked, stylis,
// @iconify/utils, layout-base, cose-base, khroma, @upsetjs/venn.js,
// d3-sankey, d3-sankey-circular) are aliased to empty stubs by the build
// script. See build-b.ts.

import { frontMatterRegex, anyCommentRegex, directiveRegex } from '@mermaid/src/diagram-api/regexes.js';

type Parser = { parse: (text: string) => unknown; parser?: { yy?: unknown } };
type DiagramModule = {
  parser: Parser;
  db: any;
  preprocess?: (text: string) => string;
};

type Detector = (text: string) => boolean;

// Order mirrors addDiagrams() in mermaid/src/diagram-api/diagram-orchestration.ts.
const DIAGRAMS: Array<{ id: string; detector: Detector; load: () => Promise<DiagramModule> }> = [
  {
    id: 'c4',
    detector: (t) => /^\s*C4Context|C4Container|C4Component|C4Dynamic|C4Deployment/.test(t),
    load: async () => {
      const parser = (await import('@mermaid/src/diagrams/c4/parser/c4Diagram.jison')).default;
      const db = (await import('@mermaid/src/diagrams/c4/c4Db.js')).default;
      return { parser, db };
    },
  },
  {
    id: 'kanban',
    detector: (t) => /^\s*kanban/.test(t),
    load: async () => {
      const parser = (await import('@mermaid/src/diagrams/kanban/parser/kanban.jison')).default;
      const db = (await import('@mermaid/src/diagrams/kanban/kanbanDb.js')).default;
      return { parser, db };
    },
  },
  {
    id: 'classDiagram',
    detector: (t) => /^\s*classDiagram-v2/.test(t),
    load: async () => {
      const parser = (await import('@mermaid/src/diagrams/class/parser/classDiagram.jison')).default;
      const { ClassDB } = await import('@mermaid/src/diagrams/class/classDb.js');
      return { parser, db: new ClassDB() };
    },
  },
  {
    id: 'class',
    detector: (t) => /^\s*classDiagram/.test(t),
    load: async () => {
      const parser = (await import('@mermaid/src/diagrams/class/parser/classDiagram.jison')).default;
      const { ClassDB } = await import('@mermaid/src/diagrams/class/classDb.js');
      return { parser, db: new ClassDB() };
    },
  },
  {
    id: 'er',
    detector: (t) => /^\s*erDiagram/.test(t),
    load: async () => {
      const parser = (await import('@mermaid/src/diagrams/er/parser/erDiagram.jison')).default;
      const { ErDB } = await import('@mermaid/src/diagrams/er/erDb.js');
      return { parser, db: new ErDB() };
    },
  },
  {
    id: 'gantt',
    detector: (t) => /^\s*gantt/.test(t),
    load: async () => {
      const parser = (await import('@mermaid/src/diagrams/gantt/parser/gantt.jison')).default;
      const db = (await import('@mermaid/src/diagrams/gantt/ganttDb.js')).default;
      return { parser, db };
    },
  },
  {
    id: 'info',
    detector: (t) => /^\s*info/.test(t),
    load: async () => {
      const { parser } = await import('@mermaid/src/diagrams/info/infoParser.js');
      const { db } = await import('@mermaid/src/diagrams/info/infoDb.js');
      return { parser, db };
    },
  },
  {
    id: 'pie',
    detector: (t) => /^\s*pie/.test(t),
    load: async () => {
      const { parser } = await import('@mermaid/src/diagrams/pie/pieParser.js');
      const { db } = await import('@mermaid/src/diagrams/pie/pieDb.js');
      return { parser, db };
    },
  },
  {
    id: 'requirement',
    detector: (t) => /^\s*requirement(Diagram)?/.test(t),
    load: async () => {
      const parser = (await import('@mermaid/src/diagrams/requirement/parser/requirementDiagram.jison')).default;
      const { RequirementDB } = await import('@mermaid/src/diagrams/requirement/requirementDb.js');
      return { parser, db: new RequirementDB() };
    },
  },
  {
    id: 'sequence',
    detector: (t) => /^\s*sequenceDiagram/.test(t),
    load: async () => {
      const parser = (await import('@mermaid/src/diagrams/sequence/parser/sequenceDiagram.jison')).default;
      const { SequenceDB } = await import('@mermaid/src/diagrams/sequence/sequenceDb.js');
      return { parser, db: new SequenceDB() };
    },
  },
  {
    // Swimlanes reuses flowchart's parser + FlowDB wholesale; it only swaps the
    // layout engine at render time, which we drop. `swimlane` is a graph-start
    // keyword in flow.jison.
    id: 'swimlane',
    detector: (t) => /^\s*swimlane\b/.test(t),
    load: async () => {
      const parser = (await import('@mermaid/src/diagrams/flowchart/parser/flowParser.js')).default;
      const { FlowDB } = await import('@mermaid/src/diagrams/flowchart/flowDb.js');
      return {
        parser,
        db: new FlowDB(),
        preprocess: (src) => src.replace(/}\s*\n/g, '}\n'),
      };
    },
  },
  {
    id: 'flowchart-v2',
    detector: (t) => /^\s*flowchart/.test(t),
    load: async () => {
      const parser = (await import('@mermaid/src/diagrams/flowchart/parser/flowParser.js')).default;
      const { FlowDB } = await import('@mermaid/src/diagrams/flowchart/flowDb.js');
      return {
        parser,
        db: new FlowDB(),
        preprocess: (src) => src.replace(/}\s*\n/g, '}\n'),
      };
    },
  },
  {
    id: 'flowchart',
    detector: (t) => /^\s*graph/.test(t),
    load: async () => {
      const parser = (await import('@mermaid/src/diagrams/flowchart/parser/flowParser.js')).default;
      const { FlowDB } = await import('@mermaid/src/diagrams/flowchart/flowDb.js');
      return {
        parser,
        db: new FlowDB(),
        preprocess: (src) => src.replace(/}\s*\n/g, '}\n'),
      };
    },
  },
  {
    id: 'timeline',
    detector: (t) => /^\s*timeline/.test(t),
    load: async () => {
      const parser = (await import('@mermaid/src/diagrams/timeline/parser/timeline.jison')).default;
      const db = await import('@mermaid/src/diagrams/timeline/timelineDb.js');
      return { parser, db };
    },
  },
  {
    id: 'gitGraph',
    detector: (t) => /^\s*gitGraph/.test(t),
    load: async () => {
      const { parser } = await import('@mermaid/src/diagrams/git/gitGraphParser.js');
      const { db } = await import('@mermaid/src/diagrams/git/gitGraphAst.js');
      return { parser, db };
    },
  },
  {
    id: 'stateDiagram',
    detector: (t) => /^\s*stateDiagram-v2/.test(t),
    load: async () => {
      const parser = (await import('@mermaid/src/diagrams/state/parser/stateDiagram.jison')).default;
      const { StateDB } = await import('@mermaid/src/diagrams/state/stateDb.js');
      return { parser, db: new StateDB(2) };
    },
  },
  {
    id: 'state',
    detector: (t) => /^\s*stateDiagram/.test(t),
    load: async () => {
      const parser = (await import('@mermaid/src/diagrams/state/parser/stateDiagram.jison')).default;
      const { StateDB } = await import('@mermaid/src/diagrams/state/stateDb.js');
      return { parser, db: new StateDB(1) };
    },
  },
  {
    id: 'journey',
    detector: (t) => /^\s*journey/.test(t),
    load: async () => {
      const parser = (await import('@mermaid/src/diagrams/user-journey/parser/journey.jison')).default;
      const db = (await import('@mermaid/src/diagrams/user-journey/journeyDb.js')).default;
      return { parser, db };
    },
  },
  {
    id: 'quadrantChart',
    detector: (t) => /^\s*quadrantChart/.test(t),
    load: async () => {
      const parser = (await import('@mermaid/src/diagrams/quadrant-chart/parser/quadrant.jison')).default;
      const db = (await import('@mermaid/src/diagrams/quadrant-chart/quadrantDb.js')).default;
      return { parser, db };
    },
  },
  {
    id: 'sankey',
    detector: (t) => /^\s*sankey(-beta)?/.test(t),
    load: async () => {
      const parser = (await import('@mermaid/src/diagrams/sankey/parser/sankey.jison')).default;
      const db = (await import('@mermaid/src/diagrams/sankey/sankeyDB.js')).default;
      const { prepareTextForParsing } = await import('@mermaid/src/diagrams/sankey/sankeyUtils.js');
      return {
        parser,
        db,
        preprocess: (src) => prepareTextForParsing(src),
      };
    },
  },
  {
    id: 'packet',
    detector: (t) => /^\s*packet(-beta)?/.test(t),
    load: async () => {
      const { parser } = await import('@mermaid/src/diagrams/packet/parser.js');
      const { PacketDB } = await import('@mermaid/src/diagrams/packet/db.js');
      return { parser, db: new PacketDB() };
    },
  },
  {
    id: 'xychart',
    detector: (t) => /^\s*xychart(-beta)?/.test(t),
    load: async () => {
      const parser = (await import('@mermaid/src/diagrams/xychart/parser/xychart.jison')).default;
      const db = (await import('@mermaid/src/diagrams/xychart/xychartDb.js')).default;
      if (typeof (db as any).setTmpSVGG === 'undefined') {
        (db as any).setTmpSVGG = () => {};
      }
      return { parser, db };
    },
  },
  {
    id: 'block',
    detector: (t) => /^\s*block(-beta)?/.test(t),
    load: async () => {
      const parser = (await import('@mermaid/src/diagrams/block/parser/block.jison')).default;
      const db = (await import('@mermaid/src/diagrams/block/blockDB.js')).default;
      return { parser, db };
    },
  },
  {
    id: 'eventmodeling',
    detector: (t) => /^\s*eventmodeling/.test(t),
    load: async () => {
      const { parser } = await import('@mermaid/src/diagrams/eventmodeling/parser.js');
      const { db } = await import('@mermaid/src/diagrams/eventmodeling/db.js');
      return { parser, db };
    },
  },
  {
    id: 'treeView',
    detector: (t) => /^\s*treeView\b/.test(t),
    load: async () => {
      const { parser } = await import('@mermaid/src/diagrams/treeView/parser.js');
      const db = (await import('@mermaid/src/diagrams/treeView/db.js')).default;
      return { parser, db };
    },
  },
  {
    id: 'radar',
    detector: (t) => /^\s*radar(-beta)?/.test(t),
    load: async () => {
      const { parser } = await import('@mermaid/src/diagrams/radar/parser.js');
      const { db } = await import('@mermaid/src/diagrams/radar/db.js');
      return { parser, db };
    },
  },
  {
    id: 'ishikawa',
    detector: (t) => /^\s*ishikawa(-beta)?\b/i.test(t),
    load: async () => {
      const parser = (await import('@mermaid/src/diagrams/ishikawa/parser/ishikawa.jison')).default;
      const { IshikawaDB } = await import('@mermaid/src/diagrams/ishikawa/ishikawaDb.js');
      return { parser, db: new IshikawaDB() };
    },
  },
  {
    id: 'treemap',
    detector: (t) => /^\s*treemap/.test(t),
    load: async () => {
      const { parser } = await import('@mermaid/src/diagrams/treemap/parser.js');
      const { TreeMapDB } = await import('@mermaid/src/diagrams/treemap/db.js');
      return { parser, db: new TreeMapDB() };
    },
  },
  {
    id: 'venn',
    detector: (t) => /^\s*venn-beta/.test(t),
    load: async () => {
      const parser = (await import('@mermaid/src/diagrams/venn/parser/venn.jison')).default;
      const { db } = await import('@mermaid/src/diagrams/venn/vennDB.js');
      return { parser, db };
    },
  },
  {
    id: 'wardley',
    detector: (t) => /^\s*wardley/.test(t),
    load: async () => {
      const { parser } = await import('@mermaid/src/diagrams/wardley/wardleyParser.js');
      const db = (await import('@mermaid/src/diagrams/wardley/wardleyDb.js')).default;
      return { parser, db };
    },
  },
  {
    id: 'mindmap',
    detector: (t) => /^\s*mindmap/.test(t),
    load: async () => {
      const parser = (await import('@mermaid/src/diagrams/mindmap/parser/mindmap.jison')).default;
      const { MindmapDB } = await import('@mermaid/src/diagrams/mindmap/mindmapDb.js');
      return { parser, db: new MindmapDB() };
    },
  },
  {
    id: 'architecture',
    detector: (t) => /^\s*architecture/.test(t),
    load: async () => {
      const { parser } = await import('@mermaid/src/diagrams/architecture/architectureParser.js');
      const { ArchitectureDB } = await import('@mermaid/src/diagrams/architecture/architectureDb.js');
      // Architecture's parser reads the db off `parser.parser.yy` (set by the
      // main entrypoint's generic Jison wiring).
      return { parser, db: new ArchitectureDB() };
    },
  },
  {
    // Railroad and its EBNF/ABNF/PEG variants share one Langium `db` singleton
    // but each has its own grammar/parser.
    id: 'railroad',
    detector: (t) => /^\s*railroad-diagram/i.test(t),
    load: async () => {
      const { parser } = await import('@mermaid/src/diagrams/railroad/parser/railroadParser.js');
      const db = (await import('@mermaid/src/diagrams/railroad/railroadDb.js')).default;
      return { parser, db };
    },
  },
  {
    id: 'railroadEbnf',
    detector: (t) => /^\s*railroad-ebnf/i.test(t),
    load: async () => {
      const { parser } = await import('@mermaid/src/diagrams/railroad/parser/ebnfParser.js');
      const db = (await import('@mermaid/src/diagrams/railroad/railroadDb.js')).default;
      return { parser, db };
    },
  },
  {
    id: 'railroadAbnf',
    detector: (t) => /^\s*railroad-abnf/i.test(t),
    load: async () => {
      const { parser } = await import('@mermaid/src/diagrams/railroad/parser/abnfParser.js');
      const db = (await import('@mermaid/src/diagrams/railroad/railroadDb.js')).default;
      return { parser, db };
    },
  },
  {
    id: 'railroadPeg',
    detector: (t) => /^\s*railroad-peg/i.test(t),
    load: async () => {
      const { parser } = await import('@mermaid/src/diagrams/railroad/parser/pegParser.js');
      const db = (await import('@mermaid/src/diagrams/railroad/railroadDb.js')).default;
      return { parser, db };
    },
  },
  {
    id: 'cynefin',
    detector: (t) => /^\s*cynefin-beta(?:[\s:]|$)/.test(t),
    load: async () => {
      const { parser } = await import('@mermaid/src/diagrams/cynefin/cynefinParser.js');
      const { db } = await import('@mermaid/src/diagrams/cynefin/cynefinDb.js');
      return { parser, db };
    },
  },
];

export type ParseResult = { type: string; db: any };

export class MermaidParseError extends Error {}

function detectType(text: string): string {
  const stripped = text
    .replace(frontMatterRegex, '')
    .replace(directiveRegex, '')
    .replace(anyCommentRegex, '\n');
  for (const d of DIAGRAMS) {
    if (d.detector(stripped)) return d.id;
  }
  throw new MermaidParseError(`No diagram type detected`);
}

export async function parse(text: string): Promise<ParseResult> {
  const type = detectType(text);
  const entry = DIAGRAMS.find((d) => d.id === type)!;
  const module = await entry.load();

  // Jison sets `parser.parser.yy = db` so grammar actions mutate the db.
  // Langium wrappers already have a captured `db` — skipping yy is fine.
  if (module.parser.parser) {
    module.parser.parser.yy = module.db;
  }
  module.db.clear?.();

  const src = module.preprocess ? module.preprocess(text) : text;
  await module.parser.parse(src);
  return { type, db: module.db };
}

export default { parse };
