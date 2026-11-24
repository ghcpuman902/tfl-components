#!/bin/sh
# Rebuilds the registry and the colour tokens, then fails if anything the
# build writes differs from what is committed.
# Fix a failure with: pnpm registry:build, then commit the changed files.
set -e
cd "$(dirname "$0")/.."
pnpm -s registry:build >/dev/null
OUTPUTS="public/r app/tfl-colours.css registry.json"
status=0
git diff --exit-code --stat -- $OUTPUTS || status=1
untracked=$(git ls-files --others --exclude-standard -- $OUTPUTS)
if [ -n "$untracked" ]; then
  echo "Untracked registry output:"
  echo "$untracked"
  status=1
fi
if [ "$status" -ne 0 ]; then
  echo "Registry output is stale: run pnpm registry:build and commit the result." >&2
  exit 1
fi
echo "Registry output matches the sources (public/r, app/tfl-colours.css, registry.json)."
