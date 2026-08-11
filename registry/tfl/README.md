# TfL components (registry source)

Installable Open Code for TfL boards and primitives. This folder is what the shadcn registry ships; the Next.js docs site around it is separate.

## Install

From any app that uses the shadcn CLI:

```bash
pnpm dlx shadcn@latest add https://tfl.manglekuo.com/r/tube-status-board.json
pnpm dlx shadcn@latest add https://tfl.manglekuo.com/r/arrivals-board.json
pnpm dlx shadcn@latest add https://tfl.manglekuo.com/r/tfl-roundel.json
```

Built payloads live under [`public/r/`](../../public/r/). The catalog is [`registry.json`](../../registry.json) at the repo root.

## Layout

```
registry/tfl/
  brand/       # roundel, line badge
  status/      # tube status board
  arrivals/    # arrivals board, chips, live helper
  cycle-hire/  # map + detail surfaces
  diagram/     # line strips and schematic atoms
```

Copied files land under `components/tfl/…` in the consumer app. Shared helpers used by those files live under `lib/tfl/` when a registry item declares them.

## Releases

Component / registry changes ship on GitHub tags named `vX.Y.Z` (for example `v0.4.0`).

The docs and demo **web app** uses a different track: `web-vX.Y.Z`. Ignore those tags if you only care about installable source.

## Not in this folder

Site chrome, feedback UI, font preference for the docs site, MDX pages, and Vercel app wiring live outside `registry/tfl/`. They are not part of a component install.
