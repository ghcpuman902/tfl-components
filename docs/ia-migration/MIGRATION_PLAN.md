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

## Batch 6 — Judgement items (RESOLVED 2026-08-10)

See [DECISIONS.md](./DECISIONS.md). Summary:

| Item | Decision | Implementation note |
|------|----------|---------------------|
| J1 Week-ahead | **Blocks** (shadcn-style composition) | Add Blocks group; move/compose week-ahead as a Block |
| J2 Arrivals | **Converge** one Arrivals interface | Domain differences = data + rerender, not two products |
| J3 Boards | **`data` props**; fetch outside component | Breaking API vs today’s fetch-inside boards |
| J4 Line/branch strip | Open — recommend Primitives primary | Confirm before large moves |
| J5 `/components/*` | **No forever aliases required** | Prefer clean IA URLs |

Do not treat Batch 6 as blocked on review anymore except **J4 confirmation**.

---

## Batch 7 — Drafts population (only if needed)

Move unfinished experiments into `/drafts/...` with status banners. Do not invent drafts.

---

## Suggested execution order (updated)

1. Recorded decisions + geographic data/MapLibre placeholder (C3)  
2. Mechanical batches `1 → 2 → 3 → 4 → 5` (URL renames allowed per J5)  
3. Blocks group + week-ahead as Block (J1)  
4. Arrivals convergence + `data` props (J2, J3, C6) — judgement-heavy code  
5. J4 confirmation then Primitives ↔ Schematic linking  
6. Batch 7 as needed  

---

## Explicit non-goals until scheduled

- Full Explorer information model  
- Full geographic product beyond placeholder + vendored geometry  
- Silently editing frozen principles without recording amendments (Blocks is recorded)
