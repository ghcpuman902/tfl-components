import Link from "next/link"
import { TEXT_LINK_CLASS } from "@/lib/text-link"

/**
 * Short visible copy under the hero. Server rendered in the static shell
 * (outside the request-time Suspense), so the plain links are in the first
 * HTML for readers, crawlers and agents. Replaces the old SEO disclosure.
 */
export const HomeShortCopy = () => (
  <section className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 px-4 py-10 text-center md:py-12">
    <p className="text-foreground">
      Open it once, add it to your Home Screen and prop it up by the door.
    </p>
    <p className="flex flex-wrap justify-center gap-x-5 gap-y-1">
      <Link href="/board" className={TEXT_LINK_CLASS}>
        Make my Board
      </Link>
      <Link href="/docs/ipad-dashboard" className={TEXT_LINK_CLASS}>
        Set up an iPad
      </Link>
    </p>
    <p className="text-sm text-muted-foreground">
      Building your own? Try the{" "}
      <Link href="/docs/components" className={TEXT_LINK_CLASS}>
        React components
      </Link>{" "}
      or the typed{" "}
      <a
        href="https://www.npmjs.com/package/tfl-ts"
        className={TEXT_LINK_CLASS}
        target="_blank"
        rel="noreferrer"
      >
        tfl-ts
      </a>{" "}
      client.
    </p>
  </section>
)
