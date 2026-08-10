# Page anatomy

**Status: FROZEN (Stage 1).** Consistent documentation anatomies for the groups in [TARGET_ARCHITECTURE.md](./TARGET_ARCHITECTURE.md). Section titles may be worded for tone; the **concepts and order of emphasis** are normative.

Site chrome (global install command, preview host) may wrap these sections; do not omit the conceptual separations.

---

## Shared rules

1. Lead with the highest-value path for that page type.  
2. Separate **getting data**, **interpreting/rendering**, and **atomic visuals** when all three apply.  
3. Link related layers; do not duplicate entire page trees.  
4. State branding/licensing constraints early when Foundations or identity assets are involved.  
5. Mark Draft pages as unstable in the header.

---

## Explore / data page

1. **Purpose** — what question this view answers about TfL’s information model  
2. **Concepts** — entities and relationships in developer/passenger language  
3. **How to retrieve** — `tfl-ts` (or explorer actions) for this slice  
4. **Normalised shape** — what the data looks like after normalisation (examples/fixtures)  
5. **Relationships** — links to related Explore nodes  
6. **Render next** — pointers to Interfaces / Maps that consume this data  
7. **Notes / limits** — coverage, freshness, domain filters  

Do not structure as a raw endpoint catalog.

---

## Data-aware interface page

Default journey: **GET DATA → RENDER**.

1. **Purpose** — what interface this embeds  
2. **Installation** — registry / copy instructions when installable  
3. **Preview** — meaningful demo (prefer fixtures for hard-to-hit live states)  
4. **Getting the data** — `tfl-ts` (and/or board-managed fetch); show normalised shape  
5. **Render** — pass data into the component (or documented fetch-inside path)  
6. **Variations** — supported domains, props, layouts  
7. **Behaviour / specification** — sorting, polling, caching, edge cases  
8. **Underlying primitives** — which Primitives (and Foundations) power it  
9. **Lower-level usage** — when to drop to primitives for control  

Avoid leading with primitive assembly before the render path works.

---

## Rendering primitive page

Control-first; assume the reader wants explicit values.

1. **Purpose** — visual structure this draws  
2. **Installation** — when installable  
3. **Preview** — explicit-value examples  
4. **API / values** — props and resolved inputs (no hidden TfL fetch required)  
5. **Composition** — how atoms combine  
6. **Used by** — data-aware Interfaces (and Maps) that compose this primitive  
7. **Independence notes** — relationship to `tfl-ts` (ideally none required)  
8. **Edge / accessibility** — contrast, reduced motion, labelling  

---

## Geographic map page

1. **Purpose** — geographic capability  
2. **Data** — sources, normalised geographic representation, GeoJSON or equivalent  
3. **Provider independence** — core utilities vs optional renderer adapters  
4. **Usage** — consume data without locking to one map SDK in the core  
5. **Layers / features** — stations, lines, journeys, disruptions, etc. as applicable  
6. **Preview** — deterministic where possible  
7. **Limits** — licensing of basemaps, accuracy, coverage  

---

## Schematic / network page

1. **Purpose** — topological / schematic representation (explicitly not geographic)  
2. **Installation** — when installable  
3. **Preview**  
4. **Getting the data** — when data-aware; or prepared schematic model when primitive  
5. **Render** — diagram / network API  
6. **Topology concerns** — branches, shared nodes, interchanges, closures  
7. **Primitives vs composition** — atoms vs molecular wrappers  
8. **Standards / brand** — diagram standards, colour, typography constraints  
9. **Path to richer networks** — incremental scope; no claim of full network product  

---

## Foundation page

1. **Purpose** — shared visual or identity concern  
2. **Safe default** — what ships without special permission  
3. **Licensing / trademark** — required reading when TfL assets/fonts involved  
4. **Usage** — how Interfaces / Primitives / Maps consume this  
5. **API / tokens** — colours, CSS vars, components  
6. **Do / don’t** — misuse prevention  
7. **Preview**  

---

## Tool / playground page

1. **Purpose** — what is being inspected, tuned, or debugged  
2. **Why a tool** — why this is not the production component API  
3. **Controls** — interactive surface  
4. **Related component / primitive** — link to the embeddable surface  
5. **How to apply learnings** — what to take into app code  
6. **Limits** — not for production embed as-is  

If it cannot satisfy the Tools membership criterion, it does not belong here (use Drafts or a real component page).

---

## Draft / incubation page

1. **Status banner** — experimental / unstable  
2. **Intent** — what problem it might solve  
3. **Current state** — what works / what does not  
4. **Candidate home** — which target group it would join if promoted  
5. **Promotion checklist** — against product-architecture §12  
6. **Preview / scratch** — optional  
7. **Non-goals** — what it must not be mistaken for  

No registry “stable install” framing until promoted.
