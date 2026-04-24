#!/usr/bin/env bash
# Compare what `npm install <pkg>` adds to a fresh project:
#   mermaid            — the full package (renderer + parsers + deps)
#   mermaid-parser-bundle — this zero-dep bundle
#
# Reports installed node_modules size and transitive dependency count.
set -euo pipefail

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

measure() {
  local pkg=$1
  local dir="$tmp/$pkg"
  mkdir -p "$dir"
  (cd "$dir" && npm init -y >/dev/null 2>&1)
  (cd "$dir" && npm install --silent --no-audit --no-fund "$pkg" 2>&1 | tail -1 || true)
  local bytes
  bytes=$(du -sb "$dir/node_modules" | cut -f1)
  local pkgcount
  pkgcount=$(find "$dir/node_modules" -maxdepth 2 -name package.json 2>/dev/null | wc -l)
  printf "%-25s %7.1f MB  %3d packages\n" "$pkg" "$(echo "scale=1; $bytes/1048576" | bc)" "$pkgcount"
}

echo "measuring what 'npm install <pkg>' lands on disk..."
measure mermaid
measure mermaid-parser-bundle
