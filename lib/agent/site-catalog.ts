import { getInstallableEntries } from "@/lib/docs-catalog"
import { REGISTRY_BASE, SITE_DESCRIPTION, SITE_URL } from "@/lib/site"

export const PUBLIC_API_VERSION = "1.0.0"

export const getPublicCatalog = () => ({
  data: {
    name: "tfl-components",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    products: [
      {
        id: "board",
        name: "tfl-components Board",
        kind: "hosted-board",
        url: `${SITE_URL}/board`,
        description:
          "A hosted full-screen London transport display for an iPad, tablet, monitor, or other browser.",
        whenToUse:
          "Use when someone wants a live arrivals and status display without deploying an app.",
      },
      {
        id: "tfl-components",
        name: "tfl-components",
        kind: "react-source-registry",
        url: `${SITE_URL}/docs/components`,
        description:
          "Installable React source for TfL boards, maps, diagrams, labels, chips, and foundations.",
        whenToUse:
          "Use when a React project needs a custom TfL interface whose source should live in the project.",
      },
      {
        id: "tfl-ts",
        name: "tfl-ts",
        kind: "typescript-sdk-cli-mcp",
        url: "https://www.npmjs.com/package/tfl-ts",
        description:
          "Typed TypeScript access to the TfL Unified API, with static station data, a tfl CLI, and a read-only MCP server.",
        whenToUse:
          "Use for typed TfL data, command-line queries, or local agent access through MCP.",
        commands: {
          install: "pnpm add tfl-ts",
          cli: "pnpm exec tfl raw line.statusByIds --ids victoria",
          mcp: "npx -y tfl-ts@latest mcp",
        },
      },
    ],
    foundations: [
      { name: "TfL colours", url: `${SITE_URL}/docs/colors` },
      { name: "Typography", url: `${SITE_URL}/docs/typography` },
      {
        name: "Station name labels",
        url: `${SITE_URL}/docs/station-name-labels`,
      },
      { name: "Icons and pictograms", url: `${SITE_URL}/docs/icons` },
      { name: "Brand licensing", url: `${SITE_URL}/docs/tfl-licensing` },
    ],
    components: getInstallableEntries().map((entry) => ({
      name: entry.registryName!,
      title: entry.title,
      description: entry.description,
      documentationUrl: `${SITE_URL}${entry.href}`,
      registryUrl: entry.registryUrl!,
    })),
    resources: {
      documentation: `${SITE_URL}/docs`,
      llms: `${SITE_URL}/llms.txt`,
      openapi: `${SITE_URL}/openapi.json`,
      registry: `${REGISTRY_BASE}/registry.json`,
      sitemap: `${SITE_URL}/sitemap.xml`,
      source: "https://github.com/ghcpuman902/tfl-components",
    },
  },
  meta: { apiVersion: PUBLIC_API_VERSION },
})

export type PublicCatalog = ReturnType<typeof getPublicCatalog>
