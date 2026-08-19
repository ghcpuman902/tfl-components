import type { Metadata } from "next";
import Link from "next/link";
import { SiteProsePage } from "@/components/site-prose-page";
import {
  OPENFREEMAP_BASEMAP_CREDIT,
  OSM_TRANSIT_GEOMETRY_CREDIT,
  TFL_STATION_ENRICHMENT_CREDIT,
} from "@/lib/tfl/geography-credits";
import { SITE_INDEPENDENCE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Data and credits",
  description:
    "TfL, OpenStreetMap, OpenFreeMap, and OpenMapTiles sources used by this project.",
};

const External = ({
  href,
  children,
}: {
  href: string;
  children: string;
}) => (
  <a
    href={href}
    className="text-foreground underline underline-offset-4"
    target="_blank"
    rel="noreferrer"
  >
    {children}
  </a>
);

export default function CreditsPage() {
  return (
    <SiteProsePage
      title="Data and credits"
      description="Sources this project actually uses, with the terms that govern them."
    >
      <p>{SITE_INDEPENDENCE}</p>

      <section className="space-y-2">
        <h2 id="tfl" className="text-lg font-semibold text-foreground">
          Transport for London
        </h2>
        <p>
          Arrivals, status, Explorer identifiers, and Board displays use the
          Unified API through tfl-ts, plus station-data GTFS for hubs and
          platforms.{" "}
          <External href="https://tfl.gov.uk/">Transport for London</External>
          {" "}publishes that data under{" "}
          <External href="https://tfl.gov.uk/info-for/open-data-users/">
            TfL Open Data
          </External>
          . Required wording: Powered by TfL Open Data. Contains OS data ©
          Crown copyright and database rights.
        </p>
        <p>
          Public examples on this site may use the project key with a short
          server cache. A personal Board should use your own key. Stale or
          sample data is labelled when a refresh fails. Line, stop, and route
          metadata is also{" "}
          <Link
            href="/observatory"
            className="text-foreground underline underline-offset-4"
          >
            observed independently
          </Link>
          .
        </p>
        <p>
          Station names mixed into geographic bundles are the same TfL Open
          Data. {TFL_STATION_ENRICHMENT_CREDIT.attribution}.
        </p>
      </section>

      <section className="space-y-2">
        <h2 id="osm" className="text-lg font-semibold text-foreground">
          OpenStreetMap
        </h2>
        <p>
          Geographic maps and line topology draw London transit route geometry
          from{" "}
          <External href={OSM_TRANSIT_GEOMETRY_CREDIT.datasetUrl}>
            OpenStreetMap contributors
          </External>
          , simplified here into unique track. That data is not live arrivals.
          Licence:{" "}
          <External href={OSM_TRANSIT_GEOMETRY_CREDIT.licenceUrl}>
            ODbL 1.0
          </External>
          . {OSM_TRANSIT_GEOMETRY_CREDIT.attribution}.
        </p>
        <p>{OSM_TRANSIT_GEOMETRY_CREDIT.notes}</p>
      </section>

      <section className="space-y-2">
        <h2 id="basemap" className="text-lg font-semibold text-foreground">
          OpenFreeMap and OpenMapTiles
        </h2>
        <p>
          Geographic, cycle-hire, and Explorer maps sit on vector Positron and
          dark styles from{" "}
          <External href="https://openfreemap.org/">OpenFreeMap</External>
          {" "}and{" "}
          <External href="https://openmaptiles.org/license/">
            OpenMapTiles
          </External>
          , with OpenStreetMap data underneath. No API key.{" "}
          {OPENFREEMAP_BASEMAP_CREDIT.attribution}.
        </p>
      </section>

      <p>
        Track geometry origin notes are in the repo at{" "}
        <code className="text-xs">data/geography/ORIGIN.md</code>. Brand limits
        are on{" "}
        <Link
          href="/docs/tfl-licensing"
          className="text-foreground underline underline-offset-4"
        >
          Licensing and brand use
        </Link>
        .
      </p>
    </SiteProsePage>
  );
}
