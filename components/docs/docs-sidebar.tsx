"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DOCS_ENTRIES,
  getPopulatedGroups,
  type DocsEntry,
  type DocsGroup,
} from "@/lib/docs-catalog";
import { APP_VERSION_LABEL } from "@/lib/version";
import { DocsSearch } from "@/components/docs/docs-search";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { TfLRoundel } from "@/components/tfl/brand/tfl-roundel";

const isActive = (pathname: string, entry: DocsEntry) => {
  if (entry.href === "/") return false;
  return pathname === entry.href || pathname.startsWith(`${entry.href}/`);
};

type NavBlock =
  | { kind: "group"; group: DocsGroup; entries: DocsEntry[] }
  | {
      kind: "section";
      title: string;
      children: { group: DocsGroup; entries: DocsEntry[] }[];
    };

const buildNavBlocks = (): NavBlock[] => {
  const groups = getPopulatedGroups().filter((group) => group.id !== "start");
  const blocks: NavBlock[] = [];
  let sectionBuffer: {
    title: string;
    children: { group: DocsGroup; entries: DocsEntry[] }[];
  } | null = null;

  const flushSection = () => {
    if (sectionBuffer) {
      blocks.push({ kind: "section", ...sectionBuffer });
      sectionBuffer = null;
    }
  };

  for (const group of groups) {
    const entries = DOCS_ENTRIES.filter((entry) => entry.group === group.id);
    if (group.navSection) {
      if (!sectionBuffer || sectionBuffer.title !== group.navSection) {
        flushSection();
        sectionBuffer = { title: group.navSection, children: [] };
      }
      sectionBuffer.children.push({ group, entries });
      continue;
    }
    flushSection();
    blocks.push({ kind: "group", group, entries });
  }
  flushSection();
  return blocks;
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
          <span>{entry.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ))}
  </SidebarMenu>
);

export const DocsSidebar = () => {
  const pathname = usePathname();
  const blocks = buildNavBlocks();
  const startEntries = DOCS_ENTRIES.filter((entry) => entry.group === "start");

  return (
    <Sidebar collapsible="offcanvas" variant="sidebar">
      <SidebarHeader className="space-y-2 border-b border-sidebar-border px-2 py-2">
        <Link
          href="/"
          className="flex h-8 items-center gap-2 rounded-md px-2 font-semibold text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <TfLRoundel className="size-5 shrink-0" />
          <span className="truncate">tfl-components</span>
        </Link>
        <div className="hidden px-1 md:block">
          <DocsSearch variant="sidebar" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Start</SidebarGroupLabel>
          <SidebarGroupContent>
            <EntryList entries={startEntries} pathname={pathname} />
          </SidebarGroupContent>
        </SidebarGroup>

        {blocks.map((block) => {
          if (block.kind === "group") {
            return (
              <SidebarGroup key={block.group.id}>
                <SidebarGroupLabel>{block.group.title}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <EntryList entries={block.entries} pathname={pathname} />
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }

          return (
            <SidebarGroup key={block.title}>
              <SidebarGroupLabel>{block.title}</SidebarGroupLabel>
              <SidebarGroupContent className="space-y-3">
                {block.children.map(({ group, entries }) => (
                  <div key={group.id} className="space-y-1">
                    <p className="px-2 text-[11px] font-medium tracking-wide text-sidebar-foreground/60 uppercase">
                      {group.title}
                    </p>
                    <EntryList entries={entries} pathname={pathname} />
                  </div>
                ))}
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
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
