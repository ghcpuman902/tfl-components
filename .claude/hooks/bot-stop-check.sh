#!/bin/sh
# Bot verify gate (Coefficient, 2026-11-16). Runs only for bot-launched runs.
# Check: typecheck, lint, unit tests and registry checks (~40s).
[ "$BOT_RUN" = "1" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
{ pnpm -s typecheck && pnpm -s lint && pnpm -s test; } 1>&2 || exit 2
