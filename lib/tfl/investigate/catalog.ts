/**
 * Cross-line junction catalogue: every non-trivial vertex, grouped by
 * degree then type. Used by the Drawing the line gallery.
 */

import { analyzeLine } from "./analyze-line"
import { CATALOG_TYPE_LABEL, CATALOG_TYPE_RANK } from "./decomposition"
import { INVESTIGATION_LINE_IDS } from "./raw-data"
import type { CataloguedJunction, JunctionCatalogGroup } from "./types"

export const catalogAllJunctions = (): CataloguedJunction[] => {
  const items: CataloguedJunction[] = []
  for (const lineId of INVESTIGATION_LINE_IDS) {
    const analysis = analyzeLine(lineId)
    if (!analysis) continue
    for (const junction of analysis.junctions) {
      items.push({ lineId, lineName: analysis.lineName, junction })
    }
  }
  return items
}

const byStationName = (left: CataloguedJunction, right: CataloguedJunction): number => {
  const name = left.junction.station.name.localeCompare(right.junction.station.name)
  if (name !== 0) return name
  return left.lineName.localeCompare(right.lineName)
}

export const groupCataloguedJunctions = (
  items: readonly CataloguedJunction[]
): JunctionCatalogGroup[] => {
  const buckets = new Map<string, JunctionCatalogGroup>()
  for (const item of items) {
    const { degree, archetype } = item.junction
    const key = `${degree}:${archetype}`
    const existing = buckets.get(key)
    if (existing) {
      existing.items.push(item)
      continue
    }
    buckets.set(key, {
      degree,
      archetype,
      title: `Degree ${degree} · ${CATALOG_TYPE_LABEL[archetype]}`,
      items: [item],
    })
  }
  return [...buckets.values()]
    .map((group) => ({ ...group, items: [...group.items].sort(byStationName) }))
    .sort(
      (left, right) =>
        left.degree - right.degree ||
        CATALOG_TYPE_RANK[left.archetype] - CATALOG_TYPE_RANK[right.archetype]
    )
}
