# mermaid-parser-bundle

A zero-dependency ESM bundle of [mermaid](https://github.com/mermaid-js/mermaid)'s
parsers. All 34 diagram types, no renderer code — no d3, no cytoscape, no
katex, no roughjs.

```bash
npm install mermaid-parser-bundle
```

```ts
import { parse } from 'mermaid-parser-bundle';

const { type, db } = await parse('flowchart TD\n  A --> B\n  B --> C');
// type → 'flowchart-v2'
// db   → the populated FlowDB instance (vertices, edges, subgraphs, …)
```

## Sizes

**Install footprint** — what `npm install <pkg>` adds to your project
(`scripts/measure-install.sh` reproduces this on any machine):

| Package                                    | `node_modules`           | Transitive deps |
| ------------------------------------------ | ------------------------ | --------------- |
| `mermaid`                                  | 125 MB                   | 65              |
| **`mermaid-parser-bundle`**                | **1.0 MB**               | **0** (zero)    |

**Bundle size after tree-shake** — if you already ship mermaid and bundle
it with esbuild/rolldown:

| Bundled entry                                          | Raw          | Gzip        |
| ------------------------------------------------------ | ------------ | ----------- |
| `import { parse } from 'mermaid'` (esbuild tree-shake) | 3 366 KB     | 923 KB      |
| **`import { parse } from 'mermaid-parser-bundle'`**    | **1 099 KB** | **283 KB**  |

Covers every diagram mermaid registers via `addDiagrams()`:
flowchart, sequence, class, state, er, gantt, pie, journey, gitGraph, mindmap,
c4, requirement, quadrantChart, xychart, sankey, block, timeline, kanban,
packet, info, treemap, treeView, radar, wardley, ishikawa, venn, architecture,
eventmodeling, swimlane, railroad, railroad-ebnf, railroad-abnf, railroad-peg,
cynefin.

`swimlane` reuses flowchart's grammar + `FlowDB` (it only swaps the layout
engine at render time). `flowchartElk` shares the `flowchart-v2` grammar (they
differ only in renderer) and `error` isn't a user-written type, so neither
needs its own entry.

## Development

This repo builds from mermaid's upstream source. We clone it into `mermaid-src/`
(gitignored), apply a pile of esbuild aliases and auto-stubs to collapse every
render-only module, and produce a single self-contained ESM file.

Prereqs: **Node ≥ 20**, **pnpm** (for mermaid's monorepo — `corepack enable` is
enough), **npm** (for this repo).

```bash
# one-time: clone + install mermaid-src, run Langium codegen
npm run setup

# install this package's build deps
npm install

# bake the defaultConfig JSON + bundle
npm run build

# parse a sample of every diagram
npm test
```

Outputs:
- `dist/index.mjs`       — minified bundle (the published artifact)
- `dist/index.unmin.mjs` — unminified for inspection
- `dist/index.d.ts`      — TypeScript types
- `dist/index.meta.json` — esbuild metafile (feed it to
  [esbuild analyzer](https://esbuild.github.io/analyze/) for a flame graph)

### Pinning the mermaid version

`scripts/setup-mermaid-src.sh` checks out a pinned mermaid commit (defaults to
`dcb694ddb`, ≈ `mermaid@11.17.2`). `MERMAID_REF` accepts a tag, branch, or SHA:

```bash
MERMAID_REF=mermaid@11.17.2 npm run setup
```

### How the bundling works

1. **Bypass `*Diagram.ts`.** Every `*Diagram.ts` in mermaid source drags its
   renderer in via a top-level import. Our `src/entry-b.ts` sidesteps that
   file entirely and hand-wires the exact `parser` + `db` modules each diagram
   actually needs.
2. **Alias render-only npm deps.** d3, cytoscape, katex, roughjs, marked,
   stylis, khroma, @iconify/utils, @upsetjs/venn.js, dompurify, d3-sankey all
   become tiny proxy stubs. `es-toolkit/compat` is replaced by a ~1 KB
   native-JS shim (mermaid only uses `clone`/`merge`/`memoize`/`isEmpty`
   from it, but the real module pulls in ~35 KB of lodash-es).
3. **Auto-stub render-only internals.** An esbuild plugin reads the real
   source of each targeted module, walks every `export …`, `export * from …`,
   and CommonJS `exports.X =` form (including transitive barrel re-exports),
   and returns a synthetic module whose every named export is bound to a
   no-op Proxy. The Proxy handles `Symbol.toPrimitive` / `Symbol.iterator` /
   `then` so template literals and `for..of` loops over stubbed values don't
   explode. Applied to:
     - `rendering-util/**`, `themes/**`, `svgDrawCommon`, `populateCommonDb`,
       `errors`, and the render-heavy chart builders in xychart /
       quadrant-chart / wardley / state
     - Langium's LSP-only subsystems: `lsp/**`, `validation/**`, `jsdoc.js`,
       the LSP-focused files under `workspace/**` and `references/**`
     - Crucially, `workspace/file-system-provider.js`, `ast-node-locator.js`,
       and all of `serializer/**` are **not** stubbed — they run during
       grammar init; stub them and parsers crash with "No main rule
       available"
   Everything reachable only from these modules — including vscode-language-
   server-protocol and most of vscode-jsonrpc — tree-shakes out for free.
4. **`.jison` files** compile on-the-fly via the same Jison plugin mermaid
   uses in its own build.
5. **`config.schema.yaml?only-defaults=true`** is pre-computed once by
   `scripts/gen-defaults.mts` (which shells into mermaid-src to run its own
   `jsonSchema.ts` with Ajv) and inlined as JSON at bundle time.
6. **`injected.includeLargeFeatures` / `injected.version`** are replaced via
   esbuild `define`, mirroring mermaid's own esbuild config.

### Bundle budget

| Slice                                          | Size    |
| ---------------------------------------------- | ------- |
| Jison grammars (20 diagrams)                   | 343 KB  |
| `@mermaid-js/parser` (15 Langium grammars + AST) | 205 KB  |
| chevrotain (Langium's parser engine)           | 115 KB  |
| Langium runtime (core parse only)              | 97 KB   |
| Mermaid utilities                              | 92 KB   |
| Mermaid `src/*` other                          | 80 KB   |
| Mermaid DBs                                    | 73 KB   |
| js-yaml                                        | 39 KB   |
| vscode-languageserver-types / vscode-uri (types only) | 34 KB |

### Trimming further

- **Want only a subset of diagrams?** Delete the entries you don't need from
  the `DIAGRAMS` array in `src/entry-b.ts` and rebuild.
- The largest remaining slices are the Jison grammars (immutable without
  upstream changes) and chevrotain (Langium's parser engine). `js-yaml`
  (39 KB) is the only realistic target — a minimal YAML subset parser would
  suffice if you only care about flowchart's `@{ shape: … }` node-data and
  frontmatter.

## License

MIT — see [LICENSE](./LICENSE). The produced bundle inlines source from
mermaid-js/mermaid (MIT) and its transitive dependencies.
