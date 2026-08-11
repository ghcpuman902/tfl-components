# Releases

This repo holds two products that version independently.

| Track | Tag pattern | What it covers |
|-------|-------------|----------------|
| Components | `vX.Y.Z` | Installable source under [`registry/tfl/`](../registry/tfl/), built registry JSON in `public/r/`, and the shared `lib/tfl` pieces those items need |
| Web app | `web-vX.Y.Z` | Docs site, demo home, feedback, typography prefs, and other Next.js app chrome |

Consumers who only install via shadcn should follow **component** tags and [`registry/tfl/README.md`](../registry/tfl/README.md). Web tags do not imply a registry bump, and a registry bump does not require a web tag.

Root [`CHANGELOG.md`](../CHANGELOG.md) lists both tracks in separate sections.
