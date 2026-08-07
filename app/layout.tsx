import { Geist_Mono, Hammersmith_One } from "next/font/google"
import type { Metadata } from "next"

import "./globals.css"
import { SiteHeader } from "@/components/site-header"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const hammersmith = Hammersmith_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: {
    default: "tfl-components",
    template: "%s · tfl-components",
  },
  description:
    "Open React components for London transport boards, powered by tfl-ts.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        hammersmith.variable,
      )}
    >
      <body>
        <ThemeProvider>
          <TooltipProvider>
            <div className="min-h-svh">
              <SiteHeader />
              <main className="mx-auto w-full max-w-5xl px-4 py-6">
                {children}
              </main>
            </div>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
