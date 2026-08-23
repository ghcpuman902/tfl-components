import { PUBLIC_API_VERSION } from "@/lib/agent/site-catalog"
import { SITE_URL } from "@/lib/site"

const errorResponse = (description: string) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ApiError" },
    },
  },
})

export const OPENAPI_DOCUMENT = {
  openapi: "3.1.0",
  info: {
    title: "tfl-components public API",
    version: PUBLIC_API_VERSION,
    description:
      "Discover the hosted Board, tfl-components React registry, tfl-ts developer tools, and installable registry items. This API describes this project; it does not proxy the Transport for London Unified API.",
    contact: {
      name: "tfl-components issue tracker",
      url: "https://github.com/ghcpuman902/tfl-components/issues",
    },
    license: {
      name: "Project licensing",
      url: `${SITE_URL}/docs/tfl-licensing`,
    },
  },
  servers: [{ url: SITE_URL, description: "Production" }],
  tags: [
    {
      name: "Discovery",
      description: "Project and developer-resource discovery.",
    },
    {
      name: "Registry",
      description: "Installable shadcn registry items.",
    },
  ],
  paths: {
    "/api/catalog": {
      get: {
        operationId: "getTflComponentsCatalog",
        summary: "Get the public product and component catalogue",
        description:
          "Returns Board, tfl-components, tfl-ts CLI and MCP guidance, TfL interface foundations, installable components, and machine-readable resource links.",
        tags: ["Discovery"],
        responses: {
          "200": {
            description: "The public catalogue.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CatalogResponse" },
              },
            },
          },
          "405": errorResponse("The HTTP method is not supported."),
        },
      },
    },
    "/api/registry/{name}": {
      get: {
        operationId: "getTflComponentsRegistryItem",
        summary: "Get one installable registry item",
        description:
          "Returns a shadcn registry item containing the source files and dependencies for the requested tfl-components item.",
        tags: ["Registry"],
        parameters: [
          {
            name: "name",
            in: "path",
            required: true,
            description:
              "Registry item name, such as rail-arrivals-board, tube-status-board, or tfl-colours.",
            schema: {
              type: "string",
              pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
              examples: ["rail-arrivals-board"],
            },
          },
        ],
        responses: {
          "200": {
            description: "A shadcn registry item.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegistryItem" },
              },
            },
          },
          "404": errorResponse("The registry item does not exist."),
          "405": errorResponse("The HTTP method is not supported."),
        },
      },
    },
  },
  components: {
    schemas: {
      ApiError: {
        type: "object",
        additionalProperties: false,
        required: ["ok", "error"],
        properties: {
          ok: { type: "boolean", const: false },
          error: {
            type: "object",
            additionalProperties: false,
            required: ["code", "message", "resolution"],
            properties: {
              code: {
                type: "string",
                description: "Stable machine-readable error code.",
              },
              message: {
                type: "string",
                description: "Short human-readable explanation.",
              },
              resolution: {
                type: "string",
                description: "Concrete next step that may resolve the error.",
              },
            },
          },
        },
      },
      CatalogLink: {
        type: "object",
        additionalProperties: false,
        required: ["name", "url"],
        properties: {
          name: { type: "string" },
          url: { type: "string", format: "uri" },
        },
      },
      CatalogProduct: {
        type: "object",
        additionalProperties: true,
        required: ["id", "name", "kind", "url", "description", "whenToUse"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          kind: { type: "string" },
          url: { type: "string", format: "uri" },
          description: { type: "string" },
          whenToUse: { type: "string" },
          commands: {
            type: "object",
            additionalProperties: { type: "string" },
          },
        },
      },
      CatalogComponent: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "title",
          "description",
          "documentationUrl",
          "registryUrl",
        ],
        properties: {
          name: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          documentationUrl: { type: "string", format: "uri" },
          registryUrl: { type: "string", format: "uri" },
        },
      },
      CatalogResponse: {
        type: "object",
        additionalProperties: false,
        required: ["data", "meta"],
        properties: {
          data: {
            type: "object",
            additionalProperties: false,
            required: [
              "name",
              "description",
              "url",
              "products",
              "foundations",
              "components",
              "resources",
            ],
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              url: { type: "string", format: "uri" },
              products: {
                type: "array",
                items: { $ref: "#/components/schemas/CatalogProduct" },
              },
              foundations: {
                type: "array",
                items: { $ref: "#/components/schemas/CatalogLink" },
              },
              components: {
                type: "array",
                items: { $ref: "#/components/schemas/CatalogComponent" },
              },
              resources: {
                type: "object",
                additionalProperties: { type: "string", format: "uri" },
              },
            },
          },
          meta: {
            type: "object",
            additionalProperties: false,
            required: ["apiVersion"],
            properties: { apiVersion: { type: "string" } },
          },
        },
      },
      RegistryFile: {
        type: "object",
        additionalProperties: true,
        required: ["path", "type"],
        properties: {
          path: { type: "string" },
          type: { type: "string" },
          target: { type: "string" },
          content: { type: "string" },
        },
      },
      RegistryItem: {
        type: "object",
        additionalProperties: true,
        required: ["name", "type", "files"],
        properties: {
          name: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          type: { type: "string" },
          files: {
            type: "array",
            items: { $ref: "#/components/schemas/RegistryFile" },
          },
          dependencies: { type: "array", items: { type: "string" } },
          registryDependencies: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
  },
} as const
