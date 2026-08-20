import { redirect } from "next/navigation"
import { mapLegacyBusStopsRedirect } from "@/lib/tfl/explorer-legacy-redirects"

export default function ExploreBusStopsRedirect() {
  redirect(mapLegacyBusStopsRedirect())
}
