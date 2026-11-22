import { cacheLife, cacheTag } from "next/cache"
import {
  fetchBodsVehicleActivities,
  isBodsConfigured,
  type BodsVehicleActivity,
} from "@/lib/tfl/bods-siri-vm"

export { isBodsConfigured }

const round5 = (n: number) => Math.round(n * 1e5) / 1e5

/**
 * Every TfL bus fix, read once for the whole site and shared across instances.
 * BODS has its own limits, so 15 s fresh means about 4 reads a minute however
 * many people have a bus stop open. A failed read throws and is not cached.
 */
export async function getCachedBodsActivities(): Promise<BodsVehicleActivity[]> {
  "use cache: remote"
  cacheLife({ stale: 15, revalidate: 15, expire: 60 })
  cacheTag("bods-tfl-buses")
  const all = await fetchBodsVehicleActivities({})
  return all.map((a) => ({
    ...a,
    latitude: round5(a.latitude),
    longitude: round5(a.longitude),
  }))
}
