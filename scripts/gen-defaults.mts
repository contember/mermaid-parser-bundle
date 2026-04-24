// Build-time helper: produce mermaid's config defaults JSON by reusing
// mermaid's own jsonSchema.ts. Runs inside mermaid-src so its deps resolve.

import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MERMAID_ROOT = resolve(__dirname, '../mermaid-src');
const OUT_PATH = resolve(__dirname, '../generated/defaults.json');

const runnerScript = `
(async () => {
  const { readFile } = await import('node:fs/promises');
  const { loadSchema, getDefaults } = await import('./.build/jsonSchema.ts');
  const source = await readFile('packages/mermaid/src/schemas/config.schema.yaml', 'utf8');
  const schema = loadSchema(source, 'packages/mermaid/src/schemas/config.schema.yaml');
  const out = getDefaults(schema);
  const m = out.match(/export default\\s+(\\{[\\s\\S]*\\});?\\s*$/);
  if (!m) throw new Error('Bad getDefaults output');
  process.stdout.write(m[1]);
})();
`;

const res = spawnSync('npx', ['tsx', '-e', runnerScript], {
  cwd: MERMAID_ROOT,
  encoding: 'utf8',
});
if (res.status !== 0) {
  console.error('tsx failed:', res.stderr);
  process.exit(1);
}

// eslint-disable-next-line no-eval
const obj = eval('(' + res.stdout + ')');
await mkdir(dirname(OUT_PATH), { recursive: true });
await writeFile(OUT_PATH, JSON.stringify(obj, null, 2));
console.log(`defaults → ${OUT_PATH} (${JSON.stringify(obj).length} bytes)`);
