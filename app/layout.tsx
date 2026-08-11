import { ThemeProvider } from "@/components/theme-provider";
import { FontPreferenceProvider } from "@/components/font-preference-provider";
import { CodeCopyDelegator } from "@/components/docs/code-copy-delegator";
import { AppChrome } from "@/components/docs/app-chrome";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Geist_Mono, Hammersmith_One } from "next/font/google";
import type { Metadata } from "next";
import { cn } from "@/lib/utils";

import "./globals.css";

// next/font must own `--font-sans` on the <html> class — Tailwind's
// `@theme inline { --font-sans: var(--font-sans) }` only works when a real
// value is set that way. The P22 switch overrides the same variable under
// `html[data-font="p22"]` (see globals.css).
const hammersmith = Hammersmith_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-sans",
});

/**
 * Adobe Fonts (Typekit) kit id for P22 Underground — a closer commercial
 * match to TfL's Johnston than the open Hammersmith One default. Requires
 * your own Adobe Fonts subscription; never hardcoded, see .env.example.
 */
const adobeFontsKitId = process.env.NEXT_PUBLIC_ADOBE_FONTS_KIT_ID;

/** Apply stored font preference before paint to avoid a Hammersmith → P22 flash. */
const fontPreferenceScript = `(function(){try{if(localStorage.getItem("tfl-font-pref")==="p22"){document.documentElement.setAttribute("data-font","p22");document.documentElement.setAttribute("data-tfl-type-profile","johnston-compatible");}}catch(e){}})();`;

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "tfl-components",
    template: "%s · tfl-components",
  },
  description:
    "Open React components for London transport boards, powered by tfl-ts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        /* Page-level scroll + Baseline scrollbar-gutter:stable (needs overflow ≠ visible). */
        "overflow-y-auto scrollbar-gutter-stable antialiased",
        fontMono.variable,
        "font-sans",
        hammersmith.variable,
      )}
    >
      <head>
        {adobeFontsKitId ? (
          <>
            <script
              dangerouslySetInnerHTML={{ __html: fontPreferenceScript }}
            />
            <link
              rel="stylesheet"
              href={`https://use.typekit.net/${adobeFontsKitId}.css`}
              precedence="default"
            />
          </>
        ) : null}
      </head>
      <body>
        <ThemeProvider>
          <FontPreferenceProvider
            adobeFontsConfigured={Boolean(adobeFontsKitId)}
          >
            <CodeCopyDelegator />
            <TooltipProvider>
              <AppChrome>{children}</AppChrome>
              <Toaster />
            </TooltipProvider>
          </FontPreferenceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
