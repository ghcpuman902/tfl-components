# Cycle hire unattended display

**Status: design spike. Do not implement yet.** The Cycle hire boundary stays
open until this anatomy is decided (J14).

## Open choice

1. **Extend `CycleHireDocksDetail`.** Viable if unattended use only changes
   which dock rows are visible — a fixed row count and a timer over the same
   list.
2. **New sibling surface.** Needed if the sequence wants different chrome
   from Detail's unbounded list, such as a one-tile summary plus rotating
   detail.

## Still unanswered

- What is one frame? One dock, or N docks like arrivals rows?
- Does Map participate? The unattended contract is about pageable content.
  Map has no pages today.
- Do occupancy bars need a reduced-motion-safe transition?

Write the sequence and one-tile state here before estimating size. The
120–220 line figure in `unattended-boards.md` stays provisional until then.
