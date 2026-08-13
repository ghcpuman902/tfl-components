# Coding style

Conventions for TypeScript, React, and Next.js in this repo.

## TypeScript

- `strict` mode is enabled — avoid `any`; prefer explicit types at module boundaries.
- Use `type` for object shapes; use `interface` when extending or declaring public APIs if you prefer consistency with shadcn patterns.

## React

- Use function components and hooks.
- Name event handlers with a `handle` prefix: `handleClick`, `handleSubmit`.
- Prefer early returns for loading, error, and empty states.
- Colocate small helpers with the component; extract only when reused.

## Server vs client

- Default to **Server Components** in the App Router.
- Add `"use client"` when you need browser APIs, hooks, event handlers, **or** when the module renders a client leaf such as `StationName` (see below).
- Read `node_modules/next/dist/docs/` before choosing data-fetching or caching patterns.

### Cache Components + strip / `StationName`

This app enables `cacheComponents: true` (PPR). Routes validate an `instant` static shell.

- Any UI that **renders** `StationName` (or other `"use client"` leaves) must itself be a **Client Component** (`"use client"` at the top of the file). Do not leave strip atoms as RSC parents of `StationName` — that triggers `Could not validate instant` / `client reference proxy … module factory is not available` during prerender.
- Pure prep (`prepareStraightStrip`, `prepareBranchStrip`, layout maths) stays in `lib/tfl/*` with **no** `"use client"`.
- Docs pages that **dynamically import** demos must wrap `<Demo />` in `<Suspense>` so client module graphs are not part of the static shell.

### Explorer inspector streaming

Identity (id, name, mode) paints from the in-memory directory on click. Route / arrivals / status stream via `use(promise)` behind `<Suspense>`. Do not `await` per-entity fetches in the explorer page before returning the panel.

Canonical: [docs/explorer-inspector-streaming.md](./explorer-inspector-streaming.md). Agent rule: [`.cursor/rules/explorer-inspector-streaming.mdc`](../.cursor/rules/explorer-inspector-streaming.mdc).

## File structure

```
app/           # routes, layouts, page-level code
components/    # shared UI (non-route)
components/ui/ # shadcn primitives
lib/           # utilities, shared logic
hooks/         # client hooks
public/        # static assets
```

### TfL component layers

Under `components/tfl/` (and registry mirrors under `registry/tfl/`):

- `brand/` and `diagram/` — **rendering primitives** (explicit values; little or no TfL API shape knowledge)
- `status/` and `arrivals/` — **data-aware** boards (interpret `tfl-ts` domain; compose primitives)

Prep helpers stay in `lib/tfl/*`. Product layers and IA: [product-architecture.md](./product-architecture.md) and [TARGET_ARCHITECTURE.md](./TARGET_ARCHITECTURE.md).

### Multi-surface Interfaces (Map + Detail)

When one normalised dataset needs **more than one presentation** (e.g. geographic glance vs dense detail), export **surfaces**, not a single `variant` prop:

1. **Explicit `data` on each surface** — default Open Code path; RSC-friendly; each surface usable alone.
2. **Optional compound Provider** — inject `data` once when Map and Detail are co-mounted; children omit `data`.
3. **App owns chrome** — full-screen map shell, Sheet, floating card wrap the surfaces; the library does not force layout.

```tsx
// Explicit
<>
  <CycleHireDocksMap data={data} className="h-dvh" />
  <Sheet><CycleHireDocksDetail data={data} hideHeader /></Sheet>
</>

// Compound (optional)
<CycleHireDocks data={data}>
  <CycleHireDocks.Map className="h-dvh" />
  <Sheet><CycleHireDocks.Detail hideHeader /></Sheet>
</CycleHireDocks>
```

Use `variant` only when the **same board chrome** paints differently. Rail and bus arrivals are separate domain boards (`RailArrivalsBoard`, `BusArrivalsBoard`), not a `variant` switch. MapLibre / DOM adapters stay in client surface files; do not put provider-specific map code in shared geography helpers.

Canonical example: `registry/tfl/cycle-hire/` (`CycleHireDocks`, `.Map`, `.Detail`).

### Domain board skeletons

Suspense fallbacks for data-aware boards should look like the **product at rest**:

- Paint **static identity** only — mode set, `LINE_ORDER` (or equivalent), display names, brand bars.
- Do **not** invent severity (no fake Disruptions section or reason copy).
- Mute brand colour while loading (`saturate-0` or equivalent); live data restores full saturation and severity split.
- Match TfL product groupings (Tube & Rail ≠ Cable Car). Wire docs Preview to the board’s `*Skeleton`, not a generic pulse block.

Canonical example: `TubeStatusBoardSkeleton` in `registry/tfl/status/tube-status-board.tsx`. Agent rule: [`.cursor/rules/domain-skeletons.mdc`](../.cursor/rules/domain-skeletons.mdc).

## Imports

- Use `@/` path alias (maps to project root).
- Group imports: external → internal → relative.

## Formatting

```bash
pnpm format    # Prettier
pnpm lint      # ESLint (flat config)
pnpm typecheck # tsc --noEmit
```

## Validation

Use **Zod** for runtime validation of env vars, form data, and API payloads when needed.

## Accessibility

- Use semantic HTML (`button`, `nav`, `main`, `label`).
- Ensure interactive elements are keyboard reachable.
- shadcn components include sensible defaults; preserve them when composing.
