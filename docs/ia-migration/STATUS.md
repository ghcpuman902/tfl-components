# IA migration status

**Current:** Stage 1 frozen · mechanical + judgement migration executed · post-IA polish in progress / done.

| Stage | Status | Notes |
|-------|--------|-------|
| Stage 1 principles / target IA / page anatomy | **Frozen** | [product-architecture.md](../product-architecture.md), [TARGET_ARCHITECTURE.md](../TARGET_ARCHITECTURE.md), [page-anatomy.md](../page-anatomy.md) |
| Pre-migration baseline | **Done** | [BASELINE.md](./BASELINE.md) · commit `9deafc5` |
| Scaffold + inventory + plan | **Done** | commit `05c25a2` |
| Human decisions (C1–C6, J1–J5) | **Done** | [DECISIONS.md](./DECISIONS.md) |
| Bulk MOVE / rename / data-props / Blocks | **Done** | See [VERIFY.md](./VERIFY.md) · release `890e8b1` (v0.3.0) |
| Post-IA polish (hubs, Coming soon, MDX anatomy, docs tidy) | **This pass** | Section hubs; board data guards; shipped MDX aligned |

## Source of truth for live routes

Use [`lib/docs-catalog.ts`](../../lib/docs-catalog.ts) and [VERIFY.md](./VERIFY.md). [INVENTORY.md](./INVENTORY.md) is a **historical** pre-move classification — do not treat it as current URLs.

## Conflicts

All closed — [CONFLICTS.md](./CONFLICTS.md).
