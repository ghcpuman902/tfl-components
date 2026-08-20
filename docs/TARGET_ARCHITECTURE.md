# Target information architecture

**Status: FROZEN (Stage 1) + human amendments J1 / J6 / J8 / J9 / J18 / J19 / J20 / J22 / J23.** Derived from [product-architecture.md](./product-architecture.md). Do not reshape to match current file placement without a new decision.

Transport domains (Tube & rail, Bus, River, Cycle, Roads / traffic, Cable car, …) are **filters / metadata / markers**, not top-level nav trees.

See [ia-migration/DECISIONS.md](./ia-migration/DECISIONS.md) **J6** (nav chrome, 2026-08-10), **J8** (publish chrome, 2026-08-14), **J9** (hosted Board, 2026-08-14), **J22** (Labs / Get started, 2026-08-20), and **J23** (More is mobile overflow, 2026-08-20).

---

## Site chrome (persistent header)

Same header on homepage, docs, Labs, Explorer, and Board:

```text
Desktop: [Logo + tfl-components → /]  Docs  Components  Explorer  Labs  Board     [Search][Star on GitHub][Theme]
Mobile:  [Logo + tfl-components → /]  Docs  Board  More     [Theme]
         More (full-width sheet): [Search]  Components  Explorer  Labs  GitHub
```

Search, GitHub, and theme sit in one right-aligned cluster. If the row is tight, the search hint and then the search field shrink; the primary nav never scrolls or wraps. Desktop keeps **Docs** first and **Board** last. On mobile those two stay in the bar and the middle items (Components, Explorer, Labs) plus GitHub collapse into **More**, a full-width sheet that also holds search. Docs pages keep a sidebar trigger under the header.

| Link       | Lands on                                                                 |
| ---------- | ------------------------------------------------------------------------ |
| Logo       | `/` (full-width homepage — no docs sidebar)                              |
| Docs       | `/docs` (Get started)                                                    |
| Components | `/docs/components` (catalogue). Top-level on desktop; in More on mobile. |
| Explorer   | `/docs/explorer`. Top-level on desktop; in More on mobile.               |
| Labs       | `/labs`. Top-level on desktop; in More on mobile. Experimental.          |
| Board      | `/board` (builder), last on desktop. `/board/view` is chromeless.        |
| GitHub     | “Star on GitHub” next to search on desktop. In More on mobile.            |
| More       | Follows Docs and Board on mobile. Holds the collapsed middle items plus GitHub. |

**Homepage** stays full-width proof (no sidebar). **Docs** routes use this header plus a compact docs sidebar. **Labs** and **Board** (builder) use the same header **without** the docs taxonomy sidebar. **Tools** and **Drafts** are footer links in development only — hidden in production.

---

## Docs sidebar (discovery chrome)

Two primary sections. Composition layers stay real; they are **not** nested sidebar group titles.

### Get started

Orient before picking a surface:

- Get started (`/docs`) — separate from the homepage
- Components directory (`/docs/components`)
- Explorer (single entry; WIP — owns its own sub-nav when opened)
- Typography
- Colours
- Roundel
- Troubleshoot (`/docs/troubleshoot`) — below the Components list; setup, common problems, and FAQ. Install lives on Introduction. Old `/docs/installation` redirects here.
- Data model (`/docs/data-model`) — below Troubleshoot; network records the four maps actually draw, with provenance (J18, J20).
- Line topology (`/docs/line-topology`) — below Data model; inspect how TfL station order and OSM track assemble a passenger line (J19, J20). Junction windows are a child route, not a sidebar entry.
- TfL brand licensing (and Skills for AI when present)

### Components (flat list)

Preferred high-level embeds first, marked with a **mode-coloured roundel** (or equivalent marker). Lower-level rendering parts omit the marker and sort below. No “Data-aware / Primitives / Maps” subheadings.

Examples of preferred entries: Tube & rail arrivals, Tube & rail status, Bus arrivals, Geographic map, (coming-soon domain boards), then Simple line strip, Branch line strip, Station name labels.

**Maps** appear here as distinct Geographic vs schematic/TubeMap **entries** — first-class embeddable surfaces, never under Tools, never one vague “Map” bucket.

### Primitives & Foundations (sidebar tail)

Super lower-level or guidance leftovers that do not fit Get started or the preferred Components list (e.g. icons). Prefer pure CSS/HTML primitives here as the library grows.

**Labs, Tools, Drafts, Board** are not permanent docs-sidebar groups. Board: top nav. Labs: More menu (J22). Tools and Drafts: footer / contributor path, development only (J8). `/board/view` is chromeless (J9).

---

## Composition layers (not sidebar groups)

These remain the product model for pages, APIs, and catalogue badges:

```text
raw TfL / OSM / GTFS sources
 ↓
network model (GTFS-shaped Line, Station, ServicePattern, …)
 ↓
normalised tfl-ts data
 ↓
data-aware component
 ↓
domain interpretation
 ↓
rendering primitives
 ↓
foundations (colour, type, roundel rules)
 ↓
finished UI
```

| Layer                    | Role                                                                      |
| ------------------------ | ------------------------------------------------------------------------- |
| **Network model**        | Line / Station / ServicePattern records the four maps draw (J18, J20)     |
| **Data-aware**           | Accept normalised data as props; strongest GET DATA → RENDER path         |
| **Rendering primitives** | Explicit values; useful without `tfl-ts` where practical                  |
| **Foundations**          | Shared brand/visual language and licensing                                |
| **Maps**                 | Geographic (coordinates) vs schematic/network (topology) — distinct pages |
| **Labs**                 | Experimental compositions outside the atomic registry                     |
| **Tools**                | Inspect / test / tune / debug only                                        |
| **Explorer**             | DX for the information model — not a registry item by default             |
| **Drafts**               | Incubation with a promotion path                                          |

Catalogue and page anatomy use layer metadata. Sidebar discovery is **flat + sort + markers**.

---

## Explorer

Single docs-sidebar entry. Browse lines, route stations, stations, relationships live **inside** Explorer once opened — not as global sidebar peers.

---

## Labs (J1, amended J22)

Experimental displays and composed examples built from the component library. These may change or break before version 1.0. Own shell; not a docs-sidebar taxonomy section. Top-level on desktop; in More on mobile. `/labs` is canonical; `/blocks` redirects.

---

## What this architecture deliberately excludes

- Primary nav by Unified API resource
- Primary nav by transport mode with duplicated feature trees (modes are markers/filters)
- Generic Misc / Other
- Separate static vs live component product lines
- Hiding maps inside Tools
- Treating Explorer as just another registry component by default
- Nested Interfaces / Primitives / Maps **sidebar** group titles (superseded by J6 chrome)
