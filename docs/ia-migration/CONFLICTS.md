# Stage 1 vs implementation conflicts

Frozen Stage 1 docs were **not** edited to resolve these. Flagged for human review.

| ID | Frozen principle | Implementation fact | Notes |
|----|------------------|---------------------|-------|
| C1 | Explore is first-class at developer-intent IA | `/explore` previously **permanent-redirected** to `/tools/browse-lines` | Scaffold **removed** that redirect so `/explore` can be the section index. Old bookmarks to “browse lines via /explore” break unless a secondary alias is added (e.g. `/explore/lines`). |
| C2 | Foundations vs Primitives split (colours/roundel vs geometry) | Interim docs pass had grouped roundel + badges under “Primitives” | Catalog now places roundel/badges under **Foundations** and strips under **Primitives** without moving files — matches frozen IA. |
| C3 | Maps first-class with Geographic \| Schematic | Line/branch strips lived only under components/foundations-style nav; no geo product | Scaffold adds Maps placeholders; strips remain at `/components/...` until migration. Cross-link only. |
| C4 | Transport domains are filters, not primary nav | Pre-scaffold nav used Tube & rail / Bus groups | Catalog now uses **Interfaces** for all boards; domain remains in copy/props, not top-level group. |
| C5 | Tools membership criterion | `browse-lines` / `route-stations` lived under `/tools/*` | Catalog group set to **Explore**; filesystem path still `/tools/...` until MOVE batch. |
| C6 | Data-aware accepts `tfl-ts` data directly | Boards mostly fetch internally via `getTflClient()` | Documented as acceptable high-value path; prefetch-as-props is future API work — not a principle conflict requiring Stage 1 edit. |

No frozen Stage 1 file was modified after freeze to accommodate the above.
