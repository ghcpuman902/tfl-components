"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
  type Ref,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import {
  GET_STARTED_BOTTOM_FROM,
  getSidebarEntries,
  type DocsEntry,
  type DocsModeMarker,
} from "@/lib/docs-catalog";
import { APP_VERSION_LABEL } from "@/lib/version";
import { TfLRoundel } from "@/components/tfl/brand/tfl-roundel";
import { UNDERGROUND_LINE_COLOURS } from "@/lib/tfl/brand-colours";
import type { RoundelPreset } from "@/lib/tfl/roundel-presets";
import { FeedbackTrigger } from "@/components/docs/feedback-dialog";
import { UserTflCredentialsTrigger } from "@/components/user-tfl-credentials-trigger";
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

const REVEAL_PADDING = 24;

/**
 * Scroll only the sidebar pane. `scrollIntoView` also moves `html`, which
 * jumps the reading position on docs pages.
 */
const revealInScrollContainer = (container: HTMLElement, item: HTMLElement) => {
  const containerRect = container.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  const visible =
    itemRect.top >= containerRect.top + REVEAL_PADDING &&
    itemRect.bottom <= containerRect.bottom - REVEAL_PADDING;
  if (visible) return;

  const itemCenter = itemRect.top + itemRect.height / 2;
  const containerCenter = containerRect.top + containerRect.height / 2;
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  container.scrollTo({
    top: container.scrollTop + (itemCenter - containerCenter),
    behavior: reducedMotion ? "auto" : "smooth",
  });
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

  if (slug === "colours") {
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
  "colours",
  "tfl-roundel",
]);

const EntryList = ({
  entries,
  pathname,
  activeItemRef,
  withGetStartedAdornments = false,
}: {
  entries: DocsEntry[];
  pathname: string;
  activeItemRef: Ref<HTMLLIElement>;
  /** Text-sized marks after Explorer / Typography / Colours / Roundel labels. */
  withGetStartedAdornments?: boolean;
}) => (
  <SidebarMenu>
    {entries.map((entry) => {
      const showAdornment =
        withGetStartedAdornments &&
        GET_STARTED_ADORNMENT_SLUGS.has(entry.slug);
      const active = isActive(pathname, entry);

      return (
        <SidebarMenuItem
          key={entry.slug}
          ref={active ? activeItemRef : undefined}
        >
          <SidebarMenuButton
            render={<Link href={entry.href} />}
            isActive={active}
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

export const DocsSidebar = () => {
  const pathname = usePathname();
  const contentRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLLIElement>(null);
  const getStarted = getSidebarEntries("get-started");
  const getStartedTop = getStarted.filter(
    (entry) => entry.sidebarOrder < GET_STARTED_BOTTOM_FROM,
  );
  const getStartedBottom = getStarted.filter(
    (entry) => entry.sidebarOrder >= GET_STARTED_BOTTOM_FROM,
  );
  const components = getSidebarEntries("components");
  const primitivesFoundations = getSidebarEntries("primitives-foundations");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const container = contentRef.current;
      const item = activeItemRef.current;
      if (container && item) revealInScrollContainer(container, item);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <Sidebar
      collapsible="offcanvas"
      variant="sidebar"
      className="top-12 h-[calc(100svh-3rem)]"
    >
      <SidebarContent ref={contentRef}>
        <SidebarGroup>
          <SidebarGroupLabel>Get started</SidebarGroupLabel>
          <SidebarGroupContent>
            <EntryList
              entries={getStartedTop}
              pathname={pathname}
              activeItemRef={activeItemRef}
              withGetStartedAdornments
            />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Components</SidebarGroupLabel>
          <SidebarGroupContent>
            <EntryList
              entries={components}
              pathname={pathname}
              activeItemRef={activeItemRef}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        {getStartedBottom.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <EntryList
                entries={getStartedBottom}
                pathname={pathname}
                activeItemRef={activeItemRef}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {primitivesFoundations.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel>Primitives & Foundations</SidebarGroupLabel>
            <SidebarGroupContent>
              <EntryList
                entries={primitivesFoundations}
                pathname={pathname}
                activeItemRef={activeItemRef}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border gap-1 px-2 py-2">
        <UserTflCredentialsTrigger />
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <FeedbackTrigger />
          </div>
          <a
            href={`https://github.com/ghcpuman902/tfl-components/releases/tag/${APP_VERSION_LABEL}`}
            className="inline-flex h-8 shrink-0 items-center rounded-md px-2 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            target="_blank"
            rel="noreferrer"
          >
            {APP_VERSION_LABEL}
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
