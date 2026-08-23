import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { FontPreferenceProvider } from "@/components/font-preference-provider"
import { FeedbackDialog } from "@/components/docs/feedback-dialog"
import { TflApiKeyWalkthroughOverlay } from "@/components/tfl-api-key-walkthrough-overlay"
import { UserTflCredentialsDialog } from "@/components/user-tfl-credentials-dialog"
import { UserTflCredentialsProvider } from "@/components/user-tfl-credentials-provider"
import { CodeCopyDelegator } from "@/components/docs/code-copy-delegator"
import { AppChrome } from "@/components/docs/app-chrome"
import { SiteFooter } from "@/components/site-footer"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Geist_Mono, Hammersmith_One } from "next/font/google"
import Script from "next/script"
import type { Metadata, Viewport } from "next"
import { SITE_AUTHOR, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site"
import { fontPreferenceBootScript } from "@/lib/site-font"
import { cn } from "@/lib/utils"

import "./globals.css"

// next/font must own `--font-sans` on the <html> class — Tailwind's
// `@theme inline { --font-sans: var(--font-sans) }` only works when a real
// value is set that way. P22 Underground overrides the same variable under
// `html[data-font="p22"]` (see globals.css). Hammersmith One stays the
// self-hosted fallback and the opt-out face.
const hammersmith = Hammersmith_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-sans",
})

/**
 * Adobe Fonts (Typekit) kit id for P22 Underground, the site default when
 * this is set. Requires your own Adobe Fonts subscription; never hardcoded,
 * see .env.example. Without it, the site stays on Hammersmith One.
 */
const adobeFontsKitId = process.env.NEXT_PUBLIC_ADOBE_FONTS_KIT_ID

/** Apply P22 before paint. Skip Typekit when the visitor chose Hammersmith. */
const fontPreferenceScript = adobeFontsKitId
  ? fontPreferenceBootScript(adobeFontsKitId)
  : null

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(
    URL.canParse(process.env.NEXT_PUBLIC_APP_URL ?? "")
      ? process.env.NEXT_PUBLIC_APP_URL!
      : SITE_URL
  ),
  title: {
    default: "tfl-components",
    template: "%s · tfl-components",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_AUTHOR.name, url: SITE_AUTHOR.url }],
  creator: SITE_AUTHOR.name,
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en-GB"
      suppressHydrationWarning
      className={cn(
        /* Page-level scroll + Baseline scrollbar-gutter:stable (needs overflow ≠ visible). */
        "scrollbar-gutter-stable overflow-y-auto antialiased",
        fontMono.variable,
        "font-sans",
        hammersmith.variable
      )}
    >
      <body>
        {adobeFontsKitId ? (
          <>
            <link rel="preconnect" href="https://use.typekit.net" />
            <link
              rel="preconnect"
              href="https://p.typekit.net"
              crossOrigin="anonymous"
            />
          </>
        ) : null}
        {fontPreferenceScript ? (
          <Script
            id="tfl-font-preference"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{ __html: fontPreferenceScript }}
          />
        ) : null}
        <Analytics />
        <ThemeProvider>
          <FontPreferenceProvider
            adobeFontsConfigured={Boolean(adobeFontsKitId)}
          >
            <UserTflCredentialsProvider>
              <CodeCopyDelegator />
              <TooltipProvider>
                <AppChrome footer={<SiteFooter />}>{children}</AppChrome>
                <UserTflCredentialsDialog />
                <TflApiKeyWalkthroughOverlay />
                <FeedbackDialog />
                <Toaster />
              </TooltipProvider>
            </UserTflCredentialsProvider>
          </FontPreferenceProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
