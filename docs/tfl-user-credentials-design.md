# Design: user TfL API credentials

Status: **implemented** (stages 0–6).  
Audience: implementers and reviewers.  
Branch / epic: `docs/tfl-user-credentials-design` → implementation landed in app chrome + arrivals demos.  
CSP remains a separately tracked hardening ticket (not claimed as a mitigation here).

## 1. Problem

This site’s live demos and server caches call the TfL Unified API with a **site** key (`TFL_APP_KEY` in server env via `getTflClient()`). That is correct for shared proof surfaces (homepage, cached status, Explorer).

Developers exploring the docs may want **their own** portal subscription key so that:

- interactive / high-churn demos (arrivals polling, nearby bus search) bill against **their** quota, not ours;
- they can verify “my key works” before installing Open Code into their app;
- rate-limit pressure on the shared site key stays bounded.

Product architecture already names this acquisition mode: *developer credentials for live experimentation* ([product-architecture.md](./product-architecture.md) §11), distinct from site cache, fixtures, and consumer-app `tfl-ts`.

## 2. Current state (investigation summary)

### Credentials model

| Concept | Today in this repo | TfL portal |
|--------|--------------------|------------|
| TfL API key | `TFL_APP_KEY` → `app_key` query param | Profile → **Primary key** or **Secondary key** after subscribing to **500 Requests per min**. Append as `app_key`. Either portal key works. |
| `app_id` | Not used. `tfl-ts` ≥ 2.6.2 is appKey-only. | Unused since **Jan 2021**. Not shown in new-user UI. |

`lib/tfl/client.ts` builds a server-only `TflClient` from env. There is **no** browser credential store and **no** `/api/tfl` proxy. Site API routes are stats, registry, and feedback only.

`tfl-ts` ≥ 2.6.2 takes `{ appKey }` only.

### Who fetches today

| Surface | Path | Credentials |
|--------|------|-------------|
| Homepage panels, Tube status demo, cycle-hire demo, week-ahead, line spines | `"use cache"` helpers → `getTflClient()` | Site env |
| Explorer lines/routes | RSC + `"use cache"` | Site env |
| Arrivals board demos, `LiveArrivalsBoard` | Client poll → **Server Action** `getStopArrivalsAction` | Site env |
| `BusArrivals` registry helper | Client → Server Actions in `lib/tfl/actions.ts` | Site env |
| Published boards (`TubeStatusBoard`, `ArrivalsBoard`, cycle-hire surfaces) | **Props only** — no fetch | N/A (Open Code) |

Interactive demos already run in the browser but **delegate** network to Server Actions, so every poll uses the site key until a user key is present.

### Site chrome

- Docs shell: `components/docs/app-chrome.tsx` → `DocsSidebar` when pathname is `/docs` or `/explore`.
- Footer today: `SidebarFooter` with `FeedbackDialog` + version link (`components/docs/docs-sidebar.tsx`).
- **All routes** share `SiteHeader` (home, docs, Blocks, Tools). Credential entry lives in the docs/explore **sidebar footer** only (homepage / Blocks / Tools do not show it).

### CORS (verified 2026-08)

`GET https://api.tfl.gov.uk/...` returns `access-control-allow-origin: *`. Browser → TfL with the user’s `app_key` is **viable**. Historical “you must proxy” advice is outdated for simple GETs. Design assumes direct client calls; a same-origin relay remains a **fallback** only if CORS regresses on some endpoints.

## 3. Goals / non-goals

### Goals

1. Docs/explore sidebar affordance to paste / clear a user **TfL API key** (`app_key`).
2. Persist in the browser (localStorage default; optional session-only) without teaching bad Open Code habits.
3. When set, **eligible client demos** call TfL with the user’s key (quota on their subscription). No silent fallback to the site key on failure.
4. Keep published registry components on **data-as-props**; do not bake credentials into installable source.
5. Keys **must never** pass through our origin (Server Actions, route handlers, logs, analytics, query strings, rendered HTML, diagnostics, error reporting). **J9 exception:** the hosted Board may carry the key in the **hash fragment** (`/board/view#key=…`) — hashes are not sent to the server — and must keep it in memory only (never localStorage, never query).

### Non-goals (v1)

- Replacing site env credentials for homepage / `"use cache"` boards.
- Publishing a credential manager as a registry item.
- Multi-user accounts, OAuth, or TfL portal SSO.
- Encrypting keys at rest beyond “browser storage + never send to our origin”.
- Claiming the key is safe from same-origin XSS.
- Shipping a Content Security Policy as part of this epic (tracked separately — see §5).
- Making every Server Action accept a client-supplied key (would put keys on our server every call).
- Prefilling the real credentials UI from a development environment variable (lab-only; removed when the lab goes).

## 4. UX — docs sidebar

### Placement

**Docs/explore only:** `DocsSidebar` `SidebarFooter`, above Feedback + version. Not in the global header (homepage / Blocks / Tools do not need the control up front).

```
┌─────────────────────────────┐
│ … nav …                     │
├─────────────────────────────┤
│ ○ Add TfL API key        ›  │  ← empty state
│ ● Key ·•••9bdf           ›  │  ← filled state (masked)
│ Feedback          v0.5.0    │
└─────────────────────────────┘
```

Collapsed offcanvas: same control remains in the drawer footer.

### Empty state

- Label: **Add TfL API key**.
- Opens a small dialog (pattern: `FeedbackDialog` — Dialog, not an always-expanded form).
- Copy (short):
  - Subscribe to **500 Requests per min** on [api-portal.tfl.gov.uk](https://api-portal.tfl.gov.uk/), then Profile / Show.
  - Stored **only in this browser**; never sent to tfl.manglekuo.com.
  - Used for **live demos that run in your browser**; homepage and cached boards still use the site key.
- Single password-style field: **TfL API key**.
- Persist toggle: **Keep in this browser** (default) / **Forget when I close this tab**.
- Muted helper (not the headline): *On the portal you’ll see two keys (Primary and Secondary); either works. `app_id` has been unused since Jan 2021.*
- Do not mention a removed pair, “legacy”, or “we used to ask for both.”
- Actions: **Save**, **Cancel**. Soft shape warning (hex-ish / 32+ chars); then one browser request to TfL to confirm the key before saving as ready. No server-side validation endpoint.

### Filled state

- Compact status: **Your key** + last 4 characters (never full key in the label).
- Dialog: **Replace**, **Clear**, link to portal, one-line reminder of which demos use it.
- Optional toast on save: “Live demos will use your key.”

### Demo status pill

Migrated demos show a small pill: **Shared demo data** (site key / Server Action path) vs **Using your key** (browser → TfL).

### Discoverability

- First-visit: no modal interrupt. Rely on sidebar footer + a one-line callout on interactive demos.
- J22 / J23 primary nav stays Docs · Components · Explorer · Labs · Board on desktop (`Docs · Board · More` on mobile); the docs-sidebar key control is chrome, not a nav item. Board keys can travel in the URL hash or be saved on this browser.

### Hidden tabs

Polling demos pause while `document.visibilityState === "hidden"` and refresh immediately when the tab becomes visible again.

### Explorer

Explorer under `/docs/explorer` is organised around **Points** and **Lines** (Kind → Domain). There is a single panel per domain — no Browse/Find tabs.

- **Site-cached (free):** bundled geography, station catalogues, featured seed lists, and **on-demand** line route + status snapshots keyed by path (`/docs/explorer/lines/…/{id}/{dir}`). First request fills `"use cache"`; later navigations reuse it. Local filtering over already-loaded data never spends visitor quota. Stop sequences are not visitor-key gated.
- **Search / Locate / live arrivals:** use the visitor’s TfL API key for remote search, SMS-code lookup, geolocation nearby queries, non-seed arrivals / occupancy, and Refresh. Calls go browser → `api.tfl.gov.uk` via `createBrowserTflClient`. Invalid or rate-limited keys produce translated errors with **no** silent site-key fallback.
- Typing never spends quota — only Search / Enter / Locate / Refresh, and automatic live preview once a key is present, do.
- When a visitor key is present, the inspector loads live preview automatically (one-shot, with Refresh). No polling in Explorer.
- Legacy `/explore/lines`, `/explore/routes`, and `/explore/bus-stops` redirect into equivalent path URLs. Legacy `?kind=&domain=&id=&dir=` on `/docs/explorer` 308s to the path. Legacy `?tab=` is ignored.

The **key-required gate** (`UserTflKeyRequired` / `useRequireUserTflKey`) and submit-time gating in find adapters prompt for a key only when the visitor initiates a live request. Site-cached directories and line routes stay anonymous.

## 5. Persistence + threat model

### Recommendation: `localStorage` (default), optional session-only

| Option | XSS can read? | Survives tab close? | Hits our server? | Verdict |
|--------|---------------|---------------------|------------------|---------|
| **localStorage** | Yes | Yes | No (if never posted) | **Default** — best DX |
| **sessionStorage** | Yes | No | No | Offer as **“Forget when I close this tab”** |
| httpOnly cookie | No (JS) | Configurable | **Yes** | **Reject** |
| Server session / Redis | N/A | Yes | **Yes** | **Reject** |

**Threat model (honest):**

1. **XSS on this origin** can read localStorage/sessionStorage and exfiltrate the key. Neither option is safe from same-origin XSS. This is an **explicit product tradeoff** required for direct browser-to-TfL requests. Do not claim otherwise.
2. **Content Security Policy** is a separately tracked hardening ticket, not part of this epic. The repo has no CSP today; adding one needs nonce plumbing for the layout FOUC script, font hosts, MapLibre, and related allow-lists. This design must not claim CSP mitigates XSS until that ships.
3. **Shared machine**: last-4 display + Clear; document “Clear when done on a shared computer.”
4. **Our backend compromise**: irrelevant for user keys **if** we never receive them. Do not log request bodies that might contain keys; do not add “validate key” Server Actions.
5. **Supply-chain / malicious extension**: out of scope; same as any localStorage secret.
6. **TfL ToS / quota**: user’s responsibility; UI links the portal briefly.
7. **Open source repo**: no personal or real credential may enter source, fixtures, snapshots, logs, screenshots, or tests.

**Storage shape:**

```ts
// Storage key: "tfl-user-api-key.v1"
type StoredUserTflCredentials = {
  v: 1;
  appKey: string;
  persist: "local" | "session";
  savedAt: number; // Date.now() only in client effects — never in RSC shell
};
```

Writing to `local` clears `session` and vice versa so only one slot is active. Mirror the `FontPreferenceProvider` hydration pattern: default “empty” on SSR, read storage in `useEffect` / `startTransition`.

## 6. Client injection path (without breaking Open Code)

### Layering

```text
Sidebar UI  →  UserTflCredentialsProvider (site chrome)
                              ↓
                     useUserTflCredentials()
                              ↓
                     createBrowserTflClient(appKey)   // site helper only
                              ↓
                     Demo loaders / dual-path hooks   // still pass `data` into boards
                              ↓
                     TubeStatusBoard / ArrivalsBoard / …  // unchanged props API
```

**Invariant:** Registry / `components/tfl/**` installable surfaces continue to accept normalised `data`. Fetching with user keys lives in **docs demos, Blocks, or site helpers**.

### Data path

- **No user key:** existing cached data or server-side site-key path (Server Actions / `"use cache"`).
- **User key present:** browser request directly to `api.tfl.gov.uk`.
- **User key fails:** visible user-key error; **no** automatic site-key fallback.
- **Registry component:** receives `data` as props in every case.

### Provider API (site-only)

```ts
{
  status: "empty" | "validating" | "ready" | "invalid";
  appKeyMasked: string | null;
  persistMode: "local" | "session";
  error: TranslatedTflError | null;
  save: (appKey: string, persist: "local" | "session") => Promise<void>;
  clear: () => void;
  getAppKey: () => string | null; // browser-only; never logged
  markInvalid: (error: TranslatedTflError) => void;
}
```

Validate on Save with a lightweight browser request (e.g. tube status). Do not re-validate on every page load; reactively mark invalid on 401/429 from real demo requests.

Do **not** pass user keys into Server Actions.

### Registry `LiveArrivalsBoard` / `BusArrivals`

Out of scope for this epic to change registry JSON or fetch-inside helpers. Docs demos migrate first under `components/docs/demos/*`.

## 7. What stays on site credentials vs user overwrite

| Surface | Behaviour |
|--------|-----------|
| Homepage proof (status, week-ahead, home arrivals, cycle hire) | **Site** — shared cache; independent of user credentials |
| Server-rendered docs demos (Tube status, cycle-hire RSC, line-strip) | **Site** unless a later family PR adds a client refresh strip |
| Arrivals / bus interactive demos that already poll from the client | **User key when ready**, else site Server Action |
| Explorer directories, featured seeds, line route + status snapshots | **Site** — `"use cache"`, on-demand by path; not build-time fan-out |
| Explorer Search / Locate / non-seed arrivals / occupancy / Refresh | **User key** (browser → TfL); auto-preview when key is present; gate Search/Locate on initiate |
| Registry install docs / code snippets | Consumer env `TFL_APP_KEY` — unrelated to browser paste |
| Feedback, stats, registry CDN | Unrelated |

## 8. Implementation stages

| Stage | Title | Delivers |
|-------|-------|----------|
| **0** | Design doc (this) | Shared agreement |
| **1** | Storage + provider + dialog + sidebar trigger | Save/clear/validate; no demo behaviour change |
| **2** | Dual-path polling hook + `"use server"` appKey guard | Visibility pause/resume; cancellation; CI grep |
| **3** | Wire arrivals-family docs demos | User key → direct TfL; empty → Server Action; status pill |
| **4** | Docs copy | Get started / arrivals note; browser key ≠ server env |
| **5** | Remaining families + Explorer | By API family; Explorer site-cached routes + keyed Search/Locate / arrivals |
| **6** | Remove browser-fetch lab | Delete `/temp/tfl-browser-fetch` and its dev-only env prefill |

### Explicitly later / other epics

- Content Security Policy (site-wide hardening).
- Client refresh for Tube status demo (as its own family PR under Stage 5).
- Deprecating Server Actions from registry `LiveArrivalsBoard` / `BusArrivals`.
- Geomap work, registry JSON releases, unrelated component releases.

## 9. Files (implementation)

**Stage 1**

- `lib/tfl/user-credentials-storage.ts`, `redact-secrets.ts`, `browser-tfl-client.ts`, `tfl-error-translation.ts`
- `components/user-tfl-credentials-provider.tsx`, `user-tfl-credentials-dialog.tsx`, `user-tfl-credentials-trigger.tsx`
- `components/docs/docs-sidebar.tsx`, `app/layout.tsx`

**Stage 2**

- `hooks/use-dual-path-arrivals.ts`
- `scripts/check-no-server-appkey.ts`

**Stage 3**

- `components/docs/demos/rail-arrivals-board-demo.tsx`
- `components/docs/demos/bus-arrivals-board-demo.tsx`

**Stage 4**

- Arrivals / installation MDX; `.env.example` comment

**Stage 5**

- Explorer Points/Lines shell at `/docs/explorer` with cached seed results and keyed Search/Locate
- `TfLPointPicker` (site-owned), domain find adapters, entity inspector
- Gate primitive retained for submit-time keyed ops; cached seed stays anonymous

**Stage 6**

- Delete `app/temp/tfl-browser-fetch/**`

**Do not touch for this epic**

- `lib/tfl/client.ts` site env path (except comments)
- `"use cache"` data modules / homepage
- Frozen IA docs
- Registry JSON / `pnpm registry:build`

## 10. Risks

| Risk | Mitigation |
|------|------------|
| XSS exfiltrates browser-stored key | Honest docs; session-only option; separate CSP ticket; no key in URLs we control |
| Accidental Server Action that accepts `appKey` | `scripts/check-no-server-appkey.ts` + review checklist |
| Demo dual-path complexity | Single `useDualPathArrivals` hook; status pill |
| Users think homepage uses their key | Explicit UX copy |
| Quota confusion / 429 | Translated errors; no silent site-key fallback |
| Teaching consumers to put keys in client bundles of production apps | Docs: “docs site convenience only; production apps keep keys server-side” |

## 11. Decision checklist

- [x] Call it a **TfL API key** (dialog explains either portal key works)
- [x] Persist default = **localStorage**, with session-only toggle
- [x] Keys **never** posted to our origin (no validate endpoint)
- [x] Direct browser → `api.tfl.gov.uk` when key present
- [x] Invalid/rate-limited user key → explicit error, no site-key fallback
- [x] Published components stay props-only
- [x] Site `"use cache"` / homepage stay on site env
- [x] Docs/explore sidebar entry only (no global header control)
- [x] Pause polling when tab hidden; refresh on visible
- [x] CSP tracked separately (not claimed as mitigation here)
- [x] First wired surfaces = arrivals-family docs demos
- [x] Explorer: site-cached directories / line routes + keyed Search/Locate / arrivals (visitor key, no site fallback)
- [x] `tfl-ts` ≥ 2.6.2 — no further coordinated release required
