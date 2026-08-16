import { Suspense } from "react";
import Link from "next/link";
import { GITHUB_REPO } from "@/lib/feedback/constants";
import { getSiteStats } from "@/lib/site-stats";
import { APP_VERSION_LABEL } from "@/lib/version";

const formatCount = (n: number) =>
  new Intl.NumberFormat("en-GB").format(n);

const StatsFallback = () => (
  <p className="text-xs text-muted-foreground" aria-hidden>
    — visitors · — installs · — stars
  </p>
);

const SiteFooterStats = async () => {
  const { visitors, installs, stars } = await getSiteStats();
  // A real zero reads as an unearned metric, not proof — show it only once
  // there's something to point at.
  const showStars = stars !== null && stars > 0;

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
  );
};

export const SiteFooter = () => {
  return (
    <footer className="mt-auto border-t border-border px-4 py-3">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-1 text-center text-sm text-muted-foreground">
        <p>
          Open React components for London transport · press{" "}
          <kbd className="rounded border px-1 text-xs">d</kbd> for dark mode
        </p>
        <Suspense fallback={<StatsFallback />}>
          <SiteFooterStats />
        </Suspense>
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
          {process.env.NODE_ENV === "development" ? (
            <>
              <Link
                href="/tools"
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                Tools
              </Link>
              <span aria-hidden>·</span>
              <Link
                href="/tools/typography"
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                Typography lab
              </Link>
              <span aria-hidden>·</span>
              <Link
                href="/drafts"
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                Drafts
              </Link>
              <span aria-hidden>·</span>
            </>
          ) : null}
          <a
            href={`https://github.com/ghcpuman902/tfl-components/releases/tag/${APP_VERSION_LABEL}`}
            className="underline-offset-4 hover:text-foreground hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {APP_VERSION_LABEL}
          </a>
        </p>
      </div>
    </footer>
  );
};
