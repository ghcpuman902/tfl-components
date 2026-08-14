import type { Metadata } from "next";
import Link from "next/link";
import { DocsPageHeader } from "@/components/docs/docs-page-header";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";
import { SyntaxHighlightedCode } from "@/components/docs/syntax-highlighted-code";
import { getDocsEntry } from "@/lib/docs-catalog";
import { TFL_BRAND_LINKS } from "@/lib/tfl/brand";

const TFL_KEY_SNIPPET = `TFL_APP_KEY=your-primary-key`;

export const metadata: Metadata = {
  title: "Introduction",
  description:
    "A free TfL key, one component, and an optional typeface — that is the path to the same look.",
};

const TFL_API_PORTAL = "https://api-portal.tfl.gov.uk/";

const ExternalTextLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <a
    href={href}
    className="text-foreground underline underline-offset-4"
    target="_blank"
    rel="noopener noreferrer"
  >
    {children}
  </a>
);

export default function DocsIntroductionPage() {
  const entry = getDocsEntry("introduction")!;

  return (
    <DocsReadableWidth>
      <article className="space-y-14">
        <DocsPageHeader entry={entry} />

        <section className="space-y-3">
          <p className="max-w-prose text-muted-foreground">
            The boards on this site are not a sealed npm UI package and not a
            theme you drop on an existing app. They are source you copy, then
            feed with TfL data. The path to the same look is short: get a free
            API key, install the one component you need, and decide whether
            type matters enough to change. That is the whole sequence.
          </p>
        </section>

        <section className="space-y-3">
          <h2 id="get-a-key" className="text-lg font-semibold">
            Get a TfL key
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Live boards talk to the Unified API. Registration on the{" "}
            <ExternalTextLink href={TFL_API_PORTAL}>
              TfL API portal
            </ExternalTextLink>{" "}
            is free. Subscribe to{" "}
            <strong className="font-medium text-foreground">
              500 Requests per min
            </strong>
            , then copy a key from Profile (Show). Either the primary or the
            secondary key works.{" "}
            <code className="text-xs">app_id</code> has not been required since
            2021.
          </p>
          <p className="max-w-prose text-muted-foreground">
            In your app, keep the key on the server:
          </p>
          <SyntaxHighlightedCode
            code={TFL_KEY_SNIPPET}
            language="bash"
            wrapperClassName="mt-0 mb-0"
          />
          <p className="max-w-prose text-muted-foreground">
            Without a key the components still render. They just need fixture
            or cached rows. The key is what makes a board live.{" "}
            <ExternalTextLink href="https://www.npmjs.com/package/tfl-ts">
              tfl-ts
            </ExternalTextLink>{" "}
            is the client that turns those calls into the normalised shapes the
            boards expect.
          </p>
        </section>

        <section className="space-y-3">
          <h2 id="install-one-component" className="text-lg font-semibold">
            Install one component
          </h2>
          <p className="max-w-prose text-muted-foreground">
            There is no command that installs the whole library. Each board is
            its own registry item, because most projects only need one surface
            — arrivals at a stop, a status wall, a cycle-hire map.
          </p>
          <p className="max-w-prose text-muted-foreground">
            Open{" "}
            <Link
              href="/docs/components"
              className="text-foreground underline underline-offset-4"
            >
              Components
            </Link>
            , pick the board you actually want, and run the shadcn add URL on
            that page. The CLI copies source into your repo. Colour tokens,
            badges, and helpers arrive as dependencies of that item. You own
            the files afterwards.
          </p>
          <p className="max-w-prose text-muted-foreground">
            Fetching stays in your app. The board takes normalised data as
            props. If the CLI skips a file, injects CSS you did not expect, or
            the board looks empty after install, that detail lives on{" "}
            <Link
              href="/docs/installation"
              className="text-foreground underline underline-offset-4"
            >
              Troubleshoot
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 id="optional-type" className="text-lg font-semibold">
            Optional: choose a typeface
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Components inherit the font from the host. Skip this step and the
            boards still work — they sit in whatever type your app already
            uses. The Johnston look is a separate decision, not a prerequisite.
          </p>
          <p className="max-w-prose text-muted-foreground">
            <Link
              href="/docs/typography"
              className="text-foreground underline underline-offset-4"
            >
              Hammersmith One
            </Link>{" "}
            is the free default and is close enough for most interfaces.
            Official Johnston needs a licence through{" "}
            <ExternalTextLink href={TFL_BRAND_LINKS.fontRequests}>
              TfL font requests
            </ExternalTextLink>
            . P22 Underground is a closer commercial stand-in if you already
            have Adobe Fonts. Installing a component grants none of those
            rights — see{" "}
            <Link
              href="/docs/tfl-licensing"
              className="text-foreground underline underline-offset-4"
            >
              Licensing and brand use
            </Link>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 id="that-is-the-look" className="text-lg font-semibold">
            That is the look
          </h2>
          <p className="max-w-prose text-muted-foreground">
            A key, one board, and an optional font. Line colours and diagram
            geometry travel with the component. You do not need a design-system
            install, and you do not need every board in the catalogue.
          </p>
        </section>

        <section className="space-y-3 border-t border-border pt-8">
          <h2 id="hosted-url" className="text-lg font-semibold">
            If you do not want to host an app
          </h2>
          <p className="max-w-prose text-muted-foreground">
            A hosted{" "}
            <Link
              href="/board"
              className="text-foreground underline underline-offset-4"
            >
              Board
            </Link>{" "}
            is in beta for the cases where the deploy is the unwanted part. You
            open a URL on this site in a fullscreen browser. Your TfL key and
            the stop id live in the hash fragment — never sent to our servers —
            and the page calls TfL from the client and keeps one station’s
            arrivals plus Tube status up to date. No Next app, no registry
            install — a kiosk, a spare monitor, or a tab you leave running.
          </p>
          <p className="max-w-prose text-muted-foreground">
            The self-hosted path above still leaves you with source you can
            edit. Use Board when you only need the look on a screen.
          </p>
        </section>
      </article>
    </DocsReadableWidth>
  );
}
