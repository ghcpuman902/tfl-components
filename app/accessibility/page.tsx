import type { Metadata } from "next";
import Link from "next/link";
import { SiteProsePage } from "@/components/site-prose-page";
import { FEEDBACK_TO } from "@/lib/feedback/constants";
import { SITE_INDEPENDENCE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "Keyboard access, contrast, reduced motion, and how to report a problem.",
};

export default function AccessibilityPage() {
  return (
    <SiteProsePage
      title="Accessibility"
      description="Designed with keyboard access, readable contrast, reduced-motion support, and screen-reader-friendly structure. Accessibility testing is ongoing, and feedback is welcome."
    >
      <p>{SITE_INDEPENDENCE}</p>

      <section className="space-y-2">
        <h2 id="tested" className="text-lg font-semibold text-foreground">
          What has been tested
        </h2>
        <p>
          Keyboard use on primary navigation, docs search, the Board station
          search, and theme control. Contrast against the site chrome tokens in
          light and dark themes. Station names keep a full accessible name when
          the painted label wraps or abbreviates. The homepage slideshow stops
          under <code className="text-xs">prefers-reduced-motion</code>.
        </p>
        <p>
          There is no documented WCAG conformance claim. No formal audit has
          been recorded yet.
        </p>
      </section>

      <section className="space-y-2">
        <h2 id="browsers" className="text-lg font-semibold text-foreground">
          Browsers and assistive technology
        </h2>
        <p>
          Development happens in current Safari and Chromium on macOS. Screen
          reader coverage is incomplete. VoiceOver is used occasionally. NVDA,
          JAWS, and mobile screen readers have not been part of a recorded test
          pass.
        </p>
      </section>

      <section className="space-y-2">
        <h2
          id="limitations"
          className="text-lg font-semibold text-foreground"
        >
          Known limitations
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            The Board preview iframe is a crop on small screens. Use Open full
            display.
          </li>
          <li>
            Map surfaces depend on MapLibre. Some map controls are harder to
            use from the keyboard than the rest of the site.
          </li>
          <li>
            Live arrivals update in place. That can be noisy for screen reader
            users if a board is left focused.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 id="report" className="text-lg font-semibold text-foreground">
          Report a problem
        </h2>
        <p>
          Use the site feedback control, or email{" "}
          <a
            href={`mailto:${FEEDBACK_TO}`}
            className="text-foreground underline underline-offset-4"
          >
            {FEEDBACK_TO}
          </a>
          . Include the page URL, the browser, and the assistive technology if
          you use one.
        </p>
        <p>
          The aim is to widen coverage over time, not to freeze the current
          bar.
        </p>
        <p>
          Related component notes live on{" "}
          <Link
            href="/docs/station-name-labels#accessibility"
            className="text-foreground underline underline-offset-4"
          >
            Station name labels
          </Link>
          .
        </p>
      </section>
    </SiteProsePage>
  );
}
