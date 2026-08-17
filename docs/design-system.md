# Design system

This starter uses **Tailwind CSS 4** and **shadcn/ui** (base-nova preset).

## Tokens

Prefer semantic utilities over raw colors:

| Use | Avoid |
|-----|-------|
| `bg-background` | `bg-[#fff]` |
| `text-foreground` | `text-zinc-900` (unless intentional) |
| `text-muted-foreground` | low-contrast arbitrary grays |
| `border-border` | `border-gray-200` |
| `bg-primary` / `text-primary-foreground` | brand hex without token |

Theme variables are defined in `app/globals.css`. Dark mode is class-based via `next-themes`.

## Typography

- Default body text uses **Hammersmith One** (Google Fonts) via `next/font` — a Johnston-like stand-in for demos. It is **not** Johnston.
- **Do not** download or redistribute TfL’s Johnston typeface. Prefer your own product font. To licence Johnston, use [TfL font requests](https://tfl.gov.uk/info-for/business-and-advertisers/font-requests?intcmp=5840). Alternatives: [Hammersmith One](https://fonts.google.com/specimen/Hammersmith+One) or [P22 Underground](https://fonts.adobe.com/fonts/p22-underground) (Adobe Fonts).
- Use `text-sm` / `text-xs` for secondary metadata, not as the default for main content.

### Title profiles

Hammersmith One has only a 400 cut. It is the public default, so titles default to weight `400`, normal tracking, and no synthetic bold. Licensed Johnston and tested Johnston-compatible faces can opt into weight `600` and `-0.025em` tracking.

Use the semantic title metrics instead of pairing `font-bold` with `tracking-tight`:

```css
--tfl-title-weight: 400;
--tfl-title-tracking: 0;
```

Installable components read those inherited variables with the same safe fallbacks. They do not load a font or infer which font the host uses. A host that supplies compatible font metrics can override both variables on any wrapper; P22 Underground is an alternative, not an authentic TfL typeface.

### Station label breaks (for agents and consumers)

Use `StationName` / `formatStationLabel` — never ad-hoc `<br>` or CSS wrapping for diagram names.

| API | Role |
|-----|------|
| `StationName` | Client label with find/copy/aria; pass `lines` or `layout="auto"`. Any strip that renders it must be `"use client"` (Cache Components). |
| `formatStationLabel` | Pure scorer: prefer 1 line → balanced 2-line word split → optional abbr → scale ≥ 0.75 |
| `STATION_ABBREVIATIONS` | Conservative map (`Street`→`St`, `Road`→`Rd`, …) from `station-abbreviations` — only when allowed |
| `/tools/typography` | A–Z lab to inspect every Tube / Elizabeth / DLR / Overground / Tram name |
| `/components/branch-strip` | Northern schematics — separate horizontal/vertical `lane × pos` layouts |

Rules: break only between words; prefer the full name; never split a token; optional abbreviations only to fit; scale-down is last resort (`STATION_LABEL_MIN_SCALE = 0.75`).

### Findable identity text

When visible paint differs from the canonical name (abbreviation, `<br>`-split lines), wrap it in `FindableText` (`components/tfl/findable-text.tsx`) so Cmd/Ctrl+F and copy still resolve the full name — `StationName` already composes it. Plain CSS truncation doesn't need this; see [`.cursor/rules/findable-identity-text.mdc`](../.cursor/rules/findable-identity-text.mdc) for the full rule and anti-patterns.

### Arrivals board rhythm

Shared rail/bus presentation: `registry/tfl/arrivals/arrivals-board-view.tsx`. Domain boards: `rail-arrivals-board.tsx`, `bus-arrivals-board.tsx`.  
Agent rule (globs the board + demos): [`.cursor/rules/arrivals-board-layout.mdc`](../.cursor/rules/arrivals-board-layout.mdc).

**Baseline grid**

| Token | Value | Role |
|-------|--------|------|
| `--arrivals-unit` | `0.5rem` | Smallest vertical step |
| `--arrivals-row` | `6 × unit` (`3rem` / 48px) | One tile: stop title, line header, bound label, or arrival row |

Every tile uses a locked box (`box-border`, fixed `min`/`max`/`height` = `--arrivals-row`, `overflow-hidden`, `shrink-0`). Content may clip; it must **never** grow the tile.

**Gaps**

- Title → first line group: **none** — same continuous tile stack as line sections (no `space-y-2` / `mt-2` on the board root).
- Between line sections: **none** — arrival rows and the next line header form one continuous tile stack (no `gap-y` / `space-y` between `<section>`s).
- Do not reserve a double-height title band “in case the name wraps”.

**Borders and bars (must not contribute extra height)**

| Element | How | Why |
|---------|-----|-----|
| Row / bound hairlines | Absolute `after:` at the bottom of the tile | Separators stay out of flow |
| Solid line/route brand bar | `border-b-4` + `box-border` on the line-header tile | Bar is painted **inside** the 48px box |
| Striped Overground / Elizabeth | Absolute `LineColorBar` pinned to the tile bottom | Dual rails cannot be a single border |
| Shared-track merged header | Foreground `LineName` + absolute equal-width stripes (one per line) | Not a single `--line-color` title; bar must not grow the tile |

```tsx
// ✅ Solid brand bar inside the tile
<header className="box-border h-[var(--arrivals-row)] border-b-4 …"
  style={{ borderBottomColor: lineColor }} />

// ✅ Hairline separator — absolute, zero layout cost
<li className="relative h-[var(--arrivals-row)] after:absolute after:inset-x-0 after:bottom-0 after:h-px …" />

// ❌ In-flow bar under the name — shifts baselines vs the other board
<header className="flex flex-col h-[var(--arrivals-row)]">
  <h3>Victoria</h3>
  <div className="mt-1 h-1 bg-[line]" />
</header>
```

**Copy and chips**

- Stop title = human name only (+ optional bus stop letter). Never show NaPTAN / stop-point ids.
- Fit stop and destination names with `StationName` (`layout="auto"`, abbr then scale). Destination rows stay one tile tall.
- Rail: [`PlatformChip`](/docs/platform-chip) before destination. Mixed-line sections add a 3-letter `LineBadge` or `LineBadgeGroup variant="codes"` before the destination — both use the same fixed `w-[5ch]` box as the bus route chip. Bus: [`BusNumberChip`](/docs/bus-number-chip) per row; stop letter on the header only.
- Both chips keep normal casing. Center with uppercase/cap text-box trim: `text-box: trim-both cap alphabetic` (`CHIP_CAP_TEXT_BOX_CLASS`) — not x-height (`ex`) trim. Do not force `uppercase` paint.
- Line titles / chips: [`LineName`](/docs/line-title) steps **full → middle (H&C / W&C) → 3-letter code** via `@container/line-name` queries for board headers. Prefer abbreviation before a 2-line wrap; short codes are last resort. Curated tiers live in `lib/tfl/line-names.ts`. Filled chips are [`Line chip`](/docs/line-chip) (`LineBadge` / `LineBadgeGroup` with a vertical colour rail for shared-track groups).

**Pagination**

Rail: a positive `pageSize` is a fixed subgroup height. Every bound occupies that many arrival tiles, including a short only page and an empty seeded group. Bus: the same lock applies once `pageCount > 1`; an unpaged short list keeps its natural height. `pageSize <= 0` is always natural height.

A short page with arrivals uses the last spare tile for **No more arrivals** (narrow step: **No more**) and quiet dashes in tiles between. Zero arrivals are **No information** plus dashes — not an end-of-list state. Exact multiples stay full. Do not add a page only for the message.

Pager on a shared tile (rail bound label, grouped bus route header) hides until hover or focus-within. A dedicated flat-bus control tile stays visible. Hide the pager when `pageCount <= 1`.

**Side-by-side boards**

Share the same title height and row unit so the first line headers align. There is no title→body gap. Mid-board drift from extra rail bound rows (Northbound / Southbound) is **content structure**, not a chrome-height bug.

**Responsive arrangements (CSS-first)**

Boards stay single-column by default. Consumers arrange generated levels with `className` (root) and `classNames` (`groups` / `group` / `subgroups` / `subgroup` / `rows`), each mapping to a stable `data-slot="arrivals-*"` element. The board root is a `@container` named `arrivals`; every line/route section is a `@container` named `arrivals-group`, so bound columns respond to their own line's width — never the whole board's. No JavaScript measuring, no layout enums, no extra wrappers; the tile rhythm above holds in every arrangement. Usage examples: [rail](/docs/tube-rail-arrivals#arrangements) and [bus](/docs/bus-arrivals#arrangements).


## Brand tooling

Import from `@/lib/tfl/brand`:

- `TFL_MODAL_COLOURS` / `UNDERGROUND_LINE_COLOURS` / `OVERGROUND_LINE_COLOURS` — Issue 4 RGB tokens
- `ROUNDEL_PRESETS` — mode roundel colours + bar text (incl. outline / cycles styles)
- `getRoundelExclusion(barWidth)` — 0.25× clear space helper
- `ROUNDEL_DO_NOT` / `ROUNDEL_FONT_POLICY` — published rules as constants
- `LINE_DIAGRAM` + `@/components/tfl/diagram/line-diagram-shapes` — low-level map geometry
- `LineStrip` / `StraightStrip` / `BranchStrip` / `JourneyDiagram` — route strips and A→B journeys (`/components/line-strip`)

Reference crops: `public/brand/line-diagram/`.

### Line strip scale (for agents and consumers)

Strips share **one** responsive scale knob. Published geometry ratios (tick 0.66x, ring 3x, …) stay in `LINE_DIAGRAM` and are **not** theme tokens.

| Token / API | Role |
|-------------|------|
| `--tfl-diagram-scale` (`DIAGRAM_SCALE_VAR`) | Unitless multiplier set on a shared ancestor |
| `DIAGRAM_SCALE_CLASS` | Mobile / tablet / desktop values (`0.7` / `0.85` / `1`) |
| `DIAGRAM_BASELINE.horizontal` / `.vertical` | Orientation px at scale `1` (`10` / `4` — horizontal = Victoria strip; vertical sized for laptop body text) |
| `--tfl-diagram-x` | Resolved line thickness inside each strip root |
| `x` prop | Absolute px override (skips the inherited scale) |

Vertical / journey UI names use **§11** sizing (cap height ≈ ring Ø = 3×) so labels read taller than interchange rings. Mid-route map ticks protrude **right only**; terminals use a full crossbar. Journey A→B markers are **always circles**, never dashes.

**Do:** set `--tfl-diagram-scale` once so every strip on the page shares breakpoints.

```tsx
import { DIAGRAM_SCALE_CLASS } from "@/lib/tfl/brand";
import { LineStrip } from "@/components/tfl/diagram/line-strip";

<div className={DIAGRAM_SCALE_CLASS}>
  <LineStrip lineId="victoria" lineColor="…" stations={…} />
  <JourneyDiagram lineColor="…" from={…} to={…} />
</div>
```

**Do not:** apply separate `text-xs sm:text-sm` / width utilities to ticks, rings, and labels. That desyncs TfL proportions.

Pass `x={10}` (or any px) only when you need a fixed size that ignores the page scale.


## Components

- UI primitives: `components/ui/` (shadcn — do not edit lightly; extend via composition).
- App components: `components/` (your feature components).
- Utility: `cn()` from `lib/utils.ts` for conditional classes.

## Icons

Use `lucide-react`. Import only the icons you need.

## Motion

`motion` is available for animations. Respect `prefers-reduced-motion` for accessibility-sensitive motion.

## Layout

- Mobile-first: start with single-column layouts, then add breakpoints (`sm:`, `md:`, `lg:`).
- Use `min-h-svh` for full-viewport shells where appropriate.

## Adding shadcn components

All registry components were installed at bootstrap. To add or refresh:

```bash
pnpm dlx shadcn@latest add <component-name>
```
