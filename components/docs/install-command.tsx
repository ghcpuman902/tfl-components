"use client"

import { useState } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const PACKAGE_MANAGERS = [
  {
    id: "pnpm",
    label: "pnpm",
    command: (url: string) => `pnpm dlx shadcn@latest add ${url}`,
  },
  {
    id: "npm",
    label: "npm",
    command: (url: string) => `npx shadcn@latest add ${url}`,
  },
  {
    id: "yarn",
    label: "yarn",
    command: (url: string) => `yarn dlx shadcn@latest add ${url}`,
  },
  {
    id: "bun",
    label: "bun",
    command: (url: string) => `bunx --bun shadcn@latest add ${url}`,
  },
] as const

type InstallCommandProps = {
  registryUrl: string
  className?: string
}

export const InstallCommand = ({
  registryUrl,
  className,
}: InstallCommandProps) => {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = async (id: string, command: string) => {
    try {
      await navigator.clipboard.writeText(command)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Clipboard can fail in insecure contexts; ignore.
    }
  }

  return (
    <div className={cn("rounded-lg border border-border", className)}>
      <Tabs defaultValue="pnpm" className="gap-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-2 py-1.5">
          <TabsList variant="line" className="h-8">
            {PACKAGE_MANAGERS.map((pm) => (
              <TabsTrigger key={pm.id} value={pm.id}>
                {pm.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {PACKAGE_MANAGERS.map((pm) => {
          const command = pm.command(registryUrl)
          const copied = copiedId === pm.id

          return (
            <TabsContent key={pm.id} value={pm.id} className="relative">
              <pre className="overflow-x-auto overflow-y-hidden bg-muted/50 p-4 pr-14 text-xs leading-relaxed text-foreground">
                <code>{command}</code>
              </pre>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-2 right-2"
                aria-label={copied ? "Copied" : "Copy install command"}
                onClick={() => handleCopy(pm.id, command)}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
              </Button>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
