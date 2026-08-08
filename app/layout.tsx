import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
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
        "antialiased",
        fontMono.variable,
        "font-sans",
        hammersmith.variable,
      )}
    >
      <body>
        <ThemeProvider>
          <TooltipProvider>
            <SidebarProvider>
              <DocsSidebar />
              <SidebarInset>
                <SiteHeader />
                <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
                  {children}
                </main>
              </SidebarInset>
            </SidebarProvider>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
