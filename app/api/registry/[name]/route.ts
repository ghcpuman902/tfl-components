import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import { jsonApiError, methodNotAllowed } from "@/lib/agent/api-response"
import { getRedis } from "@/lib/redis"
import { INSTALL_COUNT_EXCLUDE, STATS_INSTALLS_KEY } from "@/lib/site-stats"

type RouteContext = {
  params: Promise<{ name: string }>
}

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i

const incrementInstalls = async () => {
  const redis = await getRedis()
  if (!redis) return
  try {
    await redis.incr(STATS_INSTALLS_KEY)
  } catch (err) {
    console.error("[registry] install incr failed", err)
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const { name } = await context.params
  if (!NAME_RE.test(name)) {
    return jsonApiError(
      404,
      "REGISTRY_ITEM_NOT_FOUND",
      "No registry item matches that name.",
      "Get valid item names from /api/catalog or /r/registry.json."
    )
  }

  const filePath = path.join(process.cwd(), "public", "r", `${name}.json`)
  let body: string
  try {
    body = await readFile(filePath, "utf8")
  } catch {
    return jsonApiError(
      404,
      "REGISTRY_ITEM_NOT_FOUND",
      `The registry item '${name}' does not exist.`,
      "Get valid item names from /api/catalog or /r/registry.json."
    )
  }

  if (!INSTALL_COUNT_EXCLUDE.has(name)) {
    void incrementInstalls()
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60",
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
