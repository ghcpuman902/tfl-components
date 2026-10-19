import Link from "next/link"
import { GITHUB_REPO } from "@/lib/feedback/constants"
import { SITE_AUTHOR } from "@/lib/site"

const LINK_CLASS =
  "whitespace-nowrap underline-offset-4 [@media(hover:hover)]:hover:text-foreground [@media(hover:hover)]:hover:underline"

/** One quiet line. Hidden on chromeless `/board/view` kiosk screens via AppChrome. */
export const SiteFooter = () => (
  <footer className="mt-auto border-t border-border px-4 py-4">
    <p className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs text-muted-foreground">
      <span className="whitespace-nowrap">Not affiliated with TfL</span>
      <span aria-hidden>·</span>
      <Link href="/about" className={LINK_CLASS}>
        About
      </Link>
      <span aria-hidden>·</span>
      <a
        href={GITHUB_REPO}
        className={LINK_CLASS}
        target="_blank"
        rel="noopener noreferrer"
      >
        GitHub
      </a>
      <span aria-hidden>·</span>
      <a
        href="https://github.com/ghcpuman902/tfl-ts"
        className={LINK_CLASS}
        target="_blank"
        rel="noopener noreferrer"
      >
        Built with tfl-ts
      </a>
      <span aria-hidden>·</span>
      <a
        href={SITE_AUTHOR.coffeeUrl}
        className={LINK_CLASS}
        target="_blank"
        rel="noopener noreferrer"
      >
        Buy me a coffee ☕
      </a>
    </p>
  </footer>
)
