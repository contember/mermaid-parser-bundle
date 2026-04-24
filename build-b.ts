// Custom parse-only bundle builder for mermaid.
//
// Pipeline:
//   1. Resolve `@mermaid/src/*` → mermaid-src/packages/mermaid/src/*
//   2. Alias render-only npm deps to empty/no-op stubs
//   3. Substitute render-heavy mermaid-internal modules (shapes, svgDrawCommon,
//      themes) with local stubs
//   4. Compile .jison files at load time via mermaid's own jison transformer
//   5. Load config.schema.yaml?only-defaults=true via mermaid's json-schema plugin
//   6. Bundle a single ESM module

import { build, type Plugin } from 'esbuild';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import jison from 'jison';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MERMAID_ROOT = resolve(__dirname, 'mermaid-src');
const MERMAID_SRC = resolve(MERMAID_ROOT, 'packages/mermaid/src');
if (!existsSync(MERMAID_ROOT)) {
  console.error('mermaid-src/ is missing. Run: npm run setup');
  process.exit(1);
}

// ---- jison loader (copied verbatim from mermaid's .esbuild/jisonPlugin.ts) ----
const jisonPlugin: Plugin = {
  name: 'jison',
  setup(b) {
    b.onLoad({ filter: /\.jison$/ }, async (args) => {
      const source = await readFile(args.path, 'utf8');
      // @ts-ignore Jison is not typed
      const parser = new jison.Generator(source, { moduleType: 'js', 'token-stack': true });
      const contents =
        parser.generate({ moduleMain: '() => {}' }) +
        '\nparser.parser = parser;\nexport { parser };\nexport default parser;\n';
      return { contents, loader: 'js' };
    });
  },
};

// ---- JSON-schema loader for `config.schema.yaml?only-defaults=true` ----
// The real defaults are produced offline by scripts/gen-defaults.mts (which
// invokes mermaid's own jsonSchema.ts with Ajv). We embed that JSON here.
const DEFAULTS_JSON_PATH = resolve(__dirname, 'generated/defaults.json');
const jsonSchemaPlugin: Plugin = {
  name: 'json-schema',
  setup(b) {
    b.onLoad({ filter: /config\.schema\.yaml$/ }, async () => {
      const json = await readFile(DEFAULTS_JSON_PATH, 'utf8');
      return { contents: `export default ${json};`, loader: 'js' };
    });
  },
};

// ---- Stubs ----
const STUB_EMPTY = resolve(__dirname, 'src/stubs/empty.ts');
const STUB_D3 = resolve(__dirname, 'src/stubs/d3.ts');
const STUB_SHAPES = resolve(__dirname, 'src/stubs/shapes.ts');
const STUB_SVG_DRAW_COMMON = resolve(__dirname, 'src/stubs/svgDrawCommon.ts');
const STUB_THEMES = resolve(__dirname, 'src/stubs/themes.ts');
const STUB_DOMPURIFY = resolve(__dirname, 'src/stubs/dompurify.ts');
const STUB_ES_TOOLKIT = resolve(__dirname, 'src/stubs/es-toolkit-compat.ts');

// npm packages that are render-only collapse to a proxy-based empty module.
const alias: Record<string, string> = {
  // Parser package is in source-only state in the cloned monorepo (no dist/),
  // so route its import to its TS source.
  '@mermaid-js/parser': resolve(MERMAID_ROOT, 'packages/parser/src/index.ts'),
  d3: STUB_D3,
  'd3-sankey': STUB_EMPTY,
  'd3-sankey-circular': STUB_EMPTY,
  cytoscape: STUB_EMPTY,
  'cytoscape-cose-bilkent': STUB_EMPTY,
  'cytoscape-fcose': STUB_EMPTY,
  'cose-base': STUB_EMPTY,
  'layout-base': STUB_EMPTY,
  katex: STUB_EMPTY,
  roughjs: STUB_EMPTY,
  'roughjs/bin/rough.js': STUB_EMPTY,
  marked: STUB_EMPTY,
  stylis: STUB_EMPTY,
  khroma: STUB_EMPTY,
  '@iconify/utils': STUB_EMPTY,
  '@iconify/utils/lib/icon': STUB_EMPTY,
  '@upsetjs/venn.js': STUB_EMPTY,
  // DOMPurify is a parse-surface dep (some Db modules call .sanitize() /
  // .addHook()), but a parser-only bundle never assembles SVG, so a trivial
  // pass-through stub is both safe and saves ~22 KB.
  dompurify: STUB_DOMPURIFY,
  // Mermaid uses es-toolkit's lodash-compat entry for just `clone`, `merge`,
  // `memoize`, `isEmpty`. Real module transitively bundles ~35 KB of lodash-es;
  // swap for tiny native equivalents.
  'es-toolkit/compat': STUB_ES_TOOLKIT,
};
// Langium transitively pulls in vscode-jsonrpc (events/cancellation tokens) and
// vscode-languageserver-protocol / -textdocument (LSP transport + document
// model). Only the type shells are used at parse time — the machinery runs
// only when LSP services are live. Autostubbed instead of hard-aliased so
// `export * from 'vscode-jsonrpc/...'` re-exports in langium preserve their
// named-export surface.

// ---- Auto-stub plugin ----
// For a module we want to erase, we load the real source, scrape every
// exported-symbol name (transitively following `export * from './x'` barrel
// re-exports), and return a synthetic module that binds each name to a no-op
// proxy. That satisfies `import { foo }` static checks while contributing
// near-zero bytes.
const AUTOSTUB_NS = 'autostub';
const collectExportedNames = async (
  realPath: string,
  visited: Set<string>
): Promise<{ names: Set<string>; hasDefault: boolean }> => {
  if (visited.has(realPath)) return { names: new Set(), hasDefault: false };
  visited.add(realPath);
  let src: string;
  try {
    src = await readFile(realPath, 'utf8');
  } catch {
    return { names: new Set(), hasDefault: false };
  }
  const names = new Set<string>();
  for (const m of src.matchAll(/export\s+(?:const|let|var|function\*?|class|async\s+function\*?)\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(m[1]);
  }
  for (const m of src.matchAll(/export\s*\{([^}]+)\}(?!\s*from)/g)) {
    for (const part of m[1].split(',')) {
      const t = part.trim();
      if (!t) continue;
      const as = t.match(/(?:\w+)\s+as\s+([A-Za-z_$][\w$]*)/);
      if (as) names.add(as[1]);
      else names.add(t);
    }
  }
  for (const m of src.matchAll(/export\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    const sub = resolveRelative(realPath, m[2]);
    if (!sub) continue;
    const nested = await collectExportedNames(sub, visited);
    for (const part of m[1].split(',')) {
      const t = part.trim();
      if (!t) continue;
      const as = t.match(/(?:\w+)\s+as\s+([A-Za-z_$][\w$]*)/);
      names.add(as ? as[1] : t);
    }
    for (const n of nested.names) names.add(n);
  }
  for (const m of src.matchAll(/export\s*\*\s*from\s*['"]([^'"]+)['"]/g)) {
    const sub = resolveRelative(realPath, m[1]);
    if (!sub) continue;
    const nested = await collectExportedNames(sub, visited);
    for (const n of nested.names) names.add(n);
  }
  // CommonJS: `exports.Foo = ...`, `exports.Foo = exports.Bar = void 0;`,
  // `Object.defineProperty(exports, "Foo", ...)`.
  const RESERVED = new Set(['default', 'let', 'const', 'var', 'function', 'class', 'return', 'if']);
  let hasCjsDefault = false;
  for (const m of src.matchAll(/\bexports\.([A-Za-z_$][\w$]*)\s*=/g)) {
    if (m[1] === 'default') { hasCjsDefault = true; continue; }
    if (RESERVED.has(m[1])) continue;
    names.add(m[1]);
  }
  for (const m of src.matchAll(/Object\.defineProperty\(exports,\s*["']([A-Za-z_$][\w$]*)["']/g)) {
    if (m[1] === 'default') { hasCjsDefault = true; continue; }
    if (RESERVED.has(m[1])) continue;
    names.add(m[1]);
  }
  const hasDefault =
    hasCjsDefault ||
    /export\s+default\b/.test(src) ||
    /\bmodule\.exports\s*=/.test(src);
  return { names, hasDefault };
};

const resolveRelative = (fromFile: string, spec: string): string | undefined => {
  if (!spec.startsWith('.')) return undefined;
  const base = resolve(dirname(fromFile), spec);
  const candidates = [
    base,
    base + '.js',
    base + '.ts',
    base + '/index.js',
    base + '/index.ts',
  ];
  return candidates.find((c) => existsSync(c));
};

const autostubbedModule = async (realPath: string): Promise<string> => {
  const { names, hasDefault } = await collectExportedNames(realPath, new Set());
  // Proxy handles the cases code typically hits: callable, constructible,
  // member access chains, and primitive coercion (so template literals and
  // `String(x)` don't blow up). Symbol iteration returns an empty iterator so
  // `for..of` over a stubbed value is a no-op instead of a throw.
  const lines = [
    `function _fn() { return proxy; }`,
    `const h = {`,
    `  get(_, p) {`,
    `    if (p === Symbol.toPrimitive) return () => '';`,
    `    if (p === 'toString' || p === 'valueOf') return () => '';`,
    `    if (p === Symbol.iterator) return function*() {};`,
    `    if (p === Symbol.asyncIterator) return function*() {};`,
    `    if (p === 'then') return undefined;`,
    `    return proxy;`,
    `  },`,
    `  apply: () => proxy,`,
    `  construct: () => proxy,`,
    `  has: () => true,`,
    `};`,
    `const proxy = new Proxy(_fn, h);`,
  ];
  for (const n of names) lines.push(`export const ${n} = proxy;`);
  if (hasDefault) lines.push(`export default proxy;`);
  return lines.join('\n');
};

// Internal mermaid modules that we force-stub (render-only).
const STUB_FILTERS: RegExp[] = [
  /\/rendering-util\//, // createText, getDiagramElement, setupViewPortForSVG, render, shapes/*
  /\/diagrams\/common\/svgDrawCommon(\.[jt]s)?$/,
  /\/diagrams\/common\/populateCommonDb(\.[jt]s)?$/,
  /\/themes\/?[^/]*(\.[jt]s)?$/, // themes/index, themes/theme-*
  /\/errors(\.[jt]s)?$/,
  // Render-heavy builders pulled in by xychart and quadrant-chart db chains:
  /\/diagrams\/xychart\/chartBuilder\//,
  /\/diagrams\/quadrant-chart\/quadrantBuilder(\.[jt]s)?$/,
  /\/diagrams\/wardley\/wardleyBuilder(\.[jt]s)?$/,
  /\/diagrams\/state\/dataFetcher(\.[jt]s)?$/,
  // Langium subsystems that only run for LSP features (workspace mgmt,
  // validation, serialization, jsdoc extraction, LSP wiring). We keep
  // `workspace/file-system-provider.js` because `EmptyFileSystem` (the token
  // every Langium grammar init passes to `inject`) is defined there, and we
  // keep `references/` because DI wires them into the grammar services at
  // construction time.
  /langium\/lib\/lsp\//,
  /langium\/lib\/validation\//,
  /langium\/lib\/documentation\/jsdoc\.js$/,
  /langium\/lib\/workspace\/(document-builder|profiler|documents|workspace-manager|index-manager|workspace-lock|configuration|ast-descriptions)\.js$/,
  /langium\/lib\/references\/(linker|scope|scope-computation|scope-provider|references)\.js$/,
];

// Don't autostub barrel `/index.js` / `/index.ts` files — let them re-export
// from leaves that will each be stubbed individually, so downstream named
// imports remain satisfiable.
const isBarrel = (p: string) => /\/index\.(t|j)s$/.test(p) || /\/main\.(t|j)s$/.test(p);

const mermaidPathResolver: Plugin = {
  name: 'mermaid-paths',
  setup(b) {
    b.onResolve({ filter: /^@mermaid\/src\// }, (args) => {
      const rel = args.path.replace(/^@mermaid\/src\//, '');
      return { path: resolveMermaidSrc(rel) };
    });
    b.onResolve({ filter: /rendering-util\/rendering-elements\/shapes(\.(t|j)s)?$/ }, () => ({
      path: STUB_SHAPES,
    }));
    b.onResolve({ filter: /diagrams\/common\/svgDrawCommon(\.(t|j)s)?$/ }, () => ({
      path: STUB_SVG_DRAW_COMMON,
    }));
    b.onResolve({ filter: /\/themes(\/[^/]+)?(\.(t|j)s)?$/ }, () => ({ path: STUB_THEMES }));

    // Autostub for render-only internal modules.
    b.onResolve({ filter: /.*/ }, (args) => {
      if (args.kind === 'entry-point') return null;
      let abs = args.path;
      if (!abs.startsWith('/')) {
        if (!args.path.startsWith('.')) {
          // Node-package-style import ("vscode-jsonrpc/lib/…"); walk nodePaths.
          for (const np of [args.resolveDir, ...(b.initialOptions.nodePaths ?? [])]) {
            const guess = resolve(np, args.path);
            if (existsSync(guess)) {
              abs = guess;
              break;
            }
            const withJs = guess + '.js';
            if (existsSync(withJs)) {
              abs = withJs;
              break;
            }
          }
        } else {
          abs = resolve(args.resolveDir, abs);
        }
      }
      const base = abs.replace(/\.(t|j)s$/, '');
      const candidates = [abs, base + '.ts', base + '.js', base + '/index.ts', base + '/index.js'];
      const found = candidates.find((c) => existsSync(c));
      if (!found) return null;
      if (!STUB_FILTERS.some((re) => re.test(found))) return null;
      if (isBarrel(found)) return null; // let barrels flow normally
      return { path: found, namespace: AUTOSTUB_NS };
    });
    b.onLoad({ filter: /.*/, namespace: AUTOSTUB_NS }, async (args) => {
      const contents = await autostubbedModule(args.path);
      return { contents, loader: 'js' };
    });
  },
};

function resolveMermaidSrc(rel: string): string {
  // Strip trailing query (e.g. ?only-defaults=true) while routing the file,
  // esbuild will attach args.suffix so jsonSchemaPlugin can still read it.
  const [clean] = rel.split('?');
  const base = clean.replace(/\.js$/, '');
  const candidates = [
    clean, // preserve .jison, .yaml, etc.
    base + '.ts',
    base + '.js',
    base + '/index.ts',
    base + '/index.js',
  ];
  for (const c of candidates) {
    const p = join(MERMAID_SRC, c);
    if (existsSync(p)) return p + (rel.includes('?') ? rel.substring(rel.indexOf('?')) : '');
  }
  return join(MERMAID_SRC, rel);
}

async function main() {
  await mkdir('dist', { recursive: true });

  const commonOptions = {
    entryPoints: [resolve(__dirname, 'src/entry-b.ts')],
    bundle: true,
    format: 'esm' as const,
    platform: 'browser' as const,
    mainFields: ['module', 'main'],
    conditions: ['import', 'module', 'browser', 'default'],
    treeShaking: true,
    alias,
    nodePaths: [
      resolve(MERMAID_ROOT, 'node_modules'),
      resolve(MERMAID_ROOT, 'packages/mermaid/node_modules'),
      resolve(MERMAID_ROOT, 'packages/parser/node_modules'),
    ],
    // mermaid source references a global `injected` baked in at build time
    // (see packages/mermaid/src/type.d.ts). We mirror mermaid's own esbuild
    // defines so code paths behind `injected.includeLargeFeatures` / .version
    // compile cleanly.
    define: {
      'injected.includeLargeFeatures': 'true',
      'injected.version': JSON.stringify('parser-only'),
      'import.meta.vitest': 'undefined',
    },
    plugins: [mermaidPathResolver, jisonPlugin, jsonSchemaPlugin],
    loader: { '.ts': 'ts' as const, '.js': 'js' as const },
    logLevel: 'warning' as const,
    target: 'es2022',
  };

  const minRes = await build({
    ...commonOptions,
    outfile: 'dist/index.mjs',
    minify: true,
    metafile: true,
    sourcemap: false,
  });
  await writeFile('dist/index.meta.json', JSON.stringify(minRes.metafile));

  const unminRes = await build({
    ...commonOptions,
    outfile: 'dist/index.unmin.mjs',
    minify: false,
    metafile: true,
    sourcemap: false,
  });
  await writeFile('dist/index.unmin.meta.json', JSON.stringify(unminRes.metafile));

  // Ship types alongside the bundle. The source of truth is src/index.d.ts;
  // we just copy it next to the .mjs so downstream TypeScript finds it.
  const types = await readFile(resolve(__dirname, 'src/index.d.ts'), 'utf8');
  await writeFile('dist/index.d.ts', types);

  const s1 = await stat('dist/index.mjs');
  const s2 = await stat('dist/index.unmin.mjs');
  console.log(`\ndist/index.mjs       ${(s1.size / 1024).toFixed(1)} KB (minified)`);
  console.log(`dist/index.unmin.mjs ${(s2.size / 1024).toFixed(1)} KB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
