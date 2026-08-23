import { methodNotAllowed } from "@/lib/agent/api-response"
import { getPublicCatalog } from "@/lib/agent/site-catalog"

export function GET() {
  return Response.json(getPublicCatalog(), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  })
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Origin": "*",
      Allow: "GET, HEAD, OPTIONS",
    },
  })
}

export const POST = () => methodNotAllowed(["GET"])
export const PUT = POST
export const PATCH = POST
export const DELETE = POST
