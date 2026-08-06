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

## Preview workflow

1. Push a feature branch to GitHub.
2. Vercel builds a preview URL for the PR.
3. Test UI on the preview; share screenshots in the PR.
4. Merge to `main` for production deployment (if configured).

See [collaboration-workflow.md](./collaboration-workflow.md) for team practices.
