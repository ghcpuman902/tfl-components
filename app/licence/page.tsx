import type { Metadata } from "next";
import Link from "next/link";
import { SiteProsePage } from "@/components/site-prose-page";
import { GITHUB_REPO } from "@/lib/feedback/constants";
import { SITE_INDEPENDENCE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Licence",
  description:
    "MIT for installable React components. TfL marks and datasets stay under their own terms.",
};

const External = ({
  href,
  children,
}: {
  href: string;
  children: string;
}) => (
  <a
    href={href}
    className="text-foreground underline underline-offset-4"
    target="_blank"
    rel="noreferrer"
  >
    {children}
  </a>
);

export default function LicencePage() {
  return (
    <SiteProsePage
      title="Licence"
      description="You may copy and modify the installable React components under MIT. That grant does not cover TfL marks, maps, photography, or this hosted site."
    >
      <p>{SITE_INDEPENDENCE}</p>

      <section className="space-y-2">
        <h2 id="components" className="text-lg font-semibold text-foreground">
          Reusable component source
        </h2>
        <p>
          Files under{" "}
          <code className="text-xs">registry/tfl/</code> and the{" "}
          <code className="text-xs">lib/tfl</code> helpers those registry items
          declare are MIT. Keep the copyright notice with copied files. The
          licence text is{" "}
          <External href={`${GITHUB_REPO}/blob/main/registry/LICENSE`}>
            registry/LICENSE
          </External>
          .
        </p>
        <p>
          A registry JSON payload lists the files that must travel with a
          component. Install with the shadcn CLI so those helpers come along.
        </p>
      </section>

      <section className="space-y-2">
        <h2 id="app" className="text-lg font-semibold text-foreground">
          Hosted application
        </h2>
        <p>
          The Next.js docs site, Board builder chrome, feedback UI, and other
          app code around the registry are not licensed as MIT by this notice.
          Read them on GitHub. Do not treat a component install as a licence
          for the whole website.
        </p>
      </section>

      <section className="space-y-2">
        <h2 id="other" className="text-lg font-semibold text-foreground">
          Photography, branding, and third parties
        </h2>
        <p>
          Homepage photographs are © MangleKuo unless a caption says otherwise.
          Project branding, including the grey placeholder roundel used as the
          site mark, is not a TfL asset and is not offered for reuse here.
        </p>
        <p>
          TfL names, roundels, maps, and related marks stay TfL&apos;s. Line
          colours used for identification are not a brand licence. See{" "}
          <Link
            href="/docs/tfl-licensing"
            className="text-foreground underline underline-offset-4"
          >
            Licensing and brand use
          </Link>
          .
        </p>
        <p>
          Arrivals, status, and map data follow the provider terms on{" "}
          <Link
            href="/credits"
            className="text-foreground underline underline-offset-4"
          >
            Data and credits
          </Link>
          . MIT does not grant rights to those datasets.
        </p>
      </section>
    </SiteProsePage>
  );
}
