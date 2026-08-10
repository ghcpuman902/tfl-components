"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TfLRoundel } from "@/components/tfl/brand/tfl-roundel";
import { DocsSearch } from "@/components/docs/docs-search";

type AppChromeProps = {
  children: React.ReactNode;
};

/** Editorial home shell (no docs sidebar); docs shell everywhere else. */
export const AppChrome = ({ children }: AppChromeProps) => {
  const pathname = usePathname();
  const isHome = pathname === "/";

  if (isHome) {
    return (
      <div className="flex min-h-svh flex-col">
        <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:gap-4 md:px-6">
          <Link
            href="/"
            className="flex min-w-0 shrink-0 items-center gap-2"
            aria-label="tfl-components home"
          >
            <TfLRoundel className="size-5 shrink-0" />
            <span className="truncate text-sm font-medium text-foreground">
              tfl-components
            </span>
          </Link>
          <div className="mx-auto hidden min-w-0 max-w-sm flex-1 sm:block md:max-w-md">
            <DocsSearch variant="header" />
          </div>
          <nav
            className="ml-auto flex shrink-0 items-center gap-3 text-sm"
            aria-label="Secondary"
          >
            <Link
              href="/installation"
              className="text-muted-foreground hover:text-foreground"
            >
              Install
            </Link>
            <Link
              href="/interfaces"
              className="font-medium text-foreground hover:opacity-80"
            >
              Docs
            </Link>
            <a
              href="https://github.com/ghcpuman902/tfl-components"
              className="text-muted-foreground hover:text-foreground"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </nav>
        </header>
        <div className="border-b border-border px-4 py-2 sm:hidden">
          <DocsSearch variant="header" />
        </div>
        <main className="mx-auto w-full min-w-0 max-w-full flex-1 px-0 py-0">
          {children}
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <SidebarProvider open>
      <DocsSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="border-b border-border px-4 py-2 md:hidden">
          <DocsSearch variant="mobile" />
        </div>
        <main className="mx-auto w-full min-w-0 max-w-full flex-1 px-4 py-6">
          {children}
        </main>
        <SiteFooter />
      </SidebarInset>
    </SidebarProvider>
  );
};
