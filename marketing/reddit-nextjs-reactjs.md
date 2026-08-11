# Reddit — r/nextjs / r/reactjs

**Title:** Open-source London tube status components (official line colours) for Next.js

**Body:**

I got tired of pasting the same TfL status board into projects, so I split the React UI out of my typed client into a small demo + shadcn registry.

Live board: https://tfl.manglekuo.com/status

Copy into your app:

```bash
pnpm dlx shadcn@latest add https://tfl.manglekuo.com/r/tube-status-board.json
```

That pulls the component source (you own it) and installs `tfl-ts` from npm. Put `TFL_APP_ID` / `TFL_APP_KEY` in your server env (free from the TfL API portal).

Also includes a bus arrivals board with geolocation / stop search. Bus rows use route-number chips on purpose. Tube line colours do not belong on buses.

Repo: https://github.com/ghcpuman902/tfl-components  
Client: https://www.npmjs.com/package/tfl-ts

Happy to take feedback on the registry shape or missing boards.
