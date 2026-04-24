/**
 * Result of a successful parse.
 *
 * The precise shape of `db` depends on the diagram type — every Jison-/
 * Langium-based diagram in mermaid exposes its own DB class. This bundle
 * does not re-export those types (keeping the public API narrow); cast or
 * introspect via `type` when you need type-specific fields.
 */
export interface ParseResult {
  /** The diagram id mermaid detected (e.g. `flowchart-v2`, `sequence`, `classDiagram`). */
  type: string;
  /** The populated diagram database — contents depend on `type`. */
  db: unknown;
}

/**
 * Parse a mermaid diagram source.
 *
 * Detects the diagram type from the first meaningful line, loads the matching
 * parser on demand, and returns `{ type, db }`. Throws `MermaidParseError` on
 * invalid syntax or an unknown diagram type.
 *
 * @example
 * ```ts
 * import { parse } from 'mermaid-parser-bundle';
 *
 * const { type, db } = await parse('flowchart TD\n  A --> B');
 * ```
 */
export function parse(text: string): Promise<ParseResult>;

/** Thrown for both detection failures and grammar errors. */
export class MermaidParseError extends Error {}

declare const _default: { parse: typeof parse };
export default _default;
