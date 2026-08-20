import Link from "next/link"

export const LandingDeveloperPath = () => (
  <section
    aria-labelledby="landing-developer-heading"
    className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8"
  >
    <h2
      id="landing-developer-heading"
      className="text-lg font-semibold text-foreground"
    >
      Building with the components
    </h2>
    <p className="mt-2 max-w-prose text-muted-foreground">
      Install React components and pass normalised tfl-ts data.{" "}
      <Link
        href="/docs"
        className="text-foreground underline underline-offset-4"
      >
        React component documentation
      </Link>
      .{" "}
      <Link
        href="/docs/board-url"
        className="text-foreground underline underline-offset-4"
      >
        Board URL specification
      </Link>
      .
    </p>
  </section>
)
