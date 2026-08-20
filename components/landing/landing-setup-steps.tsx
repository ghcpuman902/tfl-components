const STEPS = [
  {
    title: "Choose the screen",
    body: "This screen, a small screen, or a large one.",
  },
  {
    title: "Pick a stop",
    body: "Use your location, search by name, or follow the network with no stop.",
  },
  {
    title: "Keep the useful services",
    body: "Arrivals at the stop, nearby modes, and extra status lines if you want them.",
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
      Three choices
    </h2>
    <ol className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
      {STEPS.map((step, index) => (
        <li key={step.title} className="min-w-0">
          <p className="text-sm text-muted-foreground">{index + 1}</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">
            {step.title}
          </h3>
          <p className="mt-2 text-muted-foreground">{step.body}</p>
        </li>
      ))}
    </ol>
  </section>
)
