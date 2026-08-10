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

Under `components/tfl/`:

- `brand/` and `diagram/` — **rendering primitives** (explicit values; little or no TfL API shape knowledge)
- `status/` and `arrivals/` — **data-aware** boards (interpret `tfl-ts` domain; compose primitives)

Prep helpers stay in `lib/tfl/*`. Product layers and IA: [product-architecture.md](./product-architecture.md) and [TARGET_ARCHITECTURE.md](./TARGET_ARCHITECTURE.md).

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
