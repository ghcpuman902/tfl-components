#!/bin/sh
# Verify gate for unattended Claude Code runs; enabled only when BOT_RUN=1.
# Runs typecheck, lint, unit tests and registry checks; exit 2 keeps the session going until they pass.
[ "$BOT_RUN" = "1" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
# Show the complaints list so every bot run sees it (never fails the hook).
if [ -f _agent/COMPLAINTS.md ]; then
  { echo "=== _agent/COMPLAINTS.md: check every line still holds before finishing ==="; cat _agent/COMPLAINTS.md; echo "=== end COMPLAINTS ==="; } 1>&2
else
  echo "note: _agent/COMPLAINTS.md not found; skipping complaints print" 1>&2
fi
{ pnpm -s typecheck && pnpm -s lint && pnpm -s test; } 1>&2 || exit 2
