export type ApiErrorBody = {
  ok: false
  error: {
    code: string
    message: string
    resolution: string
  }
}

export const apiErrorBody = (
  code: string,
  message: string,
  resolution: string
): ApiErrorBody => ({
  ok: false,
  error: { code, message, resolution },
})

export const jsonApiError = (
  status: number,
  code: string,
  message: string,
  resolution: string,
  headers?: HeadersInit
): Response =>
  Response.json(apiErrorBody(code, message, resolution), {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...headers,
    },
  })

export const methodNotAllowed = (allowed: readonly string[]): Response =>
  jsonApiError(
    405,
    "METHOD_NOT_ALLOWED",
    "This endpoint does not support that HTTP method.",
    `Use ${allowed.join(" or ")} instead.`,
    { Allow: allowed.join(", ") }
  )
