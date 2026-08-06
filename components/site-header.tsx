import Link from "next/link";
import { TrainFrontTunnel } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/status", label: "Status" },
  { href: "/arrivals", label: "Bus arrivals" },
  { href: "/batch-status", label: "Batch status" },
  { href: "/explore", label: "Explore" },
  { href: "/route", label: "Route" },
  { href: "/arrivals/live", label: "Live arrivals" },
  { href: "/line-badge", label: "Line badge" },
] as const;

export const SiteHeader = ({ pathname }: { pathname?: string }) => (
  <header className="border-b border-border bg-background/80 backdrop-blur">
    <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <TrainFrontTunnel className="size-5" aria-hidden />
        <span>tfl-components</span>
      </Link>
      <nav className="flex flex-wrap gap-1" aria-label="Main">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-2.5 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
              pathname === item.href && "bg-muted font-medium text-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  </header>
);
