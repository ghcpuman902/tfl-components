# Design: sidebar user TfL credentials

Status: **proposal** (not implemented).  
Audience: human review before any implementation PR.  
Branch / epic: `docs/tfl-user-credentials-design` → follow-up implementation PRs.

## 1. Problem

This site’s live demos and server caches call the TfL Unified API with **site** credentials (`TFL_APP_ID` / `TFL_APP_KEY` in server env via `getTflClient()`). That is correct for shared proof surfaces (homepage, cached status, Explorer).

Developers exploring the docs may want **their own** portal subscription key so that:

- interactive / high-churn demos (arrivals polling, nearby bus search) bill against **their** quota, not ours;
- they can verify “my key works” before installing Open Code into their app;
- rate-limit pressure on the shared site key stays bounded.

Product architecture already names this acquisition mode: *developer credentials for live experimentation* ([product-architecture.md](./product-architecture.md) §11), distinct from site cache, fixtures, and consumer-app `tfl-ts`.

## 2. Current state (investigation summary)

### Credentials model

| Concept | Today in this repo | TfL portal (2024+) |
|--------|--------------------|--------------------|
| `TFL_APP_ID` | Required by `tfl-ts` constructor; sent as `app_id` query param | **No longer required**; portal copy says ignore `app_id` |
| `TFL_APP_KEY` | Server env; sent as `app_key` query param | Same value as **Primary key** / subscription key |
| Primary key | Not named in UI | What users copy from Profile after subscribing to “500 requests/min” |

`lib/tfl/client.ts` builds a server-only `TflClient` from env. There is **no** browser credential store and **no** `/api/tfl` proxy. Site API routes are stats, registry, and feedback only.

`tfl-ts` still requires both `appId` and `appKey` (throws `TflConfigError` if either is missing) and always appends both query params. For browser use with a modern primary key only, the adapter must pass a **harmless sentinel `appId`** (e.g. `"browser"`) until upstream `tfl-ts` relaxes the check — TfL ignores unused `app_id`.

### Who fetches today

| Surface | Path | Credentials |
|--------|------|-------------|
| Homepage panels, Tube status demo, cycle-hire demo, week-ahead, line spines | `"use cache"` helpers → `getTflClient()` | Site env |
| Explorer lines/routes | RSC + `"use cache"` | Site env |
| Arrivals board demos, `LiveArrivalsBoard` | Client poll → **Server Action** `getStopArrivalsAction` | Site env |
| `BusArrivals` registry helper | Client → Server Actions in `lib/tfl/actions.ts` | Site env |
| Published boards (`TubeStatusBoard`, `ArrivalsBoard`, cycle-hire surfaces) | **Props only** — no fetch | N/A (Open Code) |

There is no first-class client → `api.tfl.gov.uk` path in this app yet. Interactive demos already run in the browser but **delegate** network to Server Actions, so every poll uses the site key.

### Sidebar chrome

- Docs shell: `components/docs/app-chrome.tsx` → `DocsSidebar` when pathname is `/docs` or `/explore`.
- Footer today: `SidebarFooter` with `FeedbackDialog` + version link (`components/docs/docs-sidebar.tsx`).
- Homepage / Blocks / Tools: **no** docs sidebar — credential UI is docs/explorer-only unless we later add a header affordance (out of scope for v1).

### CORS (verified 2026-08)

`GET https://api.tfl.gov.uk/...` returns `access-control-allow-origin: *`. Browser → TfL with the user’s `app_key` is **viable**. Historical “you must proxy” advice is outdated for simple GETs. Design assumes direct client calls; a same-origin relay remains a **fallback** only if CORS regresses on some endpoints.

## 3. Goals / non-goals

### Goals

1. Sidebar-bottom affordance to paste / clear a user **Primary key** (`app_key`).
2. Persist safely for the developer’s machine without teaching bad Open Code habits.
3. When set, **opt-in client demos** call TfL with the user’s key (quota on their subscription).
4. Keep published registry components on **data-as-props**; do not bake credentials into installable source.
5. Keys **must not be persisted on our servers** (Redis, DB, logs, cookies we can read).

### Non-goals (v1)

- Replacing site env credentials for homepage / `"use cache"` boards.
- Publishing a credential manager as a registry item.
- Multi-user accounts, OAuth, or TfL portal SSO.
- Encrypting keys at rest beyond “browser storage + never send to our origin”.
- Changing Tools IA to own this (Tools = inspect/tune; this is **docs chrome**, not a Tool page).
- Making every Server Action accept a client-supplied key (would put keys on our server every call).

## 4. UX — sidebar bottom

### Placement

In `DocsSidebar` `SidebarFooter`, **above** or **beside** the Feedback + version row:

```
┌─────────────────────────────┐
│ … nav …                     │
├─────────────────────────────┤
│ ○ Add TfL API key        ›  │  ← empty state
│ ● Key ·•••9bdf  Clear    ›  │  ← filled state (masked)
│ Feedback          v0.5.0    │
└─────────────────────────────┘
```

Collapsed offcanvas: same control remains in the drawer footer (no separate mobile-only design).

### Empty state

- Label: **Add TfL API key** (or **Use your TfL key**).
- Opens a small dialog (pattern: `FeedbackDialog` — Dialog/Sheet, not an always-expanded form that steals footer height).
- Copy (short):
  - Get a free **Primary key** from [api-portal.tfl.gov.uk](https://api-portal.tfl.gov.uk/) (subscribe to 500 req/min → Profile → Show).
  - Stored **only in this browser**; never sent to tfl.manglekuo.com.
  - Used for **live demos that run in your browser**; homepage and cached boards still use site credentials.
- Single password-style field: Primary key / `app_key`. Optional advanced collapse for legacy `app_id` (default sentinel, hide unless needed).
- Actions: **Save**, **Cancel**. Validate non-empty + reasonable length (hex-ish / 32+ chars) with soft warning, not hard block.

### Filled state

- Compact status: **Your key** + last 4 characters (never full key in the footer label).
- Menu / dialog: **Replace**, **Clear**, link to portal, one-line reminder of which demos use it.
- Optional toast on save: “Live demos will use your key.”

### Discoverability

- First-visit: no modal interrupt. Rely on footer + a one-line callout on the first arrivals / interactive demo that still uses Server Actions (“Prefer your own quota? Add a key in the sidebar”).
- Do not put credentials in the global header (J6 chrome stays Docs · Components · Blocks · Tools).

## 5. Persistence + threat model

### Recommendation: `localStorage` (default), optional session-only

| Option | XSS can read? | Survives tab close? | Hits our server? | Verdict |
|--------|---------------|---------------------|------------------|---------|
| **localStorage** | Yes | Yes | No (if never posted) | **Default** — matches font pref / feedback draft patterns; best DX |
| **sessionStorage** | Yes | No | No | Offer as **“Forget when I close this tab”** toggle for cautious users |
| httpOnly cookie | No (JS) | Configurable | **Yes** — browser sends to our origin | **Reject** — expands server blast radius; invites proxying every request with their key |
| Server session / Redis | N/A | Yes | **Yes** | **Reject** — we become key custodian |

**Threat model (honest):**

1. **XSS on this origin** can read localStorage and exfiltrate the key. Mitigations: keep CSP tight, avoid `dangerouslySetInnerHTML` / untrusted MDX scripts, treat any XSS as credential-loss. Same class of risk as any SPA that stores API tokens client-side.
2. **Shared machine**: last-4 display + Clear; document “Clear when done on a shared computer.”
3. **Our backend compromise**: irrelevant for user keys **if** we never receive them. Do not log request bodies that might contain keys; do not add “validate key” Server Actions that echo the key.
4. **Supply-chain / malicious extension**: out of scope; same as any localStorage secret.
5. **TfL ToS / quota**: user’s responsibility; UI links portal T&Cs briefly.

**Storage shape** (illustrative):

```ts
// localStorage key: "tfl-user-api-credentials" (versioned)
type StoredUserTflCredentials = {
  v: 1;
  appKey: string;
  appId?: string; // optional legacy; omit → sentinel at runtime
  persist: "local" | "session";
  savedAt: number; // Date.now() only in client effects — never in RSC shell
};
```

Mirror the `FontPreferenceProvider` hydration pattern: default “empty” on SSR, read storage in `useEffect` / `startTransition` to avoid hydration mismatch and Cache Components time pitfalls.

## 6. Client injection path (without breaking Open Code)

### Layering

```text
Sidebar UI  →  UserTflCredentialsProvider (site chrome)
                    ↓
           useUserTflCredentials()
                    ↓
           createBrowserTflClient(creds)   // docs/site helper only
                    ↓
           Demo loaders / client adapters  // still pass `data` into boards
                    ↓
           TubeStatusBoard / ArrivalsBoard / …  // unchanged props API
```

**Invariant:** Registry / `components/tfl/**` installable surfaces continue to accept normalised `data` (and UI state). Fetching with user keys lives in **docs demos, Blocks, or site helpers** — same rule as today’s `getCachedLineStatuses` vs `TubeStatusBoard`.

### Provider

- Site-only: e.g. `components/docs/user-tfl-credentials-provider.tsx` wrapping docs chrome (or root layout next to `FontPreferenceProvider`).
- API: `{ status: "empty" | "ready"; appKeyMasked; save; clear; persistMode; createClient() }`.
- `createClient()` returns `new TflClient({ appId: stored.appId ?? "browser", appKey: stored.appKey })` **only in the browser**. Never import this into `"use cache"` modules.

### Demo adapter (not a global fetch monkey-patch)

Prefer an explicit helper over wrapping `fetch`:

```ts
// lib/tfl/browser-demo-client.ts — SITE ONLY, not registry
export function getDemoArrivals(stopPointId: string, client: TflClient) {
  return client.stopPoint.getArrivals({ stopPointIds: [stopPointId], sortBy: "timeToStation" });
}
```

Client demos:

```tsx
const { status, createClient } = useUserTflCredentials();
useEffect(() => {
  if (status !== "ready") {
    // fallback: existing Server Action (site key) OR show CTA to add key
    return;
  }
  const client = createClient();
  void getDemoArrivals(stopId, client).then(/* setState → <ArrivalsBoard data={…} /> */);
}, [status, stopId]);
```

**Fallback policy when empty:** keep current Server Action / cached RSC behaviour so demos work without a key (site quota). When ready, **prefer** browser client and **skip** the Server Action for that demo so quota moves to the user.

Do **not** pass user keys into Server Actions “for convenience.”

### What about registry `LiveArrivalsBoard` / `BusArrivals`?

Those helpers currently import site Server Actions. Options for later PRs:

1. **Docs demos first** — fork behaviour only under `components/docs/demos/*` (lowest risk).
2. **Deprecate fetch-inside registry helpers** further toward props-only (already partially documented); user-key path accelerates that cleanup.
3. Avoid teaching consumers to paste keys into published components.

## 7. What stays on site credentials vs user overwrite

| Surface | v1 behaviour |
|--------|----------------|
| Homepage proof (status, week-ahead, home arrivals, cycle hire) | **Site** — shared cache, PPR/`"use cache"`, no per-visitor key |
| Server-rendered docs demos (`TubeStatusBoardDemo`, cycle-hire RSC demo, line-strip live section) | **Site** unless a follow-up adds an optional client refresh strip |
| Arrivals / bus interactive demos that already poll from the client | **User key when set**, else site Server Action |
| Explorer pages | **Site** in v1 (RSC + cache); optional later “live with my key” client panels |
| Registry install docs / code snippets | Continue showing **consumer env** `TFL_APP_ID` / `TFL_APP_KEY` — unrelated to sidebar paste |
| Feedback, stats, registry CDN | Unrelated |

**Overwrite** means: for opted-in **client** demos only, replace the site Server Action hop with browser `tfl-ts`. It does **not** mean rewriting `getTflClient()` or injecting into `"use cache"`.

## 8. Proposed PR split (this epic only)

Merge order — each PR shippable alone; stop after any PR if priorities shift.

| PR | Title focus | Delivers | Depends on |
|----|-------------|----------|------------|
| **0** | Design doc (this) | Shared agreement | — |
| **1** | Storage + provider + sidebar UI | Save/clear/mask; local vs session; no demo behaviour change yet | 0 |
| **2** | Browser demo client adapter | `createBrowserTflClient` / `browser-demo-client` helpers; unit tests for storage parse + sentinel `appId` | 1 |
| **3** | Wire arrivals-family demos | Docs arrivals + bus demos: user key → direct TfL; empty → Server Action; sidebar CTA copy | 2 |
| **4** | Docs copy | Short Get started / arrivals page note; `.env.example` comment that sidebar keys ≠ server env | 1+ (can parallel 3) |

### Explicitly later / other epics (not this sequence)

- Client refresh for Tube status demo.
- Explorer live panels.
- Upstream `tfl-ts` “appKey-only” constructor.
- Removing Server Actions from registry `LiveArrivalsBoard` / `BusArrivals` entirely.

### Relative to other WIP

- Independent of cycle-hire map polish, registry colour builds, feedback email.
- Do not block component `v*` releases: this is **web app chrome** (`web-v*`), not registry payloads.
- Avoid merging PR 3 while a large arrivals-board layout PR is in flight on the same demo files — sequence after or rebase carefully.

## 9. Files likely touched (implementation)

**PR 1 — UI + storage**

- `components/docs/docs-sidebar.tsx` — footer slot
- `components/docs/user-tfl-credentials-dialog.tsx` (new)
- `components/docs/user-tfl-credentials-provider.tsx` (new)
- `lib/tfl/user-credentials-storage.ts` (new) — read/write/clear, no React
- `app/layout.tsx` or docs chrome provider tree — mount provider
- Possibly `components/ui/dialog` / existing Base UI patterns only

**PR 2 — adapter**

- `lib/tfl/browser-demo-client.ts` (new)
- `lib/tfl/user-credentials-storage.test.ts` (new)

**PR 3 — wire demos**

- `components/docs/demos/arrivals-board-demo.tsx`
- `components/docs/demos/bus-arrivals-board-demo.tsx`
- Optionally docs-only wrapper replacing `LiveArrivalsBoard` usage; **avoid** changing published registry behaviour until intentional

**PR 4 — copy**

- Relevant MDX under docs arrivals / get-started
- `.env.example` comment clarifying site env vs browser paste

**Do not touch for this epic**

- `lib/tfl/client.ts` site env path (except comments)
- `"use cache"` data modules
- Frozen IA docs (unless a one-line cross-link under §11 is explicitly approved)
- Registry JSON / `pnpm registry:build` (unless a later PR deprecates fetch-inside helpers)

## 10. Risks

| Risk | Mitigation |
|------|------------|
| XSS exfiltrates localStorage key | CSP, no key in URLs, document risk; session-only option |
| Accidental Server Action that accepts `appKey` | Code review checklist; lint/grep for `appKey` in `"use server"` files |
| Demo dual-path complexity (site vs user) | Single helper `loadDemoArrivals({ mode })`; tests for both branches |
| Users think homepage uses their key | Explicit UX copy + filled-state helper text |
| `tfl-ts` requires `appId` | Sentinel `appId`; track upstream fix |
| CORS regression on some verbs | Feature-detect or catch network errors; fall back to site action + message |
| Quota confusion / 429 | Surface TfL error message; link portal |
| Teaching consumers to put keys in client bundles of production apps | Docs: “docs site convenience only; production apps keep keys server-side” |

## 11. Decision checklist (approve before PR 1)

- [ ] Persist default = **localStorage**, with session-only toggle
- [ ] Keys **never** posted to our origin (no validate endpoint)
- [ ] Direct browser → `api.tfl.gov.uk` when key present
- [ ] Published components stay props-only
- [ ] Site `"use cache"` / homepage stay on site env
- [ ] First wired surfaces = arrivals-family docs demos
- [ ] Design lives at `docs/tfl-user-credentials-design.md` until implemented; then fold a short “How demos fetch” note into Get started and archive or mark this doc Implemented

## 12. Open questions for human review

1. Should empty-state demos keep using the **site** Server Action (recommended), or require a key for interactive polling to protect site quota?
2. Is a header entry on non-docs routes (Blocks/Tools) needed in v1, or sidebar-only?
3. Optional: soft rate-limit / pause polling when tab is hidden (`document.visibilityState`) — product polish, not storage design.
