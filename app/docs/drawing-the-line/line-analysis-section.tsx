import { catalogAllJunctions, groupCataloguedJunctions } from "@/lib/tfl/investigate/catalog"
import { JunctionSection } from "./junction-section"

export const LineAnalysisSection = () => {
  const groups = groupCataloguedJunctions(catalogAllJunctions())

  return (
    <section className="space-y-4" aria-labelledby="junctions-heading">
      <h2 id="junctions-heading" className="text-lg font-medium text-foreground">
        Junction catalogue
      </h2>
      <p className="text-sm text-muted-foreground">
        Degree 1 and degree 2 with a through-service are omitted. Solid curve:
        a through-run. Dashed: no A–via–B. A bar between rings is an
        interchange, not track.
      </p>
      <JunctionSection groups={groups} />
    </section>
  )
}
