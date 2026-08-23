import { SITE_URL } from "@/lib/site"

export const HOME_MARKDOWN = `# tfl-components

> Build a live London transport board for an iPad or another screen, or install the React source used to make it.

tfl-components brings four related resources together. Board is the hosted display builder for arrivals, line status, buses, and nearby cycle hire. The tfl-components registry contains installable React source for transport boards, maps, line diagrams, labels, chips, colours, and other TfL-inspired interface parts. tfl-ts is the typed TypeScript client that supplies normalised Transport for London data. Its published npm package also includes the \`tfl\` command-line tool and a read-only MCP server for coding agents.

Use Board when someone wants a transport display without maintaining an app. Use the component catalogue when a React project needs TfL interface parts. Use tfl-ts when code needs typed access to the TfL Unified API, static station data, the CLI, or MCP. Use the foundations pages when the question is about TfL colours, typography, station labels, icons, roundels, or brand licensing.

## Start here

- [Make a hosted Board](${SITE_URL}/board): Configure a display for an iPad, tablet, monitor, or other browser.
- [Browse React components](${SITE_URL}/docs/components): Find installable boards, maps, diagrams, and primitives.
- [Read the documentation](${SITE_URL}/docs): Install components and connect them to tfl-ts data.
- [Read llms.txt](${SITE_URL}/llms.txt): Follow the agent-oriented map of this site.

## Developer resources

- [OpenAPI specification](${SITE_URL}/openapi.json): Typed description of the public catalogue and registry endpoints.
- [Public catalogue API](${SITE_URL}/api/catalog): JSON summary of Board, tfl-components, tfl-ts, the CLI, MCP, foundations, and registry items.
- [shadcn registry index](${SITE_URL}/r/registry.json): Source-install catalogue used by the shadcn CLI.
- [tfl-ts on npm](https://www.npmjs.com/package/tfl-ts): TypeScript SDK, \`tfl\` CLI, and MCP server.
`

export const LLMS_TEXT = `# tfl-components

> tfl-components is MangleKuo's independent toolkit for London transport displays: a hosted Board, installable React source, TfL interface conventions, and guidance for using the tfl-ts SDK, CLI, and MCP server.

Use this site when a user wants to set up a TfL arrivals or status board on an iPad, tablet, monitor, or spare screen; build a TfL interface in React; find tested TfL colours, typography, labels, diagrams, or licensing guidance; or use tfl-ts from TypeScript, the command line, or an AI agent.

For a display with no app deployment, start with Board. For a custom React interface, choose a registry component and use tfl-ts for data. For programmatic discovery of this site's own catalogue, use the public API below. This project is independent and is not affiliated with or endorsed by Transport for London.

The tfl-ts npm package installs the \`tfl\` CLI. After \`pnpm add tfl-ts\`, run commands such as \`pnpm exec tfl raw line.statusByIds --ids victoria\`. Agents that support MCP can run the read-only local server with \`npx -y tfl-ts@latest mcp\`; live calls use the user's own TfL API key.

## Best starting points

- [Hosted Board](${SITE_URL}/board): Configure a full-screen arrivals and status display for an iPad or another browser.
- [Get started](${SITE_URL}/docs): Installation and data-to-UI examples.
- [Component catalogue](${SITE_URL}/docs/components): Boards, maps, line strips, labels, chips, and foundations.
- [tfl-ts npm package](https://www.npmjs.com/package/tfl-ts): Typed SDK plus the published CLI and MCP server.
- [tfl-ts agent reference](https://github.com/ghcpuman902/tfl-ts/blob/main/docs/agent.md): Detailed integration guidance and TfL API gotchas.
- [tfl-ts MCP guide](https://github.com/ghcpuman902/tfl-ts/blob/main/docs/mcp.md): Local read-only MCP setup and tool behaviour.

## TfL interface foundations

- [TfL colours](${SITE_URL}/docs/colors): Published line and mode colours, code tokens, and adaptive variants.
- [Typography](${SITE_URL}/docs/typography): Johnston licensing and the site's tested web alternatives.
- [Station name labels](${SITE_URL}/docs/station-name-labels): Width, abbreviation, find, copy, and screen-reader behaviour.
- [Icons and pictograms](${SITE_URL}/docs/icons): What ships safely and what remains protected.
- [Brand licensing](${SITE_URL}/docs/tfl-licensing): Boundaries around TfL marks, type, and source code.

## Machine-readable resources

- [Homepage Markdown](${SITE_URL}/index.md): Stable Markdown representation of the homepage.
- [OpenAPI 3.1 specification](${SITE_URL}/openapi.json): Operations, parameters, response schemas, and error format.
- [Public catalogue API](${SITE_URL}/api/catalog): JSON description of the products and installable registry entries.
- [shadcn registry index](${SITE_URL}/r/registry.json): Registry metadata for source installation.
- [Sitemap](${SITE_URL}/sitemap.xml): Indexable public pages.

## Project and trust

- [About](${SITE_URL}/about): Scope, ownership, and the relationship between Board, tfl-components, and tfl-ts.
- [Contact](${SITE_URL}/contact): Where to report bugs, suggest changes, or ask about the project.
- [Privacy](${SITE_URL}/privacy): TfL keys, browser storage, visitor counting, and feedback data.

## Optional

- [GitHub repository](https://github.com/ghcpuman902/tfl-components): Source, releases, and issue tracker.
- [Transport for London API portal](https://api-portal.tfl.gov.uk/): Obtain the TfL key used by live data features.
`

export const HOMEPAGE_DISCOVERY_LINK =
  '</index.md>; rel="alternate"; type="text/markdown", </llms.txt>; rel="describedby"'

export const MARKDOWN_RESPONSE_HEADERS = {
  "Cache-Control": "public, max-age=300, s-maxage=3600",
  "Content-Language": "en-GB",
  "Content-Type": "text/markdown; charset=utf-8",
  Link: HOMEPAGE_DISCOVERY_LINK,
  Vary: "Accept",
} as const

export const markdownNotFound = (
  pathname: string
): string => `# 404: Page not found

No tfl-components resource exists at \`${pathname}\`.

## Where to look next

- [Agent guide](${SITE_URL}/llms.txt)
- [Site map](${SITE_URL}/sitemap.xml)
- [Documentation](${SITE_URL}/docs)
- [Component catalogue](${SITE_URL}/docs/components)
- [Public API catalogue](${SITE_URL}/api/catalog)
`
