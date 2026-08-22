"use client"

import { Suspense } from "react"
import { usePathname } from "next/navigation"
import { DocsSidebar } from "@/components/docs/docs-sidebar"
import { DocsTableOfContents } from "@/components/docs/docs-table-of-contents"
import { SiteHeader } from "@/components/site-header"
import { VisitBeacon } from "@/components/visit-beacon"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

type AppChromeProps = {
  children: React.ReactNode
  /** Server-rendered footer slot (keeps SiteFooter out of the client bundle). */
  footer: React.ReactNode
}

const isDocsPath = (pathname: string) =>
  pathname === "/docs" ||
  pathname.startsWith("/docs/") ||
  pathname === "/explore" ||
  pathname.startsWith("/explore/")

const isChromelessPath = (pathname: string) =>
  pathname === "/board/view" || pathname.startsWith("/board/view/")

/** Header-only shell — safe for Suspense fallback (no URL hooks). */
const AppChromeShell = ({
  pathname,
  children,
  footer,
}: AppChromeProps & { pathname: string }) => {
  if (isChromelessPath(pathname)) {
    return <main className="min-h-dvh w-full">{children}</main>
  }

  const showDocsSidebar = isDocsPath(pathname)

  if (!showDocsSidebar) {
    // Empty pathname = AppChrome Suspense fallback before usePathname resolves.
    // Prefer home chrome (no main padding) so `/` does not CLS from px-4 → px-0.
    const isHome = pathname === "/" || pathname === ""
    const isLandingHero = pathname === "/temp/landing-hero"
    const isFullBleed = isHome || isLandingHero
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader pathname={pathname || "/"} />
        <main
          className={
            isFullBleed
              ? "mx-auto w-full max-w-full min-w-0 flex-1 px-0 py-0"
              : "mx-auto w-full max-w-full min-w-0 flex-1 px-4 py-6"
          }
        >
          {children}
        </main>
        {footer}
      </div>
    )
  }

  return (
    <SidebarProvider open className="flex-col overflow-x-clip">
      <SiteHeader pathname={pathname} docsNav />
      <div className="flex min-h-0 w-full flex-1">
        <DocsSidebar />
        <SidebarInset>
          <div className="mx-auto flex w-full max-w-full min-w-0 flex-1 gap-8 px-4 py-6 xl:pr-6">
            <div className="min-w-0 flex-1">{children}</div>
            <DocsTableOfContents />
          </div>
          {footer}
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

/**
 * Pathname is only known at request time for dynamic segments without
 * generateStaticParams — Suspense keeps the static shell prerenderable.
 * Children stay in the fallback so the homepage hero can paint in the PPR shell.
 * Dynamic `[slug]` routes need their own `loading.tsx` for `params`.
 */
const AppChromeWithPathname = ({ children, footer }: AppChromeProps) => {
  const pathname = usePathname()
  return (
    <AppChromeShell pathname={pathname} footer={footer}>
      {children}
    </AppChromeShell>
  )
}

/** Homepage + Blocks/Board builder: header only. Docs: header + sidebar. `/board/view`: chromeless. */
export const AppChrome = ({ children, footer }: AppChromeProps) => (
  <>
    <VisitBeacon />
    <Suspense
      fallback={
        <AppChromeShell pathname="" footer={footer}>
          {children}
        </AppChromeShell>
      }
    >
      <AppChromeWithPathname footer={footer}>{children}</AppChromeWithPathname>
    </Suspense>
  </>
)
