"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DOCS_ENTRIES,
  getPopulatedGroups,
  type DocsEntry,
} from "@/lib/docs-catalog";
import { APP_VERSION_LABEL } from "@/lib/version";
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
  if (entry.href === "/") return pathname === "/";
  return pathname === entry.href || pathname.startsWith(`${entry.href}/`);
};

export const DocsSidebar = () => {
  const pathname = usePathname();
  const groups = getPopulatedGroups();

  return (
    <Sidebar collapsible="offcanvas" variant="sidebar">
      <SidebarHeader className="flex h-12 shrink-0 justify-center border-b border-sidebar-border px-2 py-0">
        <Link
          href="/"
          className="flex h-8 items-center gap-2 rounded-md px-2 font-semibold text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <TfLRoundel className="size-5 shrink-0" />
          <span className="truncate">tfl-components</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => {
          const entries = DOCS_ENTRIES.filter(
            (entry) => entry.group === group.id,
          );
          return (
            <SidebarGroup key={group.id}>
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
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
