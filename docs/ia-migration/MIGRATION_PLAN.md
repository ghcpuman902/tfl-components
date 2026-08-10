# Ordered migration plan

**Stop before executing MOVE / RENAME / DELETE / MERGE / SPLIT of existing content.**  
This document is the plan for a later human-approved pass.

Baseline: [BASELINE.md](./BASELINE.md)  
Inventory: [INVENTORY.md](./INVENTORY.md)  
Conflicts: [CONFLICTS.md](./CONFLICTS.md)  
Frozen IA: [../TARGET_ARCHITECTURE.md](../TARGET_ARCHITECTURE.md)

---

## Goals

- Align routes, nav, and docs homes with frozen Stage 1  
- Prefer **MOVE + SMALL EDIT** over rewrite  
- Preserve registry install URLs unless explicitly changed  
- Distinguish mechanical vs judgement-heavy work  
- Keep existing pages working until each batch lands  

---

## Batch 0 — Already done (this pass)

| Change | Type |
|--------|------|
| Frozen Stage 1 specs + agent rule | Spec |
| Nav groups + section placeholders | Scaffold |
| Catalog re-grouping (nav only) | Mechanical |
| Remove `/explore` → browse-lines redirect | Mechanical (intentional break; see C1) |
| Inventory + this plan | Planning |

**Do not re-run Batch 0.**

---

## Batch 1 — Mechanical redirects & dead duplicates

| Action | Detail | Checks |
|--------|--------|--------|
| DELETE | `app/line-badge/page.tsx` if still a duplicate showcase; keep permanent redirect `/line-badge` → `/components/line-badge` | build, open `/line-badge` |
| ADD redirects | Optional aliases: `/explore/lines` → browse-lines (or move in Batch 2) | build |
| VERIFY | All existing `/components/*` and `/tools/*` still render | build route list vs baseline |

**Success:** no duplicate line-badge page; registry untouched; baseline routes still green.

---

## Batch 2 — Explore path alignment (mechanical + mild edit)

| Action | Detail |
|--------|--------|
| MOVE | `app/tools/browse-lines` → e.g. `app/explore/lines` (or keep path, only docs) |
| MOVE | `app/tools/route-stations` → e.g. `app/explore/routes` |
| MOVE | matching `content/tools/*.mdx` |
| UPDATE | catalog hrefs; redirects from old `/tools/...` |
| MILD EDIT | MDX to Explore page anatomy (concepts → retrieve → shape → render next) |

**Judgement:** final URL slugs.  
**Checks:** typecheck, build, manual Explore nav.  
**Success:** Explore section has real content; Tools no longer hosts browse/route.

---

## Batch 3 — Foundations & Interfaces docs homes (mechanical + mild edit)

| Action | Detail |
|--------|--------|
| OPTIONAL MOVE | Content under `/foundations/...` and `/interfaces/...` **or** keep `/components/...` with permanent redirects later |
| MILD EDIT | Align MDX to [page-anatomy.md](../page-anatomy.md) (already partially done for boards) |
| UPDATE | Section indexes to list real pages, reduce “placeholder” framing |

**Registry:** do **not** change `public/r/*.json` names or host paths.  
**Checks:** build; spot-check install commands on docs pages.  
**Success:** Foundations vs Interfaces vs Primitives clear in nav; install still works.

---

## Batch 4 — Primitives ↔ Maps/Schematic cross-links (mild edit; judgement on primary home)

| Action | Detail |
|--------|--------|
| MILD EDIT | Line/branch strip pages: Primitives anatomy + “Also under Maps / Schematic” |
| MILD EDIT | `/maps/schematic` placeholder → real overview linking to strips |
| JUDGEMENT | Whether schematic **primary** nav is Maps or Primitives (recommend: Primitives primary, Maps overview secondary) |

**No SPLIT** of LineStrip into separate registry items in this batch.  
**Checks:** build; links bidirectional.  
**Success:** no duplicate concept trees; geographic placeholder still empty/honest.

---

## Batch 5 — Tools hygiene (mechanical)

| Action | Detail |
|--------|--------|
| KEEP | Typography lab under Tools |
| MILD EDIT | Docs: lab vs StationName primitive |
| VERIFY | Tools index criterion text remains accurate |

---

## Batch 6 — Judgement-heavy (human review required — do not auto-execute)

| Item | Decision needed | Options |
|------|-----------------|---------|
| J1 | Week-ahead on home | Promote Interface + keep on `/`; extract Tool; or **DRAFT** until API stable |
| J2 | Bus arrivals vs live arrivals | Keep two Interfaces with shared Arrivals intent docs; or converge API later |
| J3 | Prefetch-as-props on boards | New `data=` APIs vs document fetch-inside as primary |
| J4 | Line-strip molecular vs atomic docs | Single page vs separate primitive pages for StraightStrip/BranchStrip |
| J5 | `/components/*` URL permanence | Forever aliases vs migrate public docs URLs |

Each needs human approval before code.

---

## Batch 7 — Drafts population (only if needed)

Move unfinished experiments into `/drafts/...` with status banners. Do not invent drafts.

---

## Per-batch verification template

1. `pnpm typecheck`  
2. `pnpm lint`  
3. `pnpm test`  
4. `pnpm build` — compare route list to baseline + expected new/changed routes  
5. Manual: sidebar groups; one Interface; one Foundation; Explore; Maps split; Drafts  
6. Confirm `public/r/*.json` and registry names unchanged unless batch says otherwise  

Classify failures as: pre-existing (baseline) · expected route change · regression.

---

## Explicit non-goals until approved

- Bulk rewrite of board components  
- Changing shadcn registry item names or JSON URLs  
- Implementing geographic map product  
- Building full Explorer information model  
- Editing frozen Stage 1 specs to match folders  

---

## Suggested execution order after approval

`1 → 2 → 3 → 4 → 5`, then schedule `6` as separate RFCs, then `7` as needed.
