# Human decisions (2026-08-10)

Resolutions against [CONFLICTS.md](./CONFLICTS.md) and Batch 6 judgement items.
Frozen IA remains the baseline; amendments below are explicit human overrides.

## Conflicts

| ID | Decision |
|----|----------|
| **C1** | Ignore. `/explore` as section index is fine; no need to restore redirect to browse-lines. |
| **C2** | Prioritise frozen IA (Foundations vs Primitives split). |
| **C3** | Build toward a real geographic product. Add a MapLibre-style placeholder; copy OSM transit geometry from `ssh.ldn` into this repo with a clear **data origin** declaration. |
| **C4** | Keep **Interfaces** (developer intent) as primary nav. Transport domains stay filters/metadata — not Tube→Status / Bus→Status trees. |
| **C5** | Align Explore vs Tools with IA; maximise reuse of existing pages/code; grouping and naming may be overwritten. |
| **C6** | Align: **separate data acquisition from components**. Boards should take **normalised data as props**; site/demo fetch stays outside the reusable component. |

## Batch 6 (was judgement-heavy)

| ID | Decision |
|----|----------|
| **J1 Week-ahead** | Treat like shadcn **Blocks**: a mini-app / composition page outside the component catalog that shows how Interfaces + Primitives combine. Add a **Blocks** top-level group (human amendment to Stage 1 IA). Home week-ahead becomes (or moves toward) a Block. |
| **J2 Arrivals** | **Converge.** One Arrivals interface concept; different data types + re-render behaviour by domain — not two product components. |
| **J3 Boards + data** | **`data` as props** (not fetch-inside as the library API). Fetching belongs in the app / docs / Block. |
| **J4 Line / branch strip** | **Confirmed:** Primitives as primary docs home; Maps → Schematic stays a separate nav group with cross-links back to the primitives (no duplicate product trees). |
| **J5 `/components/*` URLs** | **No backward-compat requirement** (not published yet). Prefer clean IA routes; redirects optional, not forever aliases. |

## Follow-on work implied

| # | Item | Status |
|---|------|--------|
| 1 | IA amendment: document **Blocks** in target architecture | **Done** |
| 2 | Geographic: vendor OSM geometry + ORIGIN; MapLibre placeholder | **Done** (placeholder; full product later) |
| 3 | Migration: Arrivals convergence + `data` props | **Done** |
| 4 | Confirm J4, then Primitives ↔ Schematic linking / moves | **Done** |
| 5 | Execute mechanical batches 1–5 with rename freedom (J5) | **Done** |

Remaining product work (Coming soon on section hubs): Explorer depth, StationName docs page, journeys / service Interfaces, deeper geographic product. See [STATUS.md](./STATUS.md).
