<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent workflow

See [docs/agent-workflow.md](./docs/agent-workflow.md) for collaboration patterns, branch strategy, and validation steps.

# Design system

See [docs/design-system.md](./docs/design-system.md) for Tailwind and shadcn/ui conventions.

Site favicon is the grey filled placeholder roundel (`app/icon.svg`), not line-colour bars and not the trademarked TfL mark. See [`.cursor/rules/site-favicon.mdc`](./.cursor/rules/site-favicon.mdc).

Arrivals board vertical rhythm (fixed tiles, absolute hairlines, box-border brand bars): [docs/design-system.md](./docs/design-system.md#arrivals-board-rhythm) and [`.cursor/rules/arrivals-board-layout.mdc`](./.cursor/rules/arrivals-board-layout.mdc).

Domain board skeletons (static identity vs live severity, Suspense fallbacks): [docs/coding-style.md](./docs/coding-style.md) (“Domain board skeletons”) and [`.cursor/rules/domain-skeletons.mdc`](./.cursor/rules/domain-skeletons.mdc).

Explorer inspector streaming (optimistic identity, `use(promise)` for route/arrivals/status): [docs/explorer-inspector-streaming.md](./docs/explorer-inspector-streaming.md) and [`.cursor/rules/explorer-inspector-streaming.mdc`](./.cursor/rules/explorer-inspector-streaming.mdc).

Station hubs / arrivals StopPoints (poll the sibling that carries the line, never merge by display name): [`.cursor/rules/station-hubs.mdc`](./.cursor/rules/station-hubs.mdc). Shared-platform arrival grouping: [docs/arrivals-shared-platforms.md](./docs/arrivals-shared-platforms.md). Shared-track Circle / H&C / Met identity: [docs/circle-hc-metropolitan-shared-track.md](./docs/circle-hc-metropolitan-shared-track.md). TfL API gotchas that change fetch or render belong in Interface MDX; the rest stays in the tfl-ts skill.

# Coding style

See [docs/coding-style.md](./docs/coding-style.md) for TypeScript and React patterns.

# Product principles

See [docs/product-principles.md](./docs/product-principles.md) for how to scope work and ship incrementally.

# Product architecture (frozen Stage 1)

- [docs/product-architecture.md](./docs/product-architecture.md) — product model, layers, classification rules
- [docs/TARGET_ARCHITECTURE.md](./docs/TARGET_ARCHITECTURE.md) — top-level and second-level IA
- [docs/page-anatomy.md](./docs/page-anatomy.md) — page-type anatomies

Do not reshape these to match current file placement. See `.cursor/rules/tfl-ia.mdc`.
