# Local setup

## Requirements

- Node.js 20+ (Node 24 LTS recommended)
- [pnpm](https://pnpm.io/) 11.x

## Install

```bash
pnpm install
```

## Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` as needed. See [env.md](./env.md).

## Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Press `d` to toggle dark mode.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run production server (after build) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript check |
| `pnpm format` | Prettier write |

## Project layout

- `app/` — App Router pages and layouts
- `components/ui/` — shadcn/ui components
- `lib/utils.ts` — `cn()` helper
- `.cursor/rules/` — Cursor agent rules
- `docs/` — setup and workflow documentation

## Upgrading Next.js

```bash
pnpm add next@latest
pnpm add -D eslint-config-next@latest
pnpm build
```

See [agent-workflow.md](./agent-workflow.md) and the [official upgrade guide](https://nextjs.org/docs/app/guides/upgrading).

## Next steps

- [GitHub private repo](./github-private-repo.md) — create remote and push
- [Vercel](./vercel.md) — optional deployment
- [Collaboration](./collaboration-workflow.md) — branches, PRs, previews
