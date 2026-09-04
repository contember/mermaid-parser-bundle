#!/usr/bin/env bash
# Clone mermaid-js/mermaid into ./mermaid-src, install its deps, and run the
# Langium codegen. Idempotent: re-run to refresh.
#
# Pin: $MERMAID_REF may be a tag, branch, or commit SHA. Default is a SHA so
# local and CI get byte-identical trees.
set -euo pipefail

MERMAID_REPO="${MERMAID_REPO:-https://github.com/mermaid-js/mermaid.git}"
MERMAID_REF="${MERMAID_REF:-dcb694ddb58dc5ad3502e7e903cac05fd812eac3}"
SRC_DIR="$(cd "$(dirname "$0")/.." && pwd)/mermaid-src"

if [ ! -d "$SRC_DIR/.git" ]; then
  echo "→ cloning $MERMAID_REPO into mermaid-src/ (ref: $MERMAID_REF)"
  git clone --filter=blob:none "$MERMAID_REPO" "$SRC_DIR"
fi

echo "→ fetching + checking out $MERMAID_REF"
git -C "$SRC_DIR" fetch --filter=blob:none origin "$MERMAID_REF" 2>/dev/null || \
  git -C "$SRC_DIR" fetch --filter=blob:none origin
git -C "$SRC_DIR" checkout --quiet --detach "$MERMAID_REF"

command -v pnpm >/dev/null || {
  echo "error: pnpm is required (https://pnpm.io). Install via corepack: 'corepack enable && corepack prepare pnpm@10 --activate'" >&2
  exit 1
}

echo "→ pnpm install (no scripts — we only need the source tree and runtime deps)"
(cd "$SRC_DIR" && pnpm install --ignore-scripts --frozen-lockfile=false)

echo "→ generating Langium parsers"
(cd "$SRC_DIR" && pnpm --filter @mermaid-js/parser langium:generate)

echo "✓ mermaid-src ready"
