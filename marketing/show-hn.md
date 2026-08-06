# Show HN

**Title:** Show HN: tfl-components – London tube status boards you can copy into Next.js

**URL:** https://tfl-components.vercel.app

**First comment (post immediately):**

I maintain tfl-ts, a zero-dependency TypeScript client for the TfL API. Types and the raw client are generated from TfL's OpenAPI snapshot. Friendly wrappers sit on top for status, arrivals, journeys, and so on.

The client is useful but invisible. People click screenshots, not npm badges. So I moved the React boards into a separate repo and ship them as a shadcn registry instead of an npm UI package. You run one `shadcn add` URL, get the source in your app, and `tfl-ts` installs underneath. Your own `TFL_APP_ID` / `TFL_APP_KEY` drive the live calls.

Interesting bits if you care about the plumbing:

- Line colours and severity sorting live in tfl-ts as framework-agnostic helpers. Northern stays brand black in dark mode; contrast is a hard outline, not a white fill.
- Bus boards refuse tube colours on purpose. Route chips only.
- Status pages revalidate around 60s. Arrivals polling is capped to ~15s so you do not hammer TfL.

Repo: https://github.com/ghcpuman902/tfl-components  
Client: https://github.com/ghcpuman902/tfl-ts
