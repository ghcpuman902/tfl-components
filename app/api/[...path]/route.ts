import { jsonApiError } from "@/lib/agent/api-response"

const notFound = () =>
  jsonApiError(
    404,
    "API_ROUTE_NOT_FOUND",
    "This tfl-components API route does not exist.",
    "Read /openapi.json for supported operations or /api/catalog for the public catalogue."
  )

export const GET = notFound
export const POST = notFound
export const PUT = notFound
export const PATCH = notFound
export const DELETE = notFound
export const OPTIONS = notFound
