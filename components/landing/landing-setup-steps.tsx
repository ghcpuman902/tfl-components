import Link from "next/link"

const STEPS = [
  {
    title: "Choose the screen",
    body: "We recommend a layout for the screen you are using.",
    src: "/board/presets/status.png",
    alt: "Network status board preview",
    width: 1170,
    height: 1560,
  },
  {
    title: "Choose a stop",
    body: "Search, use your location, or start without one.",
    src: "/images/catalog/bus-arrivals.png",
    alt: "Bus arrivals board for a chosen stop",
    width: 1560,
    height: 2200,
  },
  {
    title: "Keep what matters",
    body: "We add the useful services. You can remove or change anything.",
    src: "/images/catalog/cycle-hire-docks.png",
    alt: "Cycle hire docks kept as a nearby service",
    width: 1560,
    height: 2200,
  },
] as const

export const LandingSetupSteps = () => (
  <section
    aria-labelledby="landing-setup-heading"
    className="mx-auto w-full max-w-6xl px-4 py-12 md:px-8"
  >
    <h2
      id="landing-setup-heading"
      className="tfl-title text-2xl text-foreground md:text-3xl"
    >
      Pick a stop. The board does the rest.
    </h2>
    <ol className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-3">
      {STEPS.map((step, index) => (
        <li key={step.title} className="min-w-0">
          <p className="text-sm text-muted-foreground">{index + 1}</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">
            {step.title}
          </h3>
          <p className="mt-2 text-muted-foreground">{step.body}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={step.src}
            alt={step.alt}
            width={step.width}
            height={step.height}
            loading="lazy"
            decoding="async"
            className="mt-4 h-auto max-h-40 w-full object-cover object-top"
          />
        </li>
      ))}
    </ol>
    <Link
      href="/board"
      className="mt-8 inline-flex items-center gap-1.5 text-lg text-foreground underline underline-offset-4"
    >
      Make my board →
    </Link>
  </section>
)
