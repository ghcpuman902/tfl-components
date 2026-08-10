"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type TocItem = {
  id: string;
  text: string;
  level: 2 | 3;
};

const MIN_HEADINGS = 2;

/**
 * Right-rail "On this page" nav. Scans rendered article headings after mount
 * so it works for both MDX and hand-coded JSX sections.
 */
export const DocsTableOfContents = ({
  className,
}: {
  className?: string;
}) => {
  const pathname = usePathname();
  const [items, setItems] = React.useState<TocItem[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const article = document.querySelector("article");
    if (!article) {
      setItems([]);
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

    setItems(nextItems);
    setActiveId(nextItems[0]?.id ?? null);

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
        rootMargin: "-80px 0px -60% 0px",
        threshold: [0, 1],
      },
    );

    for (const el of headings) observer.observe(el);
    return () => observer.disconnect();
  }, [pathname]);

  if (items.length < MIN_HEADINGS) return null;

  return (
    <nav
      aria-label="On this page"
      className={cn(
        "sticky top-16 hidden max-h-[calc(100svh-5rem)] w-48 shrink-0 overflow-y-auto xl:block",
        className,
      )}
    >
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
