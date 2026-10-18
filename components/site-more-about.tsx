import { Suspense } from "react"
import Link from "next/link"
import { GITHUB_REPO } from "@/lib/feedback/constants"
import { getSiteStats } from "@/lib/site-stats"
import { APP_VERSION_LABEL } from "@/lib/version"

const COUNT_FORMAT = new Intl.NumberFormat("en-GB")
const formatCount = (n: number) => COUNT_FORMAT.format(n)

const LINK_CLASS = "text-foreground underline underline-offset-4"

const StatsFallback = () => (
  <p aria-hidden>— visitors · — installs · — stars</p>
)

const SiteStats = async () => {
  const { visitors, installs, stars } = await getSiteStats()
  const showStars = stars !== null && stars > 0

  return (
    <p>
      <span>{formatCount(visitors)} visitors</span>
      <span aria-hidden> · </span>
      <span>{formatCount(installs)} installs</span>
      {showStars ? (
        <>
          <span aria-hidden> · </span>
          <a
            href={GITHUB_REPO}
            className={LINK_CLASS}
            target="_blank"
            rel="noreferrer"
          >
            {formatCount(stars)} stars
          </a>
        </>
      ) : null}
    </p>
  )
}

/** Links and counters moved out of the site footer. Dev-only links stay dev-only. */
export const SiteMoreAbout = () => (
  <section className="space-y-2">
    <h2 className="text-lg font-semibold text-foreground">
      More about this site
    </h2>
    <p className="flex flex-wrap gap-x-2 gap-y-1">
      <Link href="/credits" className={`${LINK_CLASS} whitespace-nowrap`}>
        Data and credits
      </Link>
      <span aria-hidden>·</span>
      <Link href="/contact" className={`${LINK_CLASS} whitespace-nowrap`}>
        Contact
      </Link>
      <span aria-hidden>·</span>
      <Link href="/observatory" className={`${LINK_CLASS} whitespace-nowrap`}>
        TfL metadata tracker
      </Link>
      <span aria-hidden>·</span>
      <a
        href={`${GITHUB_REPO}/releases/tag/${APP_VERSION_LABEL}`}
        className={`${LINK_CLASS} whitespace-nowrap`}
        target="_blank"
        rel="noreferrer"
      >
        {APP_VERSION_LABEL}
      </a>
    </p>
    {process.env.NODE_ENV === "development" ? (
      <p className="flex flex-wrap gap-x-2 gap-y-1">
        <Link href="/tools" className={`${LINK_CLASS} whitespace-nowrap`}>
          Tools
        </Link>
        <span aria-hidden>·</span>
        <Link
          href="/tools/typography"
          className={`${LINK_CLASS} whitespace-nowrap`}
        >
          Typography lab
        </Link>
        <span aria-hidden>·</span>
        <Link href="/drafts" className={`${LINK_CLASS} whitespace-nowrap`}>
          Drafts
        </Link>
      </p>
    ) : null}
    <Suspense fallback={<StatsFallback />}>
      <SiteStats />
    </Suspense>
  </section>
)
