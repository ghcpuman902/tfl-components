# Explorer inspector streaming

Selection in `/docs/explorer` must **paint identity immediately** from data already on the client (cached directory, search hit, featured seed). Route sequences, arrivals, status, and occupancy that need a server round-trip **stream in** behind a close `<Suspense>` via `use(promise)`.

This is a Cache Components pattern: the list + Identity are the static/cached shell; Preview / Relationships / Normalised that depend on `id` (and `dir`) are dynamic slots.

## Split

| Layer | Source | When it paints |
|---|---|---|
| Finder list / chip grid | Cached directory or featured seed | With the panel |
| Inspector **Identity** (id, name, mode, coords, colour bar) | Selected row already in memory | On click (optimistic) |
| Inspector **Preview / Relationships** that need TfL | `"use cache"` helper, passed as a **Promise** | After `use()` resolves |
| Live refresh | Visitor key, browser → TfL | After identity, never blocks it |

`router.push` updates the shareable URL **after** local selection. Do not `await` per-entity fetches in the page before returning the panel.

## Server page

```tsx
// Directory may be sync (offline topology) or awaited cached seed.
const lines = await getExplorerBusLines();
const selected = firstOrMatching(lines, state.id);

// Do not await — pass the Promise into the client inspector.
const detailsPromise = selected
  ? getExplorerLineDetails(selected.id, state.dir)
  : null;

return (
  <LinesBusPanel
    state={state}
    lines={lines}
    detailsPromise={detailsPromise}
  />
);
```

The helper that produces the promise is `"use cache"` (see `getExplorerLineDetails`, `getExplorerCachedArrivals`). Arguments (`lineId`, `direction`, stop id) are the cache key.

## Client inspector

1. Optimistic selection (`useOptimisticLine` / `useOptimisticPoint`) sets the selected entity **before** `router.push`.
2. Identity always reads that local selection.
3. If `detailsPending` (local id/dir ≠ URL) **or** the promise is for a different entity, show the details skeleton / identity-only inspector — do not `use()` a stale promise (that would suspend the new identity on the previous fetch).
4. Otherwise `<Suspense fallback={skeleton}>` + `use(detailsPromise)`. Ignore payloads whose `lineId` / `stopPointId` does not match the current entity.

Canonical: `LineInspector`, `PointInspectorDeferred`.

## Direction, arrivals, occupancy

- **Inbound / outbound** live with the stop sequence they control (Relationships), not in Identity.
- Seed arrivals are a promise **only for the default-selected seed**. Other points use the visitor key; identity still paints from the list/search hit.
- Cycle occupancy on featured docks is already on the seed row — treat it as identity-adjacent; do not block Identity on a second fetch.

## Anti-patterns

```tsx
// ❌ Await entity details before rendering the panel
const [route, status] = await Promise.all([getRoute(id), getStatus(id)]);
return <Panel route={route} status={status} />;

// ❌ Derive inspector identity only from URL, so clicks wait on RSC
const selected = firstOrMatching(lines, state.id);

// ❌ use() a seed promise while showing a different selected id
<PointInspectorDeferred point={other} cachedArrivalsPromise={seedPromise} />
```

```tsx
// ✅ Local selection first; stream details; skip stale promises
setOptimisticId(lineId);
router.push(href);
// detailsPending → skeleton; when URL matches, use(detailsPromise)
```

## File map

| Piece | Where |
|---|---|
| Optimistic line id + dir | `components/explorer/use-optimistic-selection.ts` |
| Line details promise | `getExplorerLineDetails` in `lib/tfl/explorer/lines-tube-rail.ts` |
| Seed arrivals promise | `getExplorerCachedArrivals` |
| Line inspector | `components/explorer/entity-inspector/line-inspector.tsx` |
| Point inspector | `PointInspectorDeferred` in `point-inspector.tsx` |
| Page wiring | `app/docs/explorer/page.tsx` |
