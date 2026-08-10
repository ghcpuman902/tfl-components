# Target information architecture

**Status: FROZEN (Stage 1).** Derived from [product-architecture.md](./product-architecture.md). Do not reshape to match current routes or folders.

Transport domains (Tube & rail, Bus, River, Cycle, Roads / traffic, Cable car, …) are **filters / metadata**, not top-level nav nodes.

---

## Top-level groups

### 1. Start

**Why:** Orient developers before they pick a surface.

**Contains:** what this environment is; relationship of `tfl-ts` and `tfl-components`; installation; credentials; quick “get data → render” path; links into Explore / Interfaces / Foundations.

**Second level (examples):** Introduction · Installation · Credentials / env · How the libraries fit

---

### 2. Explore

**Why:** Answer *what does TfL know, and how is it related?* without mirroring Unified API endpoint lists.

**Contains:** developer-facing information model, relationship browsers, normalised shape inspection, domain → line/route → stop → status/arrivals/disruption traversals as the model matures.

**Second level (examples):** Overview · Domains · Lines & routes · Stations & stops · Status & disruptions · Arrivals · Relationships (as built)

**Not:** a reusable shadcn registry item by default. Explorer is DX, not necessarily a component.

---

### 3. Interfaces

**Why:** Highest-value embeddable, **data-aware** UI organised by developer intent.

**Contains:** components that accept (or responsibly obtain) normalised `tfl-ts` data and render useful transport interfaces.

**Second level (by intent, not mode):**

| Second-level | Intent |
|--------------|--------|
| Status & disruptions | Line/network service state |
| Arrivals & departures | Stop/station boards |
| Journeys | A→B presentation |
| Routes & sequences | Ordered stops / route context |
| Service information | Broader service messaging where distinct from status |
| Identity surfaces | Composed identity UI that is still data-aware (if any)—prefer Foundations for pure brand marks |

Each interface page links down to the **Primitives** (and Foundations) it uses. Do not fork “Tube status” / “Bus status” top-level trees; domains appear as supported filters or variants on the same intent.

---

### 4. Primitives

**Why:** Discoverable coherent group for lower-level visual control without forcing every developer through it first.

**Contains:** rendering primitives that take explicit values; independent of `tfl-ts` where practical.

**Second level (by visual concern):**

| Second-level | Examples of concern |
|--------------|---------------------|
| Line & route geometry | Straight/branch strips, markers, segment treatments |
| Stops & labels | Station/stop name rendering, label layout atoms |
| Status treatments | Severity/status visual atoms (not full boards) |
| Markers & interchange | Connection flags, interchange marks, pictograms |

**Relationship to Interfaces:** same conceptual feature documents relationship (parent interface ↔ child primitives). No duplicate parallel tree of “PrimitiveStatus” vs “DataStatus” for every concept.

---

### 5. Foundations

**Why:** Shared visual language and licensing, separate from interface composition.

**Contains:** line colours, badges, typography guidance, mode/line identity, roundel behaviour, icons, licensing / trademark safe defaults.

**Second level (examples):** Colours & badges · Typography · Roundel & trademarks · Icons / pictograms · Licensing

Consumed by Primitives, Interfaces, Maps, and Tools.

---

### 6. Maps

**Why:** First-class geographic and schematic work must not live under Tools or Misc.

**Second level (mandatory split):**

| Second-level | Meaning |
|--------------|---------|
| Geographic | Real coordinates/geometry; provider-independent core; GeoJSON and layers |
| Schematic & network | Topology, line/network diagrams, branches, interchanges, journey highlighting |

Never collapse these into one vague “Map” label in nav or docs.

---

### 7. Tools

**Why:** Playgrounds differ from embeddable components.

**Membership criterion:** the page exists primarily to inspect, test, understand, tune, generate, compare, or debug—not to ship as the production component itself.

**Second level:** group by what is being tuned (e.g. typography lab, schema inspectors)—only when the criterion holds. Reject dumping-ground entries.

---

### 8. Drafts

**Why:** Incubate without polluting stable IA.

**Contains:** experimental or incomplete ideas with stated intent and promotion path (see product-architecture §12).

**Second level:** flat or lightly tagged list; no fake stability. Promotion moves the work into Start / Explore / Interfaces / Primitives / Foundations / Maps / Tools as appropriate.

---

## How primitives vs data-aware appear in nav

```text
Interfaces  →  primary path for GET DATA → RENDER
Primitives  →  coherent discovery for control
Foundations →  shared brand/visual language
```

Cross-links on pages beat duplicated hierarchies.

---

## What this architecture deliberately excludes

- Primary nav by Unified API resource  
- Primary nav by transport mode with duplicated feature trees  
- Generic Misc / Other  
- Separate static vs live component product lines  
- Hiding maps inside Tools  
- Treating Explorer as just another registry component by default  
