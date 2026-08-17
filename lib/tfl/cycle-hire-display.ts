export const CYCLE_HIRE_DISPLAY_DEFAULT_TILES = 2

export const normalizeCycleHireDisplayTiles = (tiles?: number): number => {
  if (tiles == null || !Number.isFinite(tiles)) {
    return CYCLE_HIRE_DISPLAY_DEFAULT_TILES
  }
  return Math.max(1, Math.floor(tiles))
}

/**
 * Split docks into sequential fixed-size pages. The caller fills any spare
 * rows on a short final page so the display keeps its configured height.
 */
export const buildCycleHireDisplayPages = <T>(
  items: readonly T[],
  rowsPerPage: number
): T[][] => {
  const pageSize = Math.max(0, Math.floor(rowsPerPage))
  if (pageSize === 0) return [[]]
  if (items.length === 0) return [[]]

  const pageCount = Math.ceil(items.length / pageSize)
  return Array.from({ length: pageCount }, (_, index) =>
    items.slice(index * pageSize, (index + 1) * pageSize)
  )
}

export const cycleHireDisplayPageId = <T extends { id: string }>(
  page: readonly T[]
): string => page.map((item) => item.id).join("|") || "empty"

/** Keep page membership stable while replacing matching rows with live data. */
export const refreshCycleHireDisplayPage = <T extends { id: string }>(
  page: readonly T[],
  liveItems: readonly T[]
): T[] => {
  const byId = new Map(liveItems.map((item) => [item.id, item]))
  return page.map((item) => byId.get(item.id) ?? item)
}
