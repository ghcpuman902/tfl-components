import type { ReactNode } from "react";
import { DocsReadableWidth } from "@/components/docs/docs-readable-width";

type SiteProsePageProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export const SiteProsePage = ({
  title,
  description,
  children,
}: SiteProsePageProps) => (
  <DocsReadableWidth>
    <article className="space-y-8">
      <header>
        <h1 className="tfl-title text-3xl text-foreground">{title}</h1>
        <p className="mt-2 max-w-prose text-lg text-muted-foreground">
          {description}
        </p>
      </header>
      <div className="max-w-prose space-y-8 text-sm text-muted-foreground">
        {children}
      </div>
    </article>
  </DocsReadableWidth>
);
