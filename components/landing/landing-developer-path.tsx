import Link from "next/link"

const LINKS = [
  { href: "/docs/components", label: "Browse components →" },
  { href: "/docs", label: "Read the component docs →" },
  { href: "/docs/board-url", label: "Board URL specification →" },
] as const

export const LandingDeveloperPath = () => (
  <section
    aria-labelledby="landing-developer-heading"
    className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8"
  >
    <h2
      id="landing-developer-heading"
      className="text-lg font-semibold text-foreground"
    >
      Building something more custom?
    </h2>
    <p className="mt-2 max-w-prose text-muted-foreground">
      These boards are made from the same reusable React components.
    </p>
    <ul className="mt-4 flex flex-col items-start gap-2">
      {LINKS.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className="inline-flex items-center gap-1.5 text-foreground underline underline-offset-4"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  </section>
)
