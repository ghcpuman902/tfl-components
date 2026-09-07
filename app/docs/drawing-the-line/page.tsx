import type { Metadata } from "next"
import { Suspense } from "react"
import { DocsPageHeader } from "@/components/docs/docs-page-header"
import { getDocsEntry } from "@/lib/docs-catalog"
import { docsEntryMetadata } from "@/lib/site-metadata"
import { LineAnalysisSection } from "./line-analysis-section"

export const metadata: Metadata = docsEntryMetadata("drawing-the-line")

export default function DocsDrawingTheLinePage() {
  const entry = getDocsEntry("drawing-the-line")!

  return (
    <article className="mx-auto w-full max-w-6xl space-y-10">
      <DocsPageHeader entry={entry} />

      <div className="docs-mdx [&_p+p]:mt-4">
        <p>
          A straight line is easy to draw. Two ends, nothing in between that
          asks a question. In the graph this is a path of degree-2 vertices.
          Every station has one way in and one way out. The stroke can follow
          the order of the stops and be done.
        </p>
        <p>
          Degree 3 is where drawing starts to fail. Three edges meet at a
          point. A branch leaves the trunk, or two arms join, and the vertex
          has to show that without looking like a scribble or a lie. A Y is
          the smallest honest shape. It is also the first shape that needs a
          rule.
        </p>
        <p>
          Above that, the vertex stops being a Y. Four edges can be a
          crossing, or two corridors that share a name and never touch, or a
          diamond where every move is real. Five or six arms at one station
          cannot sit in one ring. Something has to peel away, stagger, or
          split into two nodes.
        </p>
        <p>
          Degree is not enough. The same four edges sit differently in space
          than they do in the movement matrix. A drawing that only listens to
          permitted pairs will put the forbidden ones on the diameters and
          call that a cross. Compass order is one conversion pattern: same-side
          arms stay adjacent. When the matrix itself falls into two through-pairs
          that never meet, the vertex is not a junction at all — it is two
          ordinary lines that share a name. A degree-3 ordinary Y is the same
          fact with a terminus instead of a second through-pair. Both split
          before anything is drawn.
        </p>
      </div>

      <div className="space-y-2 border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">
          This is a diagnostic catalogue, not a map renderer.
        </p>
        <p>
          Everything below is derived directly from TfL&apos;s own Route/Sequence
          data (via <code className="text-xs">tfl-ts</code>&apos;s{" "}
          <code className="text-xs">LINE_STATION_SEQUENCES</code>), independently
          of this site&apos;s existing line-topology and branch-schematic code.
          Adjacency, degree, and the movement matrix come from which stations
          sit back to back in a real ordered route or branch — a shared
          station does not by itself imply a through-service. TfL hub data is
          cross-referenced for identity only, not used to decide expansion or
          splitting. Station coordinates from the geography bundle seed arm
          bearings and distances only; they never create an edge.
        </p>
        <p>
          Not solved here: label placement, octilinear layout, final line
          colours, geographic compaction, or peak/weekend service
          classification beyond what Route/Sequence names expose. The
          decomposition trees are a heuristic candidate to inspect, not a
          final answer — see each junction&apos;s evidence counts.
        </p>
      </div>

      <div className="space-y-3 border border-border p-4 text-sm">
        <h2 id="conversion-patterns" className="text-base font-medium text-foreground">
          Conversion patterns
        </h2>
        <p className="text-muted-foreground">
          The point of this page is to name the weird vertices and the rule
          that turns each one into a drawable shape. Patterns land here as we
          can prove them. Order matters: split on the movement graph first.
          Compass order and same-direction spacing only apply to what is still
          one vertex after that.
        </p>
        <div className="space-y-2">
          <h3 id="pipeline-order" className="text-sm font-medium text-foreground">
            Pipeline: split on movement components first
          </h3>
          <p className="text-muted-foreground">
            Adjacency, then the A–via–B matrix, then the connected components
            of that matrix. If there is more than one component, the station
            name is already several vertices. Each size-2 component is an
            ordinary through-run. Each size-1 component is a terminus. Two
            size-1 components at a degree-2 station are two termini. Bond
            the halves with an interchange and stop. A through-Y or a diamond
            is still one component — do not split those; they go on to compass
            order and lane spacing. Three isolated stubs with no through-pair
            stay one vertex until the source data proves otherwise.
          </p>
        </div>
        <div className="space-y-2">
          <h3 id="compass-order" className="text-sm font-medium text-foreground">
            Compass order, not chord order
          </h3>
          <p className="text-muted-foreground">
            Around a degree-4 vertex, never interleave opposite compass sides
            (N–S–N–S or W–E–W–E). Order the arms by geographic bearing so
            same-side neighbours stay adjacent. A chord diagram that only
            minimises crossings among permitted pairs does the opposite: it
            puts the through-runs on the short turns and the moves that never
            happen on the diameters. That plus-junction is a lie.
          </p>
          <p className="text-muted-foreground">
            The production strip still drops a near-180° bend — the coloured
            arm already means “continues”. The diagnostic drawing keeps those
            through-moves, and draws the unsupported pairs dashed, so the
            matrix is visible on the figure. When two neighbours leave within
            a few degrees of each other they are a same-direction pair: two
            graph edges, one heading. The schematic has to invent a lane
            split; radial length on this page follows real distance so the
            further station sits further out.
          </p>
        </div>
        <div className="space-y-2">
          <h3 id="independent-corridors-h" className="text-sm font-medium text-foreground">
            Independent corridors become an H
          </h3>
          <p className="text-muted-foreground">
            A degree-4 station whose movement graph is two disjoint through-pairs
            is two degree-2 vertices that happen to share a name. Trains run
            Mornington Crescent–Euston–Warren Street, or Camden Town–Euston–King&apos;s
            Cross. They do not run from one pair into the other. Drawing that as
            one ring with four arms lets a forbidden pair sit on a geographic
            diameter and look like a straight through.
          </p>
          <p className="text-muted-foreground">
            The conversion is the printed map&apos;s own device: stretch the name into
            two interchange dots and join them with a bar — an H, or an electric
            tower. Each upright is an ordinary through-run. The bar is a walk,
            not a track. The production strip already splits Euston this way;
            the diagnostic drawing does the same once the matrix says the
            corridors are independent.
          </p>
        </div>
        <div className="space-y-2">
          <h3 id="through-plus-terminus" className="text-sm font-medium text-foreground">
            Through-pair plus stub is the same split
          </h3>
          <p className="text-muted-foreground">
            Edgware Road on the Circle line is degree 3 with one through-pair
            (Baker Street–Paddington H&amp;C) and one isolated stub (Paddington
            towards Bayswater). That stub is not a branch you can ride through —
            trains terminate. Drawing a Y pretends the third arm joins the
            trunk. The conversion is the H with one upright cut short: a
            through-station bonded to a terminus. Acton Main Line is the
            contrast — both Paddingtons through-run from Ealing Broadway, so
            the movement graph is one component and the station stays together.
          </p>
        </div>
        <div className="space-y-2">
          <h3 id="dual-terminus" className="text-sm font-medium text-foreground">
            Two edges and no through-run are two termini
          </h3>
          <p className="text-muted-foreground">
            Hainault is degree 2 with neighbours on both sides and no
            Grange Hill–via–Hainault–Fairlop run in Route/Sequence. The
            loop and the Leytonstone side both terminate here. Drawing one
            stroke through the name pretends they continue. The conversion
            is two terminus rings on a bar — the H with both uprights cut
            short. Heathrow Terminal 4 is the same pattern.
          </p>
        </div>
      </div>

      <Suspense
        fallback={<p className="text-sm text-muted-foreground">Cataloguing junctions…</p>}
      >
        <LineAnalysisSection />
      </Suspense>
    </article>
  )
}
