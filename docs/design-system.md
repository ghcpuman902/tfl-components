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
