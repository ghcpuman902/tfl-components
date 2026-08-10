"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { DocsSearch } from "@/components/docs/docs-search";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

type AppChromeProps = {
  children: React.ReactNode;
};

const isDocsPath = (pathname: string) =>
  pathname === "/docs" ||
  pathname.startsWith("/docs/") ||
  pathname === "/explore" ||
  pathname.startsWith("/explore/");

/** Header-only shell — safe for Suspense fallback (no URL hooks). */
const AppChromeShell = ({
  pathname,
  children,
}: AppChromeProps & { pathname: string }) => {
  const showDocsSidebar = isDocsPath(pathname);

  if (!showDocsSidebar) {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader pathname={pathname} />
        <div className="border-b border-border px-4 py-2 md:hidden">
          <DocsSearch variant="header" />
        </div>
        <main
          className={
            pathname === "/"
              ? "mx-auto w-full min-w-0 max-w-full flex-1 px-0 py-0"
              : "mx-auto w-full min-w-0 max-w-full flex-1 px-4 py-6"
          }
        >
          {children}
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <SidebarProvider open className="flex-col">
      <SiteHeader pathname={pathname} showSidebarTrigger />
      <div className="flex min-h-0 w-full flex-1">
        <DocsSidebar />
        <SidebarInset>
          <div className="border-b border-border px-4 py-2 md:hidden">
            <DocsSearch variant="mobile" />
          </div>
          <div className="mx-auto w-full min-w-0 max-w-full flex-1 px-4 py-6">
            {children}
          </div>
          <SiteFooter />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

/**
 * Pathname is only known at request time for dynamic segments without
 * generateStaticParams — Suspense keeps the static shell prerenderable.
 */
const AppChromeWithPathname = ({ children }: AppChromeProps) => {
  const pathname = usePathname();
  return <AppChromeShell pathname={pathname}>{children}</AppChromeShell>;
};

/** Homepage + Blocks/Tools: header only. Docs: header + sidebar. */
export const AppChrome = ({ children }: AppChromeProps) => (
  <Suspense fallback={<AppChromeShell pathname="">{children}</AppChromeShell>}>
    <AppChromeWithPathname>{children}</AppChromeWithPathname>
  </Suspense>
);
