# Environment variables

## Files

| File | Committed | Purpose |
|------|-----------|---------|
| `.env.example` | Yes | Documented placeholders for collaborators |
| `.env.local` | No | Local secrets and overrides |
| `.env.*.local` | No | Environment-specific local overrides |

## Local setup

```bash
cp .env.example .env.local
```

Edit `.env.local` with real values. Never commit it.

## Next.js conventions

- `NEXT_PUBLIC_*` — exposed to the browser; use only for non-sensitive public config.
- All other variables — server-only by default in App Router.

## Adding new variables

1. Add a commented placeholder to `.env.example`.
2. Document usage in code or `docs/setup.md` if non-obvious.
3. Add the value in Vercel project settings for preview/production.
4. Pull with `vercel env pull .env.local` when using Vercel CLI.

## Validation (optional)

Use Zod in `lib/env.ts` to validate required env vars at startup when your app grows:

```ts
import { z } from "zod"

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
})

export const env = envSchema.parse(process.env)
```

## Metadata observatory

`/observatory` only reads Redis. Writes happen from `GET /api/cron/tfl-metadata` (`15 4 * * *` in `vercel.json`). Vercel Cron runs on **Production** only and sends `Authorization: Bearer $CRON_SECRET`.

| Variable | Production | Why |
|---|---|---|
| `REDIS_URL` | Required (already used for site stats) | Baseline, lock, history |
| `CRON_SECRET` | Required | Authorise the cron and any manual curl |
| `TFL_APP_KEY` | Required | Unified API reads |
| `RESEND_API_KEY`, `FEEDBACK_FROM`, `FEEDBACK_TO` | Optional | Email only on confirmed **Changed**, **Incomplete**, or **Unavailable** |

Generate a secret once and use the same value locally and on Vercel:

```bash
openssl rand -base64 32
```

Add it to Production (required) and Preview (optional, for manual curls):

```bash
printf '%s' 'PASTE_SECRET_HERE' | vercel env add CRON_SECRET production
printf '%s' 'PASTE_SECRET_HERE' | vercel env add CRON_SECRET preview
```

Do not commit the value. Put it in `.env.local` (or `.env.development.local`) as `CRON_SECRET=…`.

## Vercel Web Analytics and Flags

Web Analytics does not need an extra env var. Enable it on the Vercel project (**Analytics → Web Analytics**) so `@vercel/analytics` custom events from `lib/analytics/track.ts` are stored. See [vercel.md](./vercel.md#web-analytics-landing--board-events).

`FLAGS_SECRET` is optional until you use the Vercel Flags toolbar or encrypted overrides. Generate 32 random bytes as base64url:

```bash
node -e "console.log(crypto.randomBytes(32).toString('base64url'))"
```

Add the same value to Development, Preview, and Production on the Vercel project. A local `.env.local` value is enough for `next dev`; preview/production still need the project env var. Missing `FLAGS_SECRET` must not block the site from rendering.

After Production has `CRON_SECRET`, merge to `main`. The next production deploy picks up the var and registers the cron. Confirm with:

```bash
vercel env ls
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "https://tfl.manglekuo.com/api/cron/tfl-metadata"
```

A matching baseline already in that Redis will show **Current** on `/observatory` immediately. The daily job is then only a re-check.

## Security

- Do not log secrets.
- Do not put API keys in `NEXT_PUBLIC_*` variables.
- Exception: browser map keys for the live vendor examples on
  `/docs/map-geographic`. Set `NEXT_PUBLIC_MAPBOX_TOKEN` (public `pk.*`) and
  `NEXT_PUBLIC_GOOGLE_MAPS_KEY` in `.env.local`, restrict both to
  `http://localhost:3000/*`, enable Maps JavaScript API on the Google key,
  and restart `next dev` after changing them.
- Rotate keys if accidentally committed; use gitignored scratch files for recovery notes.
