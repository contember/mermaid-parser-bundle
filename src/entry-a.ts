// Baseline: re-export only the parse function from mermaid.
// Tree-shaking should (in theory) drop render-only code. In practice the
// rendering imports in mermaidAPI.ts (d3, stylis, DOMPurify, themes, error
// renderer) have side effects or are hoisted eagerly, so this tells us the
// lower bound of a naive approach.
import mermaid from 'mermaid';

export const parse = mermaid.parse.bind(mermaid);
export default { parse };
