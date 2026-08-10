# Pre-IA-migration baseline

Recorded before scaffolding the frozen Stage 1 information architecture into routes/nav.
Existing docs/showcase pages were not migrated in this pass.

**Date:** 2026-08-10  
**Git HEAD at measurement:** see commit that adds this file (`chore: establish pre-IA-migration baseline`).

## Commands run

| Check | Command | Exit | Notes |
|-------|---------|------|-------|
| Typecheck | `pnpm typecheck` | 0 | pass |
| Lint | `pnpm lint` | 0 | pass |
| Tests | `pnpm test` | 0 | 21 passed, 0 failed |
| Build | `pnpm build` | 0 | Next.js 16.3.0; Cache Components; 17 static paths generated |
| Dev server | not run | — | Project rule: do not start unless requested |
| Dedicated route smoke suite | none found | — | Relied on `pnpm build` route generation |

## Build routes observed (pre-scaffold)

- `/`
- `/installation`
- `/line-badge`
- `/components/[slug]` (incl. tfl-roundel, line-badge, + others)
- `/tools/browse-lines`
- `/tools/route-stations`
- `/tools/typography`

## Pre-existing failures

None recorded. All of typecheck, lint, test, and build exited 0.

Do not silently “fix” later failures by changing this baseline—compare post-scaffold and post-migration results to this table.
