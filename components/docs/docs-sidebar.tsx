"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DOCS_ENTRIES,
  getPopulatedGroups,
  type DocsEntry,
} from "@/lib/docs-catalog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
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
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border px-2 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 font-semibold text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <TfLRoundel className="size-5 shrink-0" />
          <span className="truncate group-data-[collapsible=icon]:hidden">
            tfl-components
          </span>
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
      <SidebarRail />
    </Sidebar>
  );
};
