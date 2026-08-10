# Migration inventory

> **Historical.** Captured before bulk MOVE/RENAME. Live routes and nav live in
> [`lib/docs-catalog.ts`](../../lib/docs-catalog.ts); migration outcome in
> [VERIFY.md](./VERIFY.md) and [STATUS.md](./STATUS.md).

Existing docs/showcase/tool surfaces evaluated against frozen Stage 1
([product-architecture.md](../product-architecture.md),
[TARGET_ARCHITECTURE.md](../TARGET_ARCHITECTURE.md)).

**Legend — action:** `KEEP AS-IS` · `MOVE` · `RENAME` · `MOVE + MILD EDIT` · `MERGE` · `SPLIT` · `DELETE` · `DRAFT / INCUBATE`

Scaffold placeholders added in this pass are listed separately at the end (not migration sources).

---

## Start

| Current route | Files | What it does | Destination | Action | Reasoning | Route impact | Import / registry | Care |
|---------------|-------|--------------|-------------|--------|-----------|--------------|-------------------|------|
| `/` | `app/page.tsx`, `content/introduction.mdx`, week-ahead components | Home: week-ahead hero + intro MDX + catalog | Stay home; intro already Start | **MOVE + MILD EDIT** (week-ahead concern) | Intro belongs in Start. Week-ahead is a composed data-aware + schematic demo, not “the introduction” alone | Low for intro | Week-ahead imports strips | Registry N/A for week-ahead |
| `/installation` | `app/installation/page.tsx`, `content/installation.mdx` | Install checklist + commands | Start / Installation | **KEEP AS-IS** (group already Start) | Matches Start | None | None | Registry URLs listed only |

---

## Explore

| Current route | Files | What it does | Destination | Action | Reasoning | Route impact | Import / registry | Care |
|---------------|-------|--------------|-------------|--------|-----------|--------------|-------------------|------|
| `/tools/browse-lines` | `app/tools/browse-lines/page.tsx`, `content/tools/browse-lines.mdx` | Lists lines by mode; links to route stations | Explore (data discovery) | **MOVE + MILD EDIT** | Closer to Explore than Tools (not primarily a tune/debug playground) | Prefer `/explore/lines` or keep path + nav-only; add redirect if moved | Page-local | No registry |
| `/tools/route-stations` | `app/tools/route-stations/page.tsx`, `content/tools/route-stations.mdx` | Stop sequence for one line/direction | Explore | **MOVE + MILD EDIT** | Information-model browsing, not a playground | Prefer `/explore/routes` etc. | Page-local | No registry |
| *(former)* `/explore` → browse-lines redirect | `next.config.ts` | Old alias | `/explore` is now Explore index | **RENAME / redirect removed** | Frozen Explore is first-class; redirect blocked scaffold | **Breaking** for anyone relying on `/explore` → browse-lines | Config only | Document in release notes |

---

## Interfaces (data-aware)

| Current route | Files | What it does | Destination | Action | Reasoning | Route impact | Import / registry | Care |
|---------------|-------|--------------|-------------|--------|-----------|--------------|-------------------|------|
| `/components/tube-status-board` | MDX + demo + `registry/tfl/status/tube-status-board.tsx` | Fetches status; severity board | Interfaces → Status | **MOVE + MILD EDIT** | Data-aware intent = Status; not “Tube & rail” tree | Optional `/interfaces/status` later; keep `/components/...` + redirect | Registry name `tube-status-board` | **Registry JSON / public install URL** |
| `/components/live-arrivals-board` | MDX + demo + registry arrivals | Polling tube/rail arrivals | Interfaces → Arrivals | **MOVE + MILD EDIT** | Arrivals intent; domain is filter | Same pattern | Registry `live-arrivals-board` | Registry |
| `/components/bus-arrivals-board` | MDX + demo + `bus-arrivals.tsx` | Geo/search + bus arrivals | Interfaces → Arrivals (variant) | **MOVE + MILD EDIT** / consider **MERGE** later with live arrivals as domain variant | Same intent as arrivals; bus styling differs | Do not invent Bus → Arrivals top-level | Registry `bus-arrivals-board` | Registry; judgement-heavy merge |
| Homepage week-ahead | `components/tfl/week-ahead/*`, `lib/tfl/week-ahead-*` | Multi-day status on horizontal strips | Interfaces and/or Maps/Schematic + possible Tool controls | **SPLIT** (judgement) or **DRAFT** until API stable | Mixes data-aware status, schematic primitives, and interactive day chrome | Currently only on `/` | Heavy lib deps | Not a registry item today; **human review** |

---

## Primitives

| Current route | Files | What it does | Destination | Action | Reasoning | Route impact | Import / registry | Care |
|---------------|-------|--------------|-------------|--------|-----------|--------------|-------------------|------|
| `/components/line-strip` | MDX + demos + `registry/tfl/diagram/line-strip.tsx` (+ straight-strip*) | Molecular strip + journey helpers | Primitives (geometry); cross-link Maps/Schematic | **MOVE + MILD EDIT** | Primitive/molecular strip; also schematic map concern — **cross-link, do not duplicate trees** | Keep registry path; optional `/primitives/line-strip` | Registry `line-strip` | Registry; judgement: Maps vs Primitives primary home |
| `/components/branch-strip` | MDX + demo + `branch-strip.tsx` | Atomic branched schematic | Primitives; cross-link Maps/Schematic | **MOVE + MILD EDIT** | Atomic primitive | Same | Shares registry `line-strip` | Registry |
| *(no page)* `StraightStrip`, parts, markers, journey-diagram, line-route-diagram | `registry/tfl/diagram/*` | Atoms / related diagrams | Document under Primitives / line-strip page or Maps/Schematic | **KEEP** code; **MOVE + MILD EDIT** docs | Avoid separate product pages per file unless intent differs | N/A | Install via `line-strip` item | Do not split registry casually |
| `StationName` / `station-name-label` | `components/tfl/station-name*.tsx` | Stop/label rendering | Primitives → Stops & labels | **MOVE + MILD EDIT** (docs page missing) | Reusable primitive; typography tool tunes it | New docs page later | Used by strips | Not separate registry item |

---

## Foundations

| Current route | Files | What it does | Destination | Action | Reasoning | Route impact | Import / registry | Care |
|---------------|-------|--------------|-------------|--------|-----------|--------------|-------------------|------|
| `/components/tfl-roundel` | MDX + demo + registry brand | Env-gated roundel + licensing | Foundations | **MOVE + MILD EDIT** | Brand/licensing = Foundations (not Primitives) | Nav already Foundations; route may stay | Registry `tfl-roundel` | Registry + trademark docs |
| `/components/line-badge` | MDX + demo + registry | Colours / badges / bars | Foundations | **MOVE + MILD EDIT** | Shared visual language | Same | Registry `line-badge` | Registry |
| `/line-badge` | `app/line-badge/page.tsx` | Duplicate showcase (also redirect → `/components/line-badge`) | Delete page or keep redirect only | **DELETE** page file; **KEEP** redirect | Duplicate of catalog page | Redirect already permanent | Local demo only | Low |
| National Rail pictogram | `components/tfl/national-rail-pictogram.tsx` | Pictogram atom | Foundations → icons | **KEEP** code; mild docs later | Foundation identity mark | N/A | Used by strips | Low |

---

## Maps

| Current route | Files | What it does | Destination | Action | Reasoning | Route impact | Import / registry | Care |
|---------------|-------|--------------|-------------|--------|-----------|--------------|-------------------|------|
| Geographic | *(none)* | — | `/maps/geographic` placeholder | **KEEP** scaffold | No existing geo product yet | None | None | Do not invent features |
| Schematic | line/branch strips (above) | Topology diagrams | `/maps/schematic` + Primitives cross-links | **MERGE** docs relationship only for now | Same concept, two discovery paths — prefer related links over two full trees | Low until content move | Shared components | Judgement: primary nav home |

---

## Tools

| Current route | Files | What it does | Destination | Action | Reasoning | Route impact | Import / registry | Care |
|---------------|-------|--------------|-------------|--------|-----------|--------------|-------------------|------|
| `/tools/typography` | page + MDX + `station-typography-lab.tsx` | Interactive A–Z label fitting lab | Tools | **KEEP AS-IS** (group) | Meets inspect/tune criterion; component is StationName | None | Lab is app-only | Ensure docs distinguish lab vs primitive |

---

## Drafts

| Current route | Files | What it does | Destination | Action | Reasoning | Route impact | Import / registry | Care |
|---------------|-------|--------------|-------------|--------|-----------|--------------|-------------------|------|
| *(empty)* | — | — | `/drafts` | Scaffold only | No formal drafts yet | None | None | Week-ahead *may* incubate here if not promoted |

---

## Multi-concern flags (do not split casually)

1. **Line strip / Branch strip** — primitive + TfL label recipes (molecular) + schematic map. Prefer one docs home with clear layers; cross-link Maps/Schematic.  
2. **Week-ahead** — status data + schematic strips + interactive chrome. Split only with a clear Interface vs Tool boundary.  
3. **Bus vs live arrivals** — same Arrivals intent; domain styling differs. Convergence is judgement-heavy.  
4. **Browse lines / route stations** — Explore vs leftover “tools” folder path.

---

## Scaffold placeholders (this pass — not sources)

| Route | Role |
|-------|------|
| `/explore` | Explore overview |
| `/interfaces` | Interfaces overview |
| `/primitives` | Primitives overview |
| `/foundations` | Foundations overview |
| `/maps` | Maps overview |
| `/maps/geographic` | Geographic placeholder |
| `/maps/schematic` | Schematic placeholder |
| `/tools` | Tools criterion overview |
| `/drafts` | Drafts incubation overview |

---

## Registry items (extra care on any route/API change)

| Registry name | Public URL pattern |
|---------------|-------------------|
| `tube-status-board` | `/r/tube-status-board.json` |
| `live-arrivals-board` | `/r/live-arrivals-board.json` |
| `bus-arrivals-board` | `/r/bus-arrivals-board.json` |
| `line-strip` | `/r/line-strip.json` |
| `line-badge` | `/r/line-badge.json` |
| `tfl-roundel` | `/r/tfl-roundel.json` |

Install URLs and `registry.json` paths must not change unless the migration plan explicitly says so.
