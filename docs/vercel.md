# Vercel deployment (optional)

Link to Vercel **after** the GitHub repository exists. All steps below are optional until you want hosted previews and production.

## Dashboard (recommended for first setup)

1. Sign in at [vercel.com](https://vercel.com).
2. **Add New Project** → Import your private GitHub repo.
3. Framework preset: **Next.js** (auto-detected).
4. Build command: `pnpm build` (default).
5. Install command: `pnpm install`.
6. Add environment variables from `.env.example` / your secrets.
7. Deploy.

Enable **Preview Deployments** for pull requests (default for GitHub-connected projects).

## Environment variables

Set production and preview env vars in the Vercel project settings. Pull them locally for development:

```bash
vercel link
vercel env pull .env.local
```

`.env.local` is gitignored.

The metadata observatory cron needs `CRON_SECRET` on Production in addition to the existing `REDIS_URL` and `TFL_APP_KEY`. See [env.md](./env.md#metadata-observatory).

## CLI workflow (optional)

```bash
# One-time: link local folder to Vercel project
vercel link

# Pull env vars into .env.local
vercel env pull .env.local

# Deploy preview (branch)
vercel

# Deploy production
vercel --prod
```

Install the CLI if needed: `pnpm add -g vercel@latest`

## Private deployment notes

Store project IDs, team slugs, or tokens in `VERCEL_PRIVATE_NOTES.md` (gitignored) — not in committed docs.

## Web Analytics (landing + Board events)

The app already mounts `@vercel/analytics/next` in the root layout and sends custom events from `lib/analytics/track.ts`. Nothing is recorded until Web Analytics is enabled on the Vercel project.

1. Open the [tfl-components project](https://vercel.com/manglekuo-s-team/tfl-components).
2. **Analytics** → **Web Analytics** → **Enable**.
3. Leave the default script injection off — this repo uses the React `<Analytics />` component, not the Vercel speed/analytics script checkbox.
4. Redeploy Production and the PR preview after enabling (or wait for the next git push).
5. Confirm events under **Analytics → Web Analytics → Custom Events**.

Events this branch emits (never keys, coordinates, raw searches, credentialed URLs, or PII):

| Event | When |
|---|---|
| `landing_exposure` | Homepage paints |
| `landing_hero_interaction` / `landing_zoom_complete` | Room pull-back |
| `landing_cta_click` | Board or docs CTA on the homepage |
| `landing_example_seen` / `landing_example_interaction` | Live board in the room iPad |
| `board_setup_started` / `board_stage_completed` / `board_setup_completed` | Staged `/board` |
| `landing_docs_visit` | `/docs` arrived from `/` |

`landing_example_interaction` includes `time_to_example_interaction_ms` and `board_setup_started` includes `time_to_setup_start_ms`, both elapsed from the current landing exposure.

Events send `variant: "room"`. Page views still need Web Analytics enabled. Custom events will silently no-op if it is off — that is not a render error.

## Flags

`/.well-known/vercel/flags` stays mounted for the Flags Explorer. There is no homepage experiment flag. Missing `FLAGS_SECRET` must not be required for the site to render.

## Preview workflow

1. Push a feature branch to GitHub.
2. Vercel builds a preview URL for the PR.
3. Test UI on the preview; share screenshots in the PR.
4. Merge to `main` for production deployment (if configured).

## Preview client errors (no server log)

A **Ready** Vercel deployment with a white screen or React overlay is a **browser** exception. Runtime / build logs stay clean.

1. Open the preview while signed into Vercel (SSO-protected previews redirect anonymous `curl`).
2. DevTools → **Console**. Copy the first red exception and component stack. That is the source of truth — not Analytics, not Flags.
3. DevTools → **Network**. Confirm the document is `200` and the RSC flight is not a 500.
4. If the overlay says hydration / `useLinkStatus` / `useSidebar`, it is chrome, not TfL data.
5. `/` is the room homepage. `/board` is the staged setup.

Analytics setup does not diagnose a client exception. Enable Web Analytics after the preview paints.

See [collaboration-workflow.md](./collaboration-workflow.md) for team practices.
