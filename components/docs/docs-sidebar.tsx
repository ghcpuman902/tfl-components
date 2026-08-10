"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getSidebarEntries,
  type DocsEntry,
  type DocsModeMarker,
} from "@/lib/docs-catalog";
import { APP_VERSION_LABEL } from "@/lib/version";
import { TfLRoundel } from "@/components/tfl/brand/tfl-roundel";
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

const isActive = (pathname: string, entry: DocsEntry) => {
  if (entry.href === "/docs") return pathname === "/docs";
  return pathname === entry.href || pathname.startsWith(`${entry.href}/`);
};

const EntryList = ({
  entries,
  pathname,
}: {
  entries: DocsEntry[];
  pathname: string;
}) => (
  <SidebarMenu>
    {entries.map((entry) => (
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
          <span className="truncate">
            {entry.title}
            {entry.comingSoon ? (
              <span className="text-sidebar-foreground/50"> · soon</span>
            ) : null}
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ))}
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
            <EntryList entries={getStartedTop} pathname={pathname} />
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
