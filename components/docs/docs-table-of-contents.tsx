"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type TocItem = {
  id: string;
  text: string;
  level: 2 | 3;
};

const MIN_HEADINGS = 2;

const TOC_RAIL_CLASS =
  "sticky top-(--site-hash-scroll-margin) hidden max-h-[calc(100svh-var(--site-hash-scroll-margin)-1rem)] w-48 shrink-0 overflow-y-auto xl:block";

/** Fixed line widths — identity chrome only; no randomness (prerender-safe). */
const TOC_SKELETON_LINE_WIDTHS = ["w-28", "w-36", "w-24", "w-32", "w-[6.5rem]"] as const;

/**
 * Holds the xl right-rail width before headings are known. Always rendered on
 * the server / first paint so the article column does not shift when the TOC
 * hydrates.
 */
const DocsTocSkeleton = () => (
  <>
    <p className="mb-2 text-xs font-medium text-muted-foreground">
      On this page
    </p>
    <ul
      className="space-y-1.5 border-l border-border"
      aria-hidden
    >
      {TOC_SKELETON_LINE_WIDTHS.map((width) => (
        <li key={width} className="pl-3 py-0.5">
          <Skeleton className={cn("h-4", width)} />
        </li>
      ))}
    </ul>
  </>
);

/**
 * Right-rail "On this page" nav. Scans rendered article headings after mount
 * so it works for both MDX and hand-coded JSX sections.
 *
 * The `w-48` rail is reserved from the first paint (skeleton) so swapping in
 * links does not shift the article. After the scan, short pages keep an empty
 * spacer of the same width so the column never collapses.
 */
export const DocsTableOfContents = ({
  className,
}: {
  className?: string;
}) => {
  const pathname = usePathname();
  const [items, setItems] = React.useState<TocItem[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const article = document.querySelector("article");
    if (!article) {
      queueMicrotask(() => {
        setItems([]);
        setReady(true);
      });
      return;
    }

    const headings = Array.from(
      article.querySelectorAll<HTMLElement>("h2[id], h3[id]"),
    );

    const nextItems: TocItem[] = headings
      .map((el) => {
        const level = el.tagName === "H3" ? 3 : 2;
        const text = (el.textContent ?? "").trim();
        const id = el.id;
        if (!id || !text) return null;
        return { id, text, level: level as 2 | 3 };
      })
      .filter((item): item is TocItem => item !== null);

    queueMicrotask(() => {
      setItems(nextItems);
      setActiveId(nextItems[0]?.id ?? null);
      setReady(true);
    });

    if (nextItems.length < MIN_HEADINGS) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              (a.target as HTMLElement).offsetTop -
              (b.target as HTMLElement).offsetTop,
          );
        if (visible[0]?.target instanceof HTMLElement) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        /* Keep in sync with `--site-hash-scroll-margin` (3.5rem @ 16px). */
        rootMargin: "-56px 0px -60% 0px",
        threshold: [0, 1],
      },
    );

    for (const el of headings) observer.observe(el);
    return () => observer.disconnect();
  }, [pathname]);

  const railClassName = cn(TOC_RAIL_CLASS, className);

  if (!ready) {
    return (
      <nav
        aria-busy
        aria-label="On this page"
        className={railClassName}
      >
        <DocsTocSkeleton />
      </nav>
    );
  }

  if (items.length < MIN_HEADINGS) {
    return <div className={railClassName} aria-hidden />;
  }

  return (
    <nav aria-label="On this page" className={railClassName}>
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        On this page
      </p>
      <ul className="space-y-1.5 border-l border-border text-sm">
        {items.map((item) => {
          const active = activeId === item.id;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={cn(
                  "block border-l-2 py-0.5 transition-colors",
                  item.level === 3 ? "pl-4" : "pl-3",
                  active
                    ? "-ml-px border-foreground font-medium text-foreground"
                    : "-ml-px border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
