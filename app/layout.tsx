import { ThemeProvider } from "@/components/theme-provider";
import { CodeCopyDelegator } from "@/components/docs/code-copy-delegator";
import { AppChrome } from "@/components/docs/app-chrome";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Geist_Mono, Hammersmith_One } from "next/font/google";
import type { Metadata } from "next";
import { cn } from "@/lib/utils";

import "./globals.css";

const hammersmith = Hammersmith_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-sans",
});

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
      <body>
        <ThemeProvider>
          <CodeCopyDelegator />
          <TooltipProvider>
            <AppChrome>{children}</AppChrome>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
