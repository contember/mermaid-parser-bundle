#!/usr/bin/env bash
# Clone mermaid-js/mermaid into ./mermaid-src, install its deps, and run the
# Langium codegen. Idempotent: re-run to refresh.
#
# Pin (defaults to the version used when this wrapper was last validated; bump
# together with README's reported numbers):
#   MERMAID_REF=mermaid@11.14.0 scripts/setup-mermaid-src.sh
set -euo pipefail

MERMAID_REPO="${MERMAID_REPO:-https://github.com/mermaid-js/mermaid.git}"
MERMAID_REF="${MERMAID_REF:-mermaid@11.14.0}"
SRC_DIR="$(cd "$(dirname "$0")/.." && pwd)/mermaid-src"

if [ ! -d "$SRC_DIR/.git" ]; then
  echo "→ cloning $MERMAID_REPO@$MERMAID_REF into mermaid-src/"
  git clone --depth 1 --branch "$MERMAID_REF" "$MERMAID_REPO" "$SRC_DIR"
else
  echo "→ mermaid-src exists — fetching $MERMAID_REF"
  git -C "$SRC_DIR" fetch --depth 1 origin "tag" "$MERMAID_REF"
  git -C "$SRC_DIR" checkout --quiet "$MERMAID_REF"
fi

command -v pnpm >/dev/null || {
  echo "error: pnpm is required (https://pnpm.io). Install via corepack: 'corepack enable && corepack prepare pnpm@10 --activate'" >&2
  exit 1
}

echo "→ pnpm install (no scripts — we only need the source tree and runtime deps)"
(cd "$SRC_DIR" && pnpm install --ignore-scripts --frozen-lockfile=false)

echo "→ generating Langium parsers"
(cd "$SRC_DIR" && pnpm --filter @mermaid-js/parser langium:generate)

echo "✓ mermaid-src ready"
