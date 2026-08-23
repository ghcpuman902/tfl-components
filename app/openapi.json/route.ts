import { OPENAPI_DOCUMENT } from "@/lib/agent/openapi"

export function GET() {
  return Response.json(OPENAPI_DOCUMENT, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
      "Content-Type": "application/json; charset=utf-8",
    },
  })
}
