import { redirect } from "next/navigation"
import { mapLegacyRouteStationsRedirect } from "@/lib/tfl/explorer-legacy-redirects"

/**
 * Legacy route → unified Explorer. `instant = false` allows awaiting
 * searchParams outside Suspense so `redirect()` can run in the response.
 */
export const instant = false

type PageProps = {
  searchParams: Promise<{ lineId?: string; direction?: string }>
}

export default async function RouteStationsRedirect({
  searchParams,
}: PageProps) {
  const params = await searchParams
  redirect(mapLegacyRouteStationsRedirect(params.lineId, params.direction))
}
