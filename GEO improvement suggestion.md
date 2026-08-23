# GEO improvement suggestions

## Goal

Make tfl.manglekuo.com understandable when an agent lands on the site while answering questions such as:

- How do I turn an iPad or spare screen into a live TfL arrivals and status board?
- Which React components can I install for a London transport interface?
- What are tfl-ts, the `tfl` CLI, and the tfl-ts MCP server?
- Which TfL colours, type choices, station-label rules, icons, and licensing limits apply to an implementation?

The site contains four related subjects: the hosted Board, the tfl-components React registry, the tfl-ts developer tools, and TfL interface foundations. Search metadata and agent files should name those subjects plainly and show how they relate.

## Audit recommendations by relevance

### 1. Content without JavaScript

Relevant and essential. The audited production homepage sent a painted Suspense fallback with almost no meaningful text in the initial HTML. Put an H1 and at least 500 characters of useful, visible copy outside the request-dependent boundary. The copy should explain Board, tfl-components, tfl-ts, the CLI and MCP, and the foundations pages. Keep the existing landing artwork and interaction.

Verification:

```bash
curl -s https://tfl.manglekuo.com/ > home.html
# Inspect text before running JavaScript. Confirm an H1 and more than 500 useful characters.
```

### 2. Agent-friendly 404s

Relevant. Unknown paths already return HTTP 404. Add recovery links to `/llms.txt`, `/sitemap.xml`, `/docs`, and `/docs/components`. When an unknown top-level path requests `Accept: text/markdown`, return the same 404 status with a short Markdown body and those links.

### 3. OpenAPI specification

Relevant to the site's own public registry and catalogue, not to the TfL Unified API. Publish OpenAPI 3.1 at `/openapi.json` for a read-only catalogue endpoint and registry-item endpoint. State clearly that this site does not proxy TfL's API.

### 4. JSON error responses

Relevant to public endpoints. Use a stable JSON error shape with `code`, `message`, and `resolution`. Add a JSON catch-all under `/api/*`, and return JSON 404 and 405 responses from documented operations. Internal feedback endpoints can retain fields required by the current UI while adding the same structured fields later.

### 5. Markdown content negotiation

Relevant on the homepage. Honour `Accept` q-values between `text/html` and `text/markdown`, return 406 when neither representation is acceptable, and include `Vary: Accept` on both variants. Advertise `/index.md` as the stable Markdown alternate and `/llms.txt` as the description document.

### 6. Developer resource discoverability

Relevant. Publish predictable URLs and repeat the exact product names in headings and metadata:

- `/llms.txt`
- `/index.md`
- `/openapi.json`
- `/api/catalog`
- `/r/registry.json`
- `/docs`
- `/docs/components`
- the tfl-ts npm, CLI, agent-reference, and MCP links

### 7. Public API with reachable endpoints

Partly relevant and mostly present. The shadcn registry is already a public, unauthenticated JSON interface. Add `/api/catalog` so an agent can discover Board, components, foundations, tfl-ts commands, and registry URLs in one response. Do not create a public TfL-data proxy. That would introduce someone else's API quota, credential handling, caching, and service guarantees.

### 8. Brand-name discoverability

Relevant, but code changes only cover the on-site half. Use `tfl-components`, `TfL Components`, `MangleKuo`, and the canonical domain consistently in titles, descriptions, JSON-LD, `llms.txt`, the npm package, and GitHub. Search Console submission, external mentions, launch posts, and links from the tfl-ts package and repository are still required to change rankings.

### 9. CLI tool

Already implemented outside this repository. The tfl-ts npm package exposes the `tfl` binary. This is a discoverability failure, not a missing-product failure. Document commands such as:

```bash
pnpm add tfl-ts
pnpm exec tfl raw line.statusByIds --ids victoria
npx -y tfl-ts@latest mcp
```

Do not publish a second tfl-components CLI unless it gets a distinct job that the shadcn CLI and tfl-ts CLI do not cover.

### 10. JSON-LD structured data

Relevant. Add a JSON-LD graph with `WebSite`, `SoftwareApplication` for Board, `SoftwareSourceCode` for tfl-components, and `Person` for MangleKuo. Include canonical URLs, descriptions, the code repository, programming languages, free pricing for Board, and alternate names.

### 11. Agent instruction and when-to-use guidance

Relevant. `/llms.txt` should state:

- use Board for a display without app deployment;
- use tfl-components for custom React interface source;
- use tfl-ts for typed TfL data, CLI work, or local MCP access;
- use foundations for TfL colours, typography, labels, diagrams, icons, and licensing.

### 12. API schema complexity analysis

Relevant once the small public API is explicit. Every operation needs a unique `operationId`, description, typed parameters, response schemas, and the shared error schema. Keep the API narrow enough that an agent can choose an operation without guessing.

### 13. Function-calling compatibility

Relevant and handled by the same OpenAPI work. Prefer concrete operation names such as `getTflComponentsCatalog` and `getTflComponentsRegistryItem`. Avoid optional parameter bags when a required path parameter is enough.

### 14. Organization schema completeness

Not currently relevant. This is an independent personal open-source project, not a registered organization with a public postal address and business contact point. Publishing an invented organization, address, or phone number would reduce trust. Add Organization schema only if a real entity takes ownership and chooses public contact details.

### 15. Trust anchor pages

Relevant. Privacy already exists. Add About and Contact pages with substantive project-specific copy, link all three from the footer, and include them in the sitemap. About should state ownership, independence from TfL, and the boundary between Board, components, and tfl-ts. Contact should direct component and website issues to this repository, tfl-ts issues to its repository, and official API or brand requests to TfL.

## Metadata model

The homepage title and description should cover the full subject without becoming a keyword list. A useful description is:

> Build a TfL board for an iPad or another screen, or install React components for London transport interfaces with typed tfl-ts data.

Use specific metadata on deeper pages. Board pages should name the hosted display. Component pages should name the React component and its TfL concept. Foundation pages should name the exact convention, such as TfL colours or typography and Johnston licensing. tfl-ts, CLI, and MCP wording should appear on a dedicated developer page or in the documentation introduction as well as in machine-readable files.

## Verification matrix

After deployment, verify the origin rather than only a local component render:

```bash
curl -sS -D - https://tfl.manglekuo.com/ -o home.html
curl -sS -D - -H 'Accept: text/markdown' https://tfl.manglekuo.com/
curl -sS -D - -H 'Accept: text/html;q=1,text/markdown;q=0.5' https://tfl.manglekuo.com/
curl -sS -D - -H 'Accept: application/json' https://tfl.manglekuo.com/
curl -sS -D - https://tfl.manglekuo.com/llms.txt
curl -sS -D - https://tfl.manglekuo.com/openapi.json
curl -sS -D - https://tfl.manglekuo.com/api/catalog
curl -sS -D - https://tfl.manglekuo.com/api/registry/not-a-real-item
curl -sS -D - -H 'Accept: text/markdown' https://tfl.manglekuo.com/not-a-real-page
curl -sS -o /dev/null -w '%{http_code}\n' https://tfl.manglekuo.com/not-a-real-page
```

Expected results:

- raw homepage HTML has an H1 and more than 500 characters of meaningful text;
- Markdown negotiation returns `text/markdown`, `Vary: Accept`, and a Markdown body;
- an unsupported homepage media type returns 406;
- `llms.txt` follows the H1, blockquote, details, then H2 link-list order;
- OpenAPI is valid 3.1 JSON with unique operation IDs and typed schemas;
- API failures are JSON with code, message, and resolution;
- unknown pages remain 404 in HTML and Markdown;
- the homepage contains valid JSON-LD for the real project types;
- About, Contact, and Privacy return 200 and appear in the sitemap.

## Work that still needs product decisions or external access

- Decide whether the public catalogue API is a supported contract or a best-effort discovery feed before promising a stability window.
- Decide whether About or Contact should publish an email address. GitHub issues are enough for now and avoid exposing a private address.
- Add Organization schema only after a real organization and public address exist.
- Use Google Search Console or another webmaster tool to submit the sitemap and inspect indexing. This needs domain access.
- Link the canonical site from the tfl-ts npm readme, GitHub repository descriptions, release posts, and relevant launch material. On-site metadata cannot create external authority by itself.
- Re-run the Ora audit after deployment and keep the raw evidence with the release notes.
