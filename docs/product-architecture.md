# Product architecture

**Status: FROZEN (Stage 1).** Do not reshape this document to match current file placement. Record conflicts for human review instead.

This is the durable product and information-architecture spec for the TfL developer environment (`tfl-ts` + `tfl-components` + this website). Optimised for humans and coding agents.

---

## 1. What this project is

Three parts, one environment:

| Part | Role |
|------|------|
| **`tfl-ts`** | Data layer: talk to TfL sources, strong TypeScript types, normalise awkward/legacy shapes, expose a developer-friendly mental model of transport information. |
| **`tfl-components`** | Visual/interface layer: turn transport information into useful TfL-oriented interfaces and visual structures. |
| **Website** | Developer environment for understanding and building with London transport data—not merely a component catalog, and not documentation for two unrelated packages. |

The website should help a developer:

1. discover what TfL information exists  
2. understand how that information relates  
3. retrieve it cleanly through `tfl-ts`  
4. inspect the normalised data shape  
5. render that data using `tfl-components`  
6. understand and use lower-level TfL visual primitives  
7. work with geographic and schematic transport representations  
8. use developer tools/playgrounds where appropriate  

Data and visual layers must feel deliberately designed to work together.

---

## 2. Developer intent over TfL API taxonomy

Do **not** organise navigation or library surface around the legacy TfL Unified API resource hierarchy.

Prefer recognisable public-facing transport vocabulary where it works (e.g. Tube and rail, Buses, River, Cycle, Roads / traffic, Cable car). That list is illustrative, not a rigid taxonomy.

**Transport domains are cross-cutting metadata, capabilities, or filters**—not the primary hierarchy.

Avoid duplicating architecture such as Tube → Status and Bus → Status when the developer intent is **Status**, with supported domains represented separately.

Navigation answers: *What is the developer trying to understand, render, or build?*  
Not: *Which legacy TfL endpoint contains this?*

---

## 3. Two layers inside `tfl-components`

```text
normalised TfL data
        ↓
data-aware component
        ↓
TfL / domain interpretation
        ↓
rendering primitives
        ↓
finished interface
```

### Rendering primitives

Composable, primarily presentational.

- Render TfL-style visual structures from **explicit, already-resolved values**
- Avoid unnecessary knowledge of TfL API response structures
- Remain useful independently of `tfl-ts`
- Expose useful visual control
- Are building blocks for higher-level components
- Are **not** private implementation details—developers must be able to discover and use them

May know how to visually represent lines, stops, nodes, badges, labels, status treatments, route segments, interchange markers, and similar—without interpreting an entire TfL domain object.

### Data-aware components

Understand normalised domain objects from `tfl-ts`.

- Accept appropriate `tfl-ts` output directly where practical
- Interpret TfL-specific structure and edge cases
- Compose rendering primitives internally
- Make sensible presentation decisions
- Handle domain-specific visual logic when it belongs to presentation
- Deliver a strong out-of-the-box result

Desired experience:

```ts
const line = await tfl.lines.get(...)
```

```tsx
<SomeTfLComponent data={line} />
```

Repeated glue such as `data.map(...)` that exists only to reconcile *our* data API with *our* visual API is an abstraction smell.

Do **not** duplicate components for “static” vs “data-driven” examples. Prefer one conceptual component composed from primitives. Exact APIs and names are derived later—do not invent them prematurely.

---

## 4. Documentation philosophy

Developers must not need the full primitive architecture before getting useful output.

Highest-value path for data-capable surfaces:

**GET DATA → RENDER IT**

Conceptual separation every capable page must expose without overwhelming the default path:

1. **Getting data**  
2. **Interpreting / rendering data**  
3. **Atomic visual rendering**

Where a high-level component and its primitives are the same conceptual feature, show their relationship on the same page or via obvious related docs. Do **not** maintain two fully duplicated documentation trees (primitive vs data-aware) for every concept.

Primitives remain discoverable as a coherent group (see target architecture).

Page section order is defined in [page-anatomy.md](./page-anatomy.md)—not immutable UI chrome, but a consistent anatomy.

---

## 5. Organise around developer intent

Major intents (principles, not final labels):

- discovering / querying TfL data  
- rendering reusable transport UI  
- accessing lower-level visual primitives  
- working with geographic transport information  
- creating schematic / network representations  
- using shared TfL visual foundations  
- using developer utilities / playgrounds  

Derive the smallest coherent top-level IA from these. Avoid multiple competing hierarchies for the same material. See [TARGET_ARCHITECTURE.md](./TARGET_ARCHITECTURE.md).

---

## 6. Reusable interface concerns

Reusable components represent **transport-interface concepts**, not API endpoints.

Likely concerns (derive groupings; do not blindly create this list as nav): status, disruptions, arrivals/departures, stations and stops, journeys, routes, line/network diagrams, service information, transport identity.

Support both atomic visual elements and higher-level compositions without forcing the wrong abstraction level.

---

## 7. Foundations

Shared visual language is separate from higher-level transport interfaces: line colours, typography, line/mode identity, badges, icons, roundel behaviour, licensing guidance.

Foundations may be consumed by primitives, data-aware components, maps, and tools.

Do not encourage misuse of protected TfL branding or typography. Where assets or fonts need licensing/permission, documentation must state that clearly and provide safe defaults or alternatives.

---

## 8. Components vs tools

| Kind | Criterion |
|------|-----------|
| **Component / interface** | Something a developer embeds in their own application. |
| **Tool / playground** | Something used to inspect, test, understand, tune, generate, compare, or debug data or component behaviour. |

A tool may expose controls that would never belong on a production component API (e.g. a station-name fitting laboratory vs the station-name renderer).

**Tools must not become a dumping ground.** Membership requires meeting the criterion above. Reject “Other”, “Misc”, or one-off experiments that lack a clear inspect/test/tune purpose—those belong in **Drafts** or nowhere.

---

## 9. Maps are first-class

Two different concepts—never one vague “Map”:

### Geographic maps

Real London geography: coordinates, geometry, GeoJSON, layers (stations, lines, journeys, disruptions, vehicles, cycle infrastructure, etc.). Data may come from TfL APIs or supplementary datasets; the consumer gets a coherent developer-facing representation.

**Provider independence:** core geography/data utilities must not depend on Google Maps, MapLibre, Mapbox, Leaflet, OSM rendering, or another specific renderer. Provider adapters sit above common geographic data. Prefer interoperable formats (e.g. GeoJSON) where appropriate.

### Schematic / network maps

Topology and transport relationships: line diagrams, route diagrams, branches, multi-line networks, interchanges, journey highlighting, TfL-style schematic network maps.

Architecture, naming, and docs must keep geographic vs schematic distinct. Allow incremental growth from simple line diagrams toward richer network visualisation; do not assume a full TfL Go–like product exists.

---

## 10. Explorer

Central question: *What does TfL know, and how is that information related?*

A substantial developer-facing explorer of the information model—using concepts that make sense to developers and transport users—not a list of Unified API endpoint categories.

May expose relationships such as domain → lines/routes → stations/stops → status → arrivals → disruptions → related information, where appropriate. Exact model is derived, not assumed.

**Explorer is a developer experience**, not necessarily a reusable component.

---

## 11. Data sources vs rendering

Do not couple reusable visual components to the documentation site’s fetch mechanism.

Supported acquisition modes (examples): site cached/demo data, deterministic fixtures, developer credentials for live experimentation, direct `tfl-ts` in the consumer app.

Fixtures matter for states that may not exist live (specific disruption combinations). Previews should be able to demonstrate meaningful states deterministically.

---

## 12. Drafts / incubation

Deliberate place for experimental or incomplete work:

- exists without pretending to be a stable public API  
- does not pollute the main IA  
- allows unfinished explorations to be evaluated  
- has a path to Component, Primitive, Map, Foundation, Explorer, or Tool  

**Promotion criteria (all should be true before leaving Drafts):**

1. Clear developer intent and stable conceptual name  
2. Fits an existing top-level group without inventing a misc category  
3. Documented data contract (or explicit “primitive-only / no data”)  
4. Safe branding/licensing behaviour where relevant  
5. Not solely a one-off experiment; reusable or clearly a tool/explorer feature  
6. Human review accepted promotion  

Drafts must not become a permanent miscellaneous folder. Work that fails promotion is archived or deleted, not left indefinitely under a fake “stable” label.

---

## 13. Growth rules

### Create a new top-level category only when

- it represents a durable developer intent absent from existing groups, and  
- placing the material under an existing group would seriously mislead, and  
- it will hold multiple pages or a substantial future surface—not a single experiment  

### Do not create a new category or page when

- it only mirrors a TfL API endpoint name  
- it duplicates static vs data-driven versions of the same concept  
- it exists for one experiment (use Drafts)  
- it is named after an accidental implementation detail  
- “Misc”, “Other”, or “Advanced” would be the honest label  

### Naming

- Prefer transport-interface and developer-intent language over endpoint or file names  
- Prefer stable conceptual names over current component filenames  
- Distinguish geographic vs schematic explicitly in names and routes  
- Do not encode “Static” / “Live” / “Demo” into component product names  

---

## Related frozen docs

- [TARGET_ARCHITECTURE.md](./TARGET_ARCHITECTURE.md) — top-level and second-level IA  
- [page-anatomy.md](./page-anatomy.md) — page type anatomies  
