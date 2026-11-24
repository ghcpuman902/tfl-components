#!/bin/sh
# Verify gate for unattended Claude Code runs; enabled only when BOT_RUN=1.
# Runs typecheck, lint, unit tests and registry checks; exit 2 keeps the session going until they pass.
[ "$BOT_RUN" = "1" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
{ pnpm -s typecheck && pnpm -s lint && pnpm -s test; } 1>&2 || exit 2
