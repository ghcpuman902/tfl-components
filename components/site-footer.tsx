import { Suspense, type ReactNode } from "react"
import Link from "next/link"
import { GITHUB_REPO } from "@/lib/feedback/constants"
import { getSiteStats } from "@/lib/site-stats"
import { SITE_AUTHOR, SITE_INDEPENDENCE } from "@/lib/site"
import { APP_VERSION_LABEL } from "@/lib/version"

const COUNT_FORMAT = new Intl.NumberFormat("en-GB")
const formatCount = (n: number) => COUNT_FORMAT.format(n)

const StatsFallback = () => (
  <p className="text-xs text-muted-foreground" aria-hidden>
    — visitors · — installs · — stars
  </p>
)

const SiteFooterStats = async () => {
  const { visitors, installs, stars } = await getSiteStats()
  const showStars = stars !== null && stars > 0

  return (
    <p className="text-xs text-muted-foreground">
      <span>{formatCount(visitors)} visitors</span>
      <span aria-hidden> · </span>
      <span>{formatCount(installs)} installs</span>
      {showStars ? (
        <>
          <span aria-hidden> · </span>
          <a
            href={GITHUB_REPO}
            className="underline-offset-4 hover:text-foreground hover:underline"
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

const FooterLink = ({
  href,
  children,
  external = false,
}: {
  href: string
  children: ReactNode
  external?: boolean
}) => {
  const className = "underline-offset-4 hover:text-foreground hover:underline"
  if (external) {
    return (
      <a href={href} className={className} target="_blank" rel="noreferrer">
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}

export const SiteFooter = () => {
  return (
    <footer className="mt-auto border-t border-border px-4 py-4">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 text-center text-sm text-muted-foreground">
        <p className="max-w-prose">{SITE_INDEPENDENCE}</p>
        <p>
          Designed and built by{" "}
          <a
            href={SITE_AUTHOR.url}
            className="text-foreground underline-offset-4 hover:underline"
            rel="author"
          >
            {SITE_AUTHOR.name}
          </a>
          .
        </p>
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
          {process.env.NODE_ENV === "development" ? (
            <>
              <FooterLink href="/tools">Tools</FooterLink>
              <span aria-hidden>·</span>
              <FooterLink href="/tools/typography">Typography lab</FooterLink>
              <span aria-hidden>·</span>
              <FooterLink href="/drafts">Drafts</FooterLink>
              <span aria-hidden>·</span>
            </>
          ) : null}
          <FooterLink href="/labs">Labs</FooterLink>
          <span aria-hidden>·</span>
          <FooterLink href={GITHUB_REPO} external>
            Source
          </FooterLink>
          <span aria-hidden>·</span>
          <FooterLink href="/licence">Licence</FooterLink>
          <span aria-hidden>·</span>
          <FooterLink href="/credits">Data and credits</FooterLink>
          <span aria-hidden>·</span>
          <FooterLink href="/accessibility">Accessibility</FooterLink>
          <span aria-hidden>·</span>
          <FooterLink href="/privacy">Privacy</FooterLink>
          <span aria-hidden>·</span>
          <FooterLink href="/how-it-was-built">How it was built</FooterLink>
          <span aria-hidden>·</span>
          <FooterLink href="/observatory">TfL metadata</FooterLink>
          <span aria-hidden>·</span>
          <FooterLink
            href={`https://github.com/ghcpuman902/tfl-components/releases/tag/${APP_VERSION_LABEL}`}
            external
          >
            {APP_VERSION_LABEL}
          </FooterLink>
        </p>
        <Suspense fallback={<StatsFallback />}>
          <SiteFooterStats />
        </Suspense>
      </div>
    </footer>
  )
}
