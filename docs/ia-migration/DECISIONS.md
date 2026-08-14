# Human decisions (2026-08-10)

Resolutions against [CONFLICTS.md](./CONFLICTS.md) and Batch 6 judgement items.
Frozen IA remains the baseline; amendments below are explicit human overrides.

## Conflicts

| ID | Decision |
|----|----------|
| **C1** | Ignore. `/explore` as section index is fine; no need to restore redirect to browse-lines. |
| **C2** | Prioritise frozen IA (Foundations vs Primitives split). |
| **C3** | Build toward a real geographic product. Add a MapLibre-style placeholder; copy OSM transit geometry from `ssh.ldn` into this repo with a clear **data origin** declaration. |
| **C4** | Keep **developer intent** as the primary organisation. Transport domains stay filters/metadata — not Tube→Status / Bus→Status *trees*. **J6** updates discovery chrome: flat Components list with mode markers (including preferred domain-labelled boards) instead of nested Interfaces sidebar groups. |
| **C5** | Align Explore vs Tools with IA; maximise reuse of existing pages/code; grouping and naming may be overwritten. |
| **C6** | Align: **separate data acquisition from components**. Boards should take **normalised data as props**; site/demo fetch stays outside the reusable component. |

## Batch 6 (was judgement-heavy)

| ID | Decision |
|----|----------|
| **J1 Week-ahead** | Treat like shadcn **Blocks**: a mini-app / composition page outside the component catalog that shows how Interfaces + Primitives combine. Add a **Blocks** top-level group (human amendment to Stage 1 IA). Home week-ahead becomes (or moves toward) a Block. |
| **J2 Arrivals** | **Converge.** One Arrivals interface concept; different data types + re-render behaviour by domain — not two product components. |
| **J3 Boards + data** | **`data` as props** (not fetch-inside as the library API). Fetching belongs in the app / docs / Block. |
| **J4 Line / branch strip** | **Superseded for nav by J6.** Composition still: Line strip / Branch strip as Components entries with cross-links; Geographic vs schematic remain **distinct pages**. No duplicate product trees. |
| **J5 `/components/*` URLs** | **No forever-alias requirement.** Prefer clean `/docs/…` routes; redirects from prior `/interfaces`, `/primitives`, `/foundations`, `/maps`, `/explore`, `/installation` paths. |
| **J6 Nav chrome (2026-08-10)** | After shipping Stage 1 sidebar taxonomy, discovery felt like a second site. **Amend chrome:** persistent header `Docs · Components · Blocks · Tools` everywhere; homepage full-width; docs sidebar = Get started + flat Components (preferred roundel markers, mode colours) + Primitives & Foundations tail; Maps as preferred Components entries; Blocks/Tools own shell (no docs sidebar); Drafts off primary sidebar; Introduction at `/docs` (not `/`); Installation thinned. Composition layers unchanged. |
| **J7 Typography profiles (2026-08-11)** | Keep **Hammersmith One as the public default**. Its single 400 weight must not receive synthetic bold plus tight title tracking. TfL-facing titles use inherited `--tfl-title-weight` / `--tfl-title-tracking` tokens with safe defaults (`400` / `0`); hosts with licensed Johnston or a tested Johnston-compatible face may opt into `600` / `-0.025em`. The docs app enables P22 and its matching metrics only when the server has an Adobe Fonts kit configured. Registry components consume the variables with safe fallbacks and do not detect or load fonts. |
| **J8 Publish chrome (2026-08-14)** | Header becomes `Docs · Components · Blocks · Explorer`. **Docs** lands on Introduction (`/docs`), not Installation. Installation moves below Components in the sidebar and is renamed **Troubleshoot** — there is no all-in-one install; each component is added from its own page. **Tools** leave primary nav (thin / not ready). Tools and Drafts appear in the footer in **development only** and are hidden in production (search, sitemap, robots). Blocks stay in the header. |
| **J9 Hosted Board (2026-08-14)** | New header item **Board** (`/board` builder, `/board/view` chromeless). v1 layout is a wide single-station arrivals panel with Tube status in a narrow side slot. The visitor’s TfL key travels in the **hash fragment** only (never query, never localStorage, never our origin). No key → degraded site-cached status. Interactivity and fit-to-screen are reserved in the URL schema and marked coming soon. |

## Follow-on work implied

| # | Item | Status |
|---|------|--------|
| 1 | IA amendment: document **Blocks** in target architecture | **Done** |
| 2 | Geographic: vendor OSM geometry + ORIGIN; MapLibre placeholder | **Done** (placeholder; full product later) |
| 3 | Migration: Arrivals convergence + `data` props | **Done** |
| 4 | Confirm J4, then Primitives ↔ Schematic linking / moves | **Done** (nav superseded by J6) |
| 5 | Execute mechanical batches 1–5 with rename freedom (J5) | **Done** |
| 6 | J6: persistent header + flat Components docs nav | **Done** |

Remaining product work: Explorer redesign, coming-soon domain boards, TubeMap, deeper geographic product. See [STATUS.md](./STATUS.md).
