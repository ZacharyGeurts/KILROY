#!/usr/bin/env bash
# Publish KILROY docs/ → gh-pages (zacharygeurts.github.io/KILROY).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SG_ROOT="$(cd "$ROOT/../.." && pwd)"
VER="$(grep -m1 '^KILROY Field OS' "$ROOT/KILROY_VERSION" 2>/dev/null | awk '{print $3}' || echo 1.0.0)"
REMOTE="${KILROY_PAGES_REMOTE:-https://github.com/ZacharyGeurts/KILROY.git}"

if [[ -x "$SG_ROOT/scripts/publish-component-pages.sh" ]]; then
  exec "$SG_ROOT/scripts/publish-component-pages.sh" \
    --name KILROY \
    --docs "$ROOT/docs" \
    --remote "$REMOTE" \
    --version "$VER"
fi

echo "Missing publish-component-pages.sh — push docs/ and run GitHub Actions pages.yml" >&2
exit 1