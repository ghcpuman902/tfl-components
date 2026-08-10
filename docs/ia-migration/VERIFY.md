# Post-scaffold verification

Compared to [BASELINE.md](./BASELINE.md) after Stage 1 specs + IA scaffold (no bulk page migration).

| Check | Baseline | After scaffold |
|-------|----------|----------------|
| `pnpm typecheck` | 0 | 0 |
| `pnpm lint` | 0 | 0 |
| `pnpm test` | 0 | 0 (21 pass) |
| `pnpm build` | 0 (17 paths) | 0 (**26** paths) |

## New routes (expected)

`/explore`, `/interfaces`, `/primitives`, `/foundations`, `/maps`, `/maps/geographic`, `/maps/schematic`, `/tools`, `/drafts`

## Existing routes retained

`/`, `/installation`, `/components/[slug]` (all prior items), `/tools/browse-lines`, `/tools/route-stations`, `/tools/typography`, `/line-badge`

## Intentional route behaviour change

- `/explore` no longer redirects to `/tools/browse-lines` (serves Explore placeholder). See [CONFLICTS.md](./CONFLICTS.md) C1.

## Registry

No changes to `public/r/*.json` or registry item names in this pass.
