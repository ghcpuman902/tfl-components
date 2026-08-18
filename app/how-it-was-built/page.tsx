import type { Metadata } from "next";
import Link from "next/link";
import { SiteProsePage } from "@/components/site-prose-page";
import { SITE_INDEPENDENCE } from "@/lib/site";

export const metadata: Metadata = {
  title: "How it was built",
  description:
    "Engineering notes on TfL identifiers, caching, unattended displays, and the Open Code split.",
};

export default function HowItWasBuiltPage() {
  return (
    <SiteProsePage
      title="How it was built"
      description="What this project had to get wrong before the boards could stay honest."
    >
      <p>{SITE_INDEPENDENCE}</p>

      <section className="space-y-2">
        <h2 id="ids" className="text-lg font-semibold text-foreground">
          TfL identifiers
        </h2>
        <p>
          A station name is not an id. Liverpool Street is several StopPoints.
          The Underground one does not carry Elizabeth line arrivals. Polling a
          hub interchange id such as HUBLST returns nothing useful. The Board
          and Explorer therefore resolve sibling StopPoints from the same hub
          tables tfl-ts already ships, instead of asking visitors to learn
          NaPTAN.
        </p>
      </section>

      <section className="space-y-2">
        <h2 id="sources" className="text-lg font-semibold text-foreground">
          Normalising sources
        </h2>
        <p>
          TfL knows which stations a service calls at, and in what order.
          OpenStreetMap knows which metres of track that service runs on. Those
          answers live in different shapes. The geographic map draws simplified
          unique track joined by station membership, not by snapping a station
          onto the nearest line. That join is still unfinished for some
          branches. The data model page says where.
        </p>
      </section>

      <section className="space-y-2">
        <h2 id="platforms" className="text-lg font-semibold text-foreground">
          Platforms and shared track
        </h2>
        <p>
          Circle, Hammersmith &amp; City, and Metropolitan trains share metal
          in places and then don&apos;t. A board that paints every arrival as
          the line in the API field will lie at Victoria and at Baker Street in
          different ways. Shared-platform grouping and shared-track identity
          are separate rules, both derived from topology, not from display
          names.
        </p>
      </section>

      <section className="space-y-2">
        <h2 id="cache" className="text-lg font-semibold text-foreground">
          Caching and quota
        </h2>
        <p>
          The Unified API is free and rate-limited. Public examples on this
          site use a server cache. A personal Board asks for the visitor&apos;s
          key and keeps it in the browser or in the URL hash. Showing the last
          good response after a failed refresh is allowed. Calling that live
          is not.
        </p>
      </section>

      <section className="space-y-2">
        <h2 id="unattended" className="text-lg font-semibold text-foreground">
          Unattended household displays
        </h2>
        <p>
          The hosted Board is for an iPad on a kitchen counter as much as it is
          for a docs demo. Unattended mode advances pages on a timer, keeps
          rank chips stable, and pauses when the tab is hidden. Home-screen
          and wake-from-sleep still need checking. That is why the Board page
          says experimental.
        </p>
      </section>

      <section className="space-y-2">
        <h2 id="a11y" className="text-lg font-semibold text-foreground">
          Accessibility
        </h2>
        <p>
          Station names wrap and abbreviate on a 48px tile. Find, copy, and
          screen readers still need the full name. That constraint produced
          the findable-text primitive, not a CSS truncate. Motion on the
          homepage is optional and has a pause control. There is no WCAG
          certificate behind that work. Details are on{" "}
          <Link
            href="/accessibility"
            className="text-foreground underline underline-offset-4"
          >
            Accessibility
          </Link>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 id="boundary" className="text-lg font-semibold text-foreground">
          Components versus the hosted app
        </h2>
        <p>
          Installable boards take normalised data as props. Fetching, API keys,
          and this website&apos;s chrome stay in the app. shadcn copies source
          into the consumer repo. That split keeps a kitchen display from
          inheriting docs-site machinery, and it keeps MIT from accidentally
          covering photographs and TfL marks. See{" "}
          <Link
            href="/licence"
            className="text-foreground underline underline-offset-4"
          >
            Licence
          </Link>
          .
        </p>
      </section>
    </SiteProsePage>
  );
}
