/**
 * Tags of the caches that hold slow-changing TfL metadata (routes, line
 * geometry, directories). The daily metadata cron revalidates exactly these.
 * Live arrival, status and vehicle tags are deliberately not here: they expire
 * in seconds on their own. `tfl-route` also covers every `tfl-route-<line>-<dir>`
 * entry, because those caches carry both tags.
 */
export const METADATA_CACHE_TAGS = [
  "tfl-route",
  "tfl-bus-route-geometry",
  "tfl-explorer-bus-lines",
  "tfl-explorer-featured-bus-stops",
  "tfl-explorer-river-piers",
] as const
