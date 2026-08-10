# Target information architecture

**Status: FROZEN (Stage 1) + human amendments J1 / J6.** Derived from [product-architecture.md](./product-architecture.md). Do not reshape to match current file placement without a new decision.

Transport domains (Tube & rail, Bus, River, Cycle, Roads / traffic, Cable car, …) are **filters / metadata / markers**, not top-level nav trees.

See [ia-migration/DECISIONS.md](./ia-migration/DECISIONS.md) **J6** for the nav-chrome amendment (2026-08-10).

---

## Site chrome (persistent header)

Same header on homepage, docs, Blocks, and Tools:

```text
[Logo → /]  Docs  Components  Blocks  Tools     [Search]  [GitHub]
```

| Link | Lands on |
|------|----------|
| Logo | `/` (full-width homepage — no docs sidebar) |
| Docs | `/docs/installation` |
| Components | `/docs/components` (catalogue) |
| Blocks | `/blocks` |
| Tools | `/tools` |

**Homepage** stays full-width proof (no sidebar). **Docs** routes use this header plus a compact docs sidebar. **Blocks** and **Tools** use the same header **without** the docs taxonomy sidebar (own section, like shadcn Blocks).

---

## Docs sidebar (discovery chrome)

Two primary sections. Composition layers stay real; they are **not** nested sidebar group titles.

### Get started

Orient before picking a surface:

- Introduction (`/docs`) — separate from the homepage
- Components directory (`/docs/components`)
- Installation
- Explorer (single entry; WIP — owns its own sub-nav when opened)
- Typography
- Colours
- Roundel
- TfL brand licensing (and Skills for AI when present)

### Components (flat list)

Preferred high-level embeds first, marked with a **mode-coloured roundel** (or equivalent marker). Lower-level rendering parts omit the marker and sort below. No “Data-aware / Primitives / Maps” subheadings.

Examples of preferred entries: Tube & rail arrivals, Tube & rail status, Bus arrivals, Geographic map, (coming-soon domain boards), then Simple line strip, Branch line strip, Station name labels.

**Maps** appear here as distinct Geographic vs schematic/TubeMap **entries** — first-class embeddable surfaces, never under Tools, never one vague “Map” bucket.

### Primitives & Foundations (sidebar tail)

Super lower-level or guidance leftovers that do not fit Get started or the preferred Components list (e.g. icons). Prefer pure CSS/HTML primitives here as the library grows.

**Blocks, Tools, Drafts** are not permanent docs-sidebar groups. Drafts: footer / contributor path. Tools and Blocks: top nav.

---

## Composition layers (not sidebar groups)

These remain the product model for pages, APIs, and catalogue badges:

```text
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

| Layer | Role |
|-------|------|
| **Data-aware** | Accept normalised data as props; strongest GET DATA → RENDER path |
| **Rendering primitives** | Explicit values; useful without `tfl-ts` where practical |
| **Foundations** | Shared brand/visual language and licensing |
| **Maps** | Geographic (coordinates) vs schematic/network (topology) — distinct pages |
| **Blocks** | Mini-app compositions outside the atomic registry |
| **Tools** | Inspect / test / tune / debug only |
| **Explorer** | DX for the information model — not a registry item by default |
| **Drafts** | Incubation with a promotion path |

Catalogue and page anatomy use layer metadata. Sidebar discovery is **flat + sort + markers**.

---

## Explorer

Single docs-sidebar entry. Browse lines, route stations, stations, relationships live **inside** Explorer once opened — not as global sidebar peers.

---

## Blocks (J1)

Like shadcn **Blocks**: composed mini-apps outside the reusable component catalog. Top-nav / own shell; not a docs-sidebar taxonomy section.

---

## What this architecture deliberately excludes

- Primary nav by Unified API resource
- Primary nav by transport mode with duplicated feature trees (modes are markers/filters)
- Generic Misc / Other
- Separate static vs live component product lines
- Hiding maps inside Tools
- Treating Explorer as just another registry component by default
- Nested Interfaces / Primitives / Maps **sidebar** group titles (superseded by J6 chrome)
