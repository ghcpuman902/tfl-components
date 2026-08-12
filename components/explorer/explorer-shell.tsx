"use client";

import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildExplorerHref,
  domainLabel,
  domainsForKind,
  kindLabel,
  type ExplorerState,
} from "@/lib/tfl/explorer-url-state";
import type { ReactNode } from "react";

type ExplorerShellProps = {
  state: ExplorerState;
  children: ReactNode;
};

/**
 * Kind → Domain → Browse/Find chrome. Only the active panel is mounted by the
 * parent page/loader — this shell only navigates URL state.
 */
export const ExplorerShell = ({ state, children }: ExplorerShellProps) => {
  const router = useRouter();

  const navigate = (next: Partial<ExplorerState>) => {
    router.push(buildExplorerHref(next, state), { scroll: false });
  };

  const domains = domainsForKind(state.kind);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Tabs
          value={state.kind}
          onValueChange={(value) => {
            if (value === "points" || value === "lines") {
              navigate({
                kind: value,
                domain:
                  value === "lines" && state.domain === "cycle"
                    ? "tube-rail"
                    : domainsForKind(value).includes(state.domain)
                      ? state.domain
                      : "tube-rail",
                tab: "browse",
                id: undefined,
                q: undefined,
                view: "list",
              });
            }
          }}
        >
          <TabsList aria-label="Explorer kind">
            <TabsTrigger value="points">{kindLabel("points")}</TabsTrigger>
            <TabsTrigger value="lines">{kindLabel("lines")}</TabsTrigger>
          </TabsList>
        </Tabs>

        <Tabs
          value={state.domain}
          onValueChange={(value) => {
            if (
              value === "tube-rail" ||
              value === "bus" ||
              value === "cycle"
            ) {
              navigate({
                domain: value,
                tab: "browse",
                id: undefined,
                q: undefined,
                view: "list",
              });
            }
          }}
        >
          <TabsList aria-label="Explorer domain" variant="line">
            {domains.map((domain) => (
              <TabsTrigger key={domain} value={domain}>
                {domainLabel(domain)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Tabs
          value={state.tab}
          onValueChange={(value) => {
            if (value === "browse" || value === "find") {
              navigate({
                tab: value,
                id: undefined,
                q: undefined,
                view: "list",
              });
            }
          }}
        >
          <TabsList aria-label="Browse or Find" className="h-8">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="find">Find</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <p className="text-sm text-muted-foreground text-pretty">
        {state.tab === "browse"
          ? "Browsing known entities is free — cached site data and bundled geography."
          : "Find runs live TfL queries with your own API key. Typing never spends quota; Search and Locate do."}
      </p>

      {children}
    </div>
  );
};
