import { LineBadge } from "@/components/tfl/brand/line-badge"
import { formatStationName } from "@/lib/tfl/diagram-station"
import type { CataloguedJunction, JunctionCatalogGroup } from "@/lib/tfl/investigate/types"
import { LocalGraphSvg } from "./diagnostic-primitives"

const junctionAnchorId = (lineId: string, stationId: string) => `station-${lineId}-${stationId}`

const JunctionCard = ({ item }: { item: CataloguedJunction }) => {
  const { lineId, junction } = item
  const name = formatStationName(junction.station.name)
  return (
    <article
      id={junctionAnchorId(lineId, junction.station.id)}
      className="flex min-w-0 flex-col border border-border"
    >
      <header className="flex items-center justify-between gap-2 px-2.5 py-2">
        <h4 className="min-w-0 truncate text-sm font-medium text-foreground">{name}</h4>
        <LineBadge lineId={lineId} diagram={lineId === "cable-car"} className="shrink-0" />
      </header>
      <div className="aspect-square w-full">
        <LocalGraphSvg lineId={lineId} junction={junction} />
      </div>
    </article>
  )
}

const JunctionGroup = ({ group }: { group: JunctionCatalogGroup }) => {
  const headingId = `type-${group.degree}-${group.archetype}`
  return (
    <section className="space-y-3" aria-labelledby={headingId}>
      <div className="border-b border-border pb-1.5">
        <h3 id={headingId} className="text-base font-medium text-foreground">
          {group.title}
        </h3>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-3">
        {group.items.map((item) => (
          <JunctionCard key={`${item.lineId}-${item.junction.station.id}`} item={item} />
        ))}
      </div>
    </section>
  )
}

export const JunctionSection = ({ groups }: { groups: JunctionCatalogGroup[] }) => {
  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No non-trivial junctions in the cached Route/Sequence set.
      </p>
    )
  }

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <JunctionGroup key={`${group.degree}-${group.archetype}`} group={group} />
      ))}
    </div>
  )
}
