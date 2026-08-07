"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { TfLRoundel } from "@/components/tfl/tfl-roundel";

const NAV = [
  { href: "/", label: "Status" },
  { href: "/arrivals", label: "Bus arrivals" },
  { href: "/explore", label: "Explore" },
  { href: "/route", label: "Route" },
  { href: "/arrivals/live", label: "Live arrivals" },
  { href: "/line-badge", label: "Line badge" },
  { href: "/roundel", label: "Roundel" },
  { href: "/line-diagram", label: "Line diagram" },
] as const;

export const SiteHeader = () => {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <TfLRoundel className="size-5" />
          <span>tfl-components</span>
        </Link>
        <nav className="flex flex-wrap gap-1" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-2.5 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                pathname === item.href &&
                  "bg-muted font-medium text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
};
