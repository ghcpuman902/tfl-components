const MOSAIC = [
  {
    src: "/images/catalog/tube-rail-status.png",
    alt: "Tube and rail line status, with disruptions listed above good service",
    caption: "Tube and rail status.",
    width: 1560,
    height: 2200,
    span: "md:col-span-7",
    lazy: false,
  },
  {
    src: "/images/catalog/bus-arrivals.png",
    alt: "Bus arrivals at Great Portland Street, grouped by route",
    caption: "Bus arrivals at Great Portland Street.",
    width: 1560,
    height: 2200,
    span: "md:col-span-5",
    lazy: false,
  },
  {
    src: "/images/catalog/cycle-hire-docks.png",
    alt: "Cycle hire dock availability for three nearby docks",
    caption: "Cycle hire docks.",
    width: 1560,
    height: 2200,
    span: "md:col-span-5 md:col-start-2",
    lazy: true,
  },
  {
    src: "/images/catalog/maps-geographic.png",
    alt: "Geographic map of the TfL network",
    caption: "Geographic map.",
    width: 1228,
    height: 768,
    span: "md:col-span-5",
    lazy: true,
  },
] as const

export const LandingProofMosaic = () => (
  <section
    aria-labelledby="landing-mosaic-heading"
    className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8"
  >
    <h2
      id="landing-mosaic-heading"
      className="tfl-title text-2xl text-foreground md:text-3xl"
    >
      Your stop. Your lines. Your screen.
    </h2>
    <p className="mt-2 max-w-prose text-muted-foreground">
      Start with a working board, then keep only what is useful to you.
    </p>
    <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-12 md:items-start md:gap-x-5 md:gap-y-10">
      {MOSAIC.map((tile) => (
        <figure key={tile.src} className={`min-w-0 ${tile.span}`}>
          {/* Native img keeps Display P3 ICC; next/image can strip wide-gamut profiles. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tile.src}
            alt={tile.alt}
            width={tile.width}
            height={tile.height}
            loading={tile.lazy ? "lazy" : "eager"}
            decoding="async"
            className="h-auto w-full bg-background"
          />
          <figcaption className="mt-2 text-sm text-muted-foreground">
            {tile.caption}
          </figcaption>
        </figure>
      ))}
    </div>
  </section>
)
