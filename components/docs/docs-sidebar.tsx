"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import {
  getSidebarEntries,
  type DocsEntry,
  type DocsModeMarker,
} from "@/lib/docs-catalog";
import { APP_VERSION_LABEL } from "@/lib/version";
import { TfLRoundel } from "@/components/tfl/brand/tfl-roundel";
import { UNDERGROUND_LINE_COLOURS } from "@/lib/tfl/brand-colours";
import type { RoundelPreset } from "@/lib/tfl/roundel-presets";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const MODE_ROUNDEL_VARIANT: Record<DocsModeMarker, RoundelPreset> = {
  "tube-rail": "underground",
  bus: "buses",
  river: "river",
  cycle: "cycles",
  cable: "cableCar",
  map: "tfl",
};

/** Classic Underground lines for the Colours 5×2 dot matrix (excludes Waterloo & City). */
const COLOURS_DOT_HEXES = Object.values(UNDERGROUND_LINE_COLOURS)
  .slice(0, 10)
  .map((spec) => spec.hex);

const isActive = (pathname: string, entry: DocsEntry) => {
  if (entry.href === "/docs") return pathname === "/docs";
  return pathname === entry.href || pathname.startsWith(`${entry.href}/`);
};

/** Weak marks after Get started labels — sized to match sidebar text, not left-side mode markers. */
const GetStartedAdornment = ({ slug }: { slug: string }) => {
  if (slug === "explore-index") {
    return (
      <Search
        className="size-[1em]! text-sidebar-foreground opacity-40"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        absoluteStrokeWidth={false}
      />
    );
  }

  if (slug === "typography") {
    return (
      <span className="flex items-center text-[1em] font-medium leading-none tracking-normal text-sidebar-foreground">
        <span className="opacity-50">A</span>
        <span className="opacity-50">b</span>
        <span className="opacity-50">c</span>
      </span>
    );
  }

  if (slug === "line-badge") {
    return (
      <span className="flex flex-col gap-0.5" aria-hidden>
        {[0, 5].map((start) => (
          <span key={start} className="flex gap-0.5">
            {COLOURS_DOT_HEXES.slice(start, start + 5).map((hex) => (
              <span
                key={hex}
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: hex }}
              />
            ))}
          </span>
        ))}
      </span>
    );
  }

  if (slug === "tfl-roundel") {
    return (
      <span className="inline-flex size-[1em] opacity-40 [&_svg]:size-full!">
        <TfLRoundel
          text=""
          className="size-[1em]! shrink-0 grayscale"
          aria-hidden
        />
      </span>
    );
  }

  return null;
};

const EntryLabel = ({
  entry,
  adornment,
}: {
  entry: DocsEntry;
  adornment: ReactNode;
}) => (
  <span className="flex min-w-0 flex-1 items-center gap-1.5">
    <span className="truncate">
      {entry.title}
      {entry.comingSoon ? (
        <span className="text-sidebar-foreground/50"> · soon</span>
      ) : null}
    </span>
    {adornment ? (
      <span
        className="pointer-events-none inline-flex shrink-0 items-center"
        aria-hidden
      >
        {adornment}
      </span>
    ) : null}
  </span>
);

const GET_STARTED_ADORNMENT_SLUGS = new Set([
  "explore-index",
  "typography",
  "line-badge",
  "tfl-roundel",
]);

const EntryList = ({
  entries,
  pathname,
  withGetStartedAdornments = false,
}: {
  entries: DocsEntry[];
  pathname: string;
  /** Text-sized marks after Explorer / Typography / Colours / Roundel labels. */
  withGetStartedAdornments?: boolean;
}) => (
  <SidebarMenu>
    {entries.map((entry) => {
      const showAdornment =
        withGetStartedAdornments &&
        GET_STARTED_ADORNMENT_SLUGS.has(entry.slug);

      return (
        <SidebarMenuItem key={entry.slug}>
          <SidebarMenuButton
            render={<Link href={entry.href} />}
            isActive={isActive(pathname, entry)}
            tooltip={entry.title}
          >
            {entry.preferred && entry.modeMarker ? (
              <TfLRoundel
                variant={MODE_ROUNDEL_VARIANT[entry.modeMarker]}
                text=""
                className="size-3.5 shrink-0"
                aria-hidden
              />
            ) : null}
            <EntryLabel
              entry={entry}
              adornment={
                showAdornment ? (
                  <GetStartedAdornment slug={entry.slug} />
                ) : null
              }
            />
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    })}
  </SidebarMenu>
);

/** Split get-started into top (before Components) and bottom (licensing / skills). */
const GET_STARTED_BOTTOM_FROM = 200;

export const DocsSidebar = () => {
  const pathname = usePathname();
  const getStarted = getSidebarEntries("get-started");
  const getStartedTop = getStarted.filter(
    (entry) => entry.sidebarOrder < GET_STARTED_BOTTOM_FROM,
  );
  const getStartedBottom = getStarted.filter(
    (entry) => entry.sidebarOrder >= GET_STARTED_BOTTOM_FROM,
  );
  const components = getSidebarEntries("components");
  const primitivesFoundations = getSidebarEntries("primitives-foundations");

  return (
    <Sidebar
      collapsible="offcanvas"
      variant="sidebar"
      className="top-12 h-[calc(100svh-3rem)]"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Get started</SidebarGroupLabel>
          <SidebarGroupContent>
            <EntryList
              entries={getStartedTop}
              pathname={pathname}
              withGetStartedAdornments
            />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Components</SidebarGroupLabel>
          <SidebarGroupContent>
            <EntryList entries={components} pathname={pathname} />
          </SidebarGroupContent>
        </SidebarGroup>

        {getStartedBottom.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel>Get started</SidebarGroupLabel>
            <SidebarGroupContent>
              <EntryList entries={getStartedBottom} pathname={pathname} />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {primitivesFoundations.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel>Primitives & Foundations</SidebarGroupLabel>
            <SidebarGroupContent>
              <EntryList entries={primitivesFoundations} pathname={pathname} />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border px-2 py-3">
        <a
          href={`https://github.com/ghcpuman902/tfl-components/releases/tag/${APP_VERSION_LABEL}`}
          className="rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          target="_blank"
          rel="noreferrer"
        >
          {APP_VERSION_LABEL}
        </a>
      </SidebarFooter>
    </Sidebar>
  );
};
