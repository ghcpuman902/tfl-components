"use client"

import { useState } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InstallCommand } from "@/components/docs/install-command"
import { SyntaxHighlightedCode } from "@/components/docs/syntax-highlighted-code"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const IMPORT_SNIPPET = `@import "./tfl-colours.css";`

type ColoursInstallTabsProps = {
  registryUrl: string
  cssText: string
  className?: string
}

/**
 * Dual install for Foundations Colours: shadcn theme CLI or paste CSS layers.
 */
export const ColoursInstallTabs = ({
  registryUrl,
  cssText,
  className,
}: ColoursInstallTabsProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopyCss = async () => {
    try {
      await navigator.clipboard.writeText(cssText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <Tabs defaultValue="shadcn">
        <TabsList variant="line" className="h-8">
          <TabsTrigger value="shadcn">shadcn</TabsTrigger>
          <TabsTrigger value="css">Copy CSS</TabsTrigger>
        </TabsList>

        <TabsContent value="shadcn" className="mt-3 space-y-2">
          <p className="max-w-prose text-sm text-muted-foreground">
            Merges OKLCH palette, <code className="text-xs">data-line</code>{" "}
            bindings, and <code className="text-xs">@theme</code> aliases into
            your CSS.
          </p>
          <InstallCommand registryUrl={registryUrl} />
        </TabsContent>

        <TabsContent value="css" className="mt-3 space-y-4">
          <p className="max-w-prose text-sm text-muted-foreground">
            Save as <code className="text-xs">app/tfl-colours.css</code> and
            import from <code className="text-xs">globals.css</code>, or paste
            the layers directly into{" "}
            <code className="text-xs">globals.css</code>.
          </p>
          <SyntaxHighlightedCode
            code={IMPORT_SNIPPET}
            language="css"
            wrapperClassName="mt-0 mb-0"
          />
          <div className="relative rounded-lg border border-border">
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                tfl-colours.css
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs"
                aria-label={copied ? "Copied CSS" : "Copy full CSS"}
                onClick={() => void handleCopyCss()}
              >
                {copied ? (
                  <CheckIcon className="size-3.5" />
                ) : (
                  <CopyIcon className="size-3.5" />
                )}
                {copied ? "Copied" : "Copy CSS"}
              </Button>
            </div>
            <pre className="max-h-64 overflow-auto bg-muted/50 p-4 text-[11px] leading-relaxed text-foreground">
              <code>{cssText}</code>
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
