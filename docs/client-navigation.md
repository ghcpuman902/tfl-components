# Client navigation

Header and docs taps must **feel instant**. Use Next.js App Router navigation (`<Link>`, App Shell prefetch, `loading.tsx`). Do not invent a parallel pending overlay.

This is the lesson from the “first tap does nothing / second tap works” work on iPhone, and the pattern to keep.

## Symptom vs cause

| What people see | What it usually is | What it is not |
|---|---|---|
| First tap ignored, second tap works | React commit crash, or a hydration race on chrome | Slow TfL fetch |
| URL changes, old page stays | `removeChild` / `commitMutationEffects` during the transition | Missing `loading.tsx` |
| Docs Get started “took 10s from skeleton” | A parent `loading.tsx` sitting above the re-render, or a crashed commit | Need for a 150ms JS timer |
| Sidebar opens then will not reopen | `useIsMobile()` still `false` on the first tap | Broken `<Link>` |
| Map / board stuck on a skeleton | Data Suspense that never resolves **or** a commit crash that never swapped children | Proof that overlays help |

Open the **browser console** before adding more loading UI. If you see `Cannot read properties of null (reading 'removeChild')` or repeated `commitMutationEffects`, fix the DOM owner. The tap already worked.

## Pattern

```text
next/link
  → prefetch the destination App Shell (not live TfL data)
  → leaf loading.tsx covers the page that actually re-renders
  → persistent chrome stays mounted (header, SidebarProvider, docs sidebar)
  → page children stream in
  → useLinkStatus is an inline hint only
```

### 1. Keep chrome mounted

One `SidebarProvider`, one `SiteHeader`, one `DocsSidebar` instance stay mounted across header-only and Docs routes. Visibility is a class (`contents` / `hidden`), not an unmount.

Remounting the sidebar tree on Board → Docs (or the reverse) is expensive and was a source of commit failures. If React “does not like mount/unmount”, **do not remount** — slide or hide the existing tree.

Canonical: `components/docs/app-chrome.tsx`.

`usePathname()` is request-time. Keep it behind `<Suspense>`. The chrome fallback receives `pathname=""` and **must not** render children that call URL hooks (`DocsSidebar`). Pass `pathname` into `SiteHeader`; do not call `usePathname()` from a fallback.

### 2. Native shells, not a timer

“Feels instant” is the Next.js instant-navigation model, not a hardcoded 150ms.

- Docs segment: `export const prefetch = "partial"` on `app/docs/layout.tsx` so `<Link>` prefetches the **App Shell**, not live TfL payloads. Set this on the **destination**, not the link ([prefetch segment config](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/prefetch)).
- Each docs **leaf** that re-renders on sibling navigation needs its own `loading.tsx`. A parent `loading.tsx` sits above that scope and will not cover `/docs/a` → `/docs/b`.
- Shared layouts stay interactive. Do not replace that with a full-viewport `NavigationPendingShell` / `setTimeout` overlay.

Do **not** turn on global `partialPrefetching` until every route in scope is audited ([adopting Partial Prefetching](https://nextjs.org/docs/app/guides/adopting-partial-prefetching)). Incremental `prefetch = "partial"` on `/docs` is the current adoption.

TfL-backed boards and maps stay behind **close** `<Suspense>` with domain skeletons ([coding-style — Domain board skeletons](./coding-style.md#domain-board-skeletons)). Chrome must not wait on the Unified API.

### 3. Real `<Link>`, inline pending only

Header, sidebar, and docs prev/next use `next/link`. Do not wrap those taps in `Tooltip`. On iPhone a tooltip can eat the first press.

`useLinkStatus` is for a **subtle** pending hint on the clicked control (`LinkPendingHint`). Prefer `loading.tsx` + prefetch so the pending phase is skipped. Do not build a second, app-wide pending router.

```tsx
<Link href={href}>
  <LinkPendingHint>{label}</LinkPendingHint>
</Link>
```

### 4. React owns the DOM

App Router transitions reconcile `<head>` and persistent client chrome. Nodes those trees own must stay in React’s lifecycle.

| Surface | Do | Don’t |
|---|---|---|
| Header roundel atlas | `dangerouslySetInnerHTML` on the `<svg>` | `svg.innerHTML = …` |
| `theme-color` | Update `content` in place; append only missing variants (`applyThemeColorMeta`) | `meta.remove()` / replace the Next-owned tags |
| Docs sidebar | Keep mounted; `hidden` when not on docs | Conditional `{showDocs && <DocsSidebar />}` that remounts |

Removing a React-owned `<meta name="theme-color">` is the classic footgun: the URL updates, then commit throws, and the old page stays.

### 5. Resolve viewport at tap time

`useIsMobile()` is `false` on the server and the first client render so SSR HTML matches hydration. A tap that reads that state before the effect runs toggles the **desktop** sidebar.

`toggleSidebar` must call `isMobileViewport()` (a `matchMedia` read) at interaction time so the mobile sheet opens on the first press.

Sidebar entries call `setOpenMobile(false)` on click so the sheet closes immediately, then the route commits.

## Anti-patterns

- Custom 150ms / “pending shell” overlay that paints over the real page
- Replacing `<Link>` with raw `<a>` “so the first tap works”
- Tooltip wrappers on header or sidebar nav
- `usePathname()` / `useLinkStatus()` / `useSidebar()` in a prerender fallback with no Suspense
- Enabling `partialPrefetching: true` globally without an audit
- Fetch-inside reusable boards as the thing that “makes Docs feel fast”
- Imperative `innerHTML` / `remove()` on nodes React will reconcile on the next navigation

## Debug

1. Console first. `removeChild` / `commitMutationEffects` → DOM owner, not prefetch.
2. Confirm the URL changed. If it did, `<Link>` worked.
3. If the URL did not change, check overlays, tooltips, and `pointer-events`.
4. For a drawer that ignores the first tap, check `isMobile` vs `isMobileViewport()`.

SSO-protected Vercel previews redirect anonymous `curl`. Diagnose client exceptions in a signed-in browser ([vercel.md](./vercel.md#preview-client-errors-no-server-log)).

## Canonical files

- `components/docs/app-chrome.tsx` — persistent chrome; pathname-safe fallback
- `components/site-header.tsx` — header `<Link>`s, More sheet
- `components/docs/docs-sidebar.tsx` — sidebar `<Link>`s close the mobile sheet
- `components/link-pending-hint.tsx` — `useLinkStatus`
- `app/docs/layout.tsx` — `prefetch = "partial"`
- `app/docs/**/loading.tsx` — leaf shells
- `lib/theme-color.ts` — in-place theme-color sync
- `components/site-header-roundel.tsx` — React-owned SVG atlas
- `hooks/use-mobile.ts` / `components/ui/sidebar.tsx` — tap-time viewport

Next.js: [Linking and Navigating](https://nextjs.org/docs/app/getting-started/linking-and-navigating), [`useLinkStatus`](https://nextjs.org/docs/app/api-reference/functions/use-link-status), [`prefetch`](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/prefetch). Prefer `node_modules/next/dist/docs/`.
