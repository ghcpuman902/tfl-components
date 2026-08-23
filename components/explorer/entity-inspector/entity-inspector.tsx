"use client"

import { useState, type ReactNode } from "react"
import { Check, ChevronDown, Copy } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  explorerPaneClassName,
  explorerSplitFillClassName,
} from "@/components/explorer/explorer-split"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  formatAdditionalPropertyDate,
  parseAdditionalPropertyValue,
} from "@/lib/tfl/additional-property-value"
import {
  groupAdditionalProperties,
  type StopAdditionalProperty,
} from "@/lib/tfl/additional-property-groups"
import { buildExplorerHref } from "@/lib/tfl/explorer-url-state"
import { cn } from "@/lib/utils"

type InspectorSectionProps = {
  title: string
  children: ReactNode
  className?: string
}

export const InspectorSection = ({
  title,
  children,
  className,
}: InspectorSectionProps) => (
  <section className={cn("space-y-2", className)}>
    <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
      {title}
    </h3>
    {children}
  </section>
)

type CopyableFieldProps = {
  label: string
  value: string
  href?: string
  /** Rendered value. Defaults to monospaced `value`. */
  display?: ReactNode
}

export const CopyableField = ({
  label,
  value,
  href,
  display,
}: CopyableFieldProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard may be unavailable — ignore.
    }
  }

  const shown = display ?? <p className="truncate font-mono text-sm">{value}</p>

  return (
    <div className="flex min-w-0 items-center gap-2 border-b border-border py-2 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {href ? (
          <a
            href={href}
            className="block truncate font-mono text-sm underline-offset-4 hover:underline"
          >
            {value}
          </a>
        ) : (
          <div className="min-w-0">{shown}</div>
        )}
      </div>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={`Copy ${label}`}
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="size-3.5" aria-hidden />
        ) : (
          <Copy className="size-3.5" aria-hidden />
        )}
      </Button>
      <span className="sr-only" aria-live="polite">
        {copied ? `${label} copied` : ""}
      </span>
    </div>
  )
}

type CodeSnippetProps = {
  title: string
  code: string
}

export const CodeSnippet = ({ title, code }: CodeSnippetProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative rounded-lg border border-border bg-muted/30 p-3">
      <p className="pr-10 text-xs font-medium text-muted-foreground">{title}</p>
      <pre className="mt-1.5 overflow-x-auto overflow-y-hidden text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute top-2 right-2"
        onClick={handleCopy}
        aria-label={copied ? "Copied" : `Copy ${title}`}
      >
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      </Button>
    </div>
  )
}

type InspectorJsonProps = {
  value: unknown
}

export const InspectorJson = ({ value }: InspectorJsonProps) => (
  <pre className="overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-muted/30 p-3 text-xs">
    {JSON.stringify(value, null, 2)}
  </pre>
)

export type { StopAdditionalProperty }

const AdditionalPropertyValue = ({ raw }: { raw?: string }) => {
  const parsed = parseAdditionalPropertyValue(raw)
  switch (parsed.kind) {
    case "null":
      return (
        <p className="font-mono text-sm text-muted-foreground italic">null</p>
      )
    case "boolean": {
      const token = raw?.trim().toLowerCase()
      const label =
        token === "yes" || token === "no" ? token : String(parsed.value)
      return (
        <Badge variant={parsed.value ? "secondary" : "outline"}>{label}</Badge>
      )
    }
    case "number":
      return (
        <p className="font-mono text-sm tabular-nums">
          {parsed.value.toLocaleString("en-GB")}
        </p>
      )
    case "date":
      return (
        <p className="text-sm tabular-nums">
          {formatAdditionalPropertyDate(parsed.ms, parsed.precision)}
        </p>
      )
    case "text":
      return <p className="truncate font-mono text-sm">{parsed.value}</p>
  }
}

const nearestPlaceHref = (value: string): string | undefined => {
  if (!/^BikePoints_/i.test(value)) return undefined
  return buildExplorerHref({ kind: "points", domain: "cycle", id: value })
}

const NearestPlacesList = ({
  buckets,
}: {
  buckets: ReturnType<typeof groupAdditionalProperties>["nearestPlaces"]
}) =>
  buckets.map((bucket) => (
    <div key={bucket.prefix} className="pb-2">
      <p className="pt-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {bucket.label}
        <span className="ml-1 font-normal">{bucket.values.length}</span>
      </p>
      {bucket.values.map((value, index) => (
        <CopyableField
          key={`${bucket.prefix}-${value}-${index}`}
          label={bucket.prefix}
          value={value}
          href={nearestPlaceHref(value)}
        />
      ))}
    </div>
  ))

const NearestPlacesDisclosure = ({
  buckets,
  nested = false,
}: {
  buckets: ReturnType<typeof groupAdditionalProperties>["nearestPlaces"]
  nested?: boolean
}) => {
  const [open, setOpen] = useState(false)
  const count = buckets.reduce((sum, bucket) => sum + bucket.values.length, 0)
  if (count === 0) return null

  if (nested) {
    return (
      <div className="mt-3 border-l-2 border-border pl-3">
        <Collapsible open={open} defaultOpen={false} onOpenChange={setOpen}>
          <CollapsibleTrigger
            aria-expanded={open}
            className="flex w-full items-center justify-between gap-2 py-1.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Nearest places
            <span className="flex items-center gap-2 font-normal">
              {count}
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform",
                  open && "rotate-180"
                )}
              />
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent keepMounted={false}>
            <NearestPlacesList buckets={buckets} />
          </CollapsibleContent>
        </Collapsible>
      </div>
    )
  }

  return (
    <Collapsible
      open={open}
      defaultOpen={false}
      onOpenChange={setOpen}
      className="rounded-lg border border-border"
    >
      <CollapsibleTrigger
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Nearest places
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {count}
          <ChevronDown
            className={cn("size-4 transition-transform", open && "rotate-180")}
          />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent
        keepMounted={false}
        className="border-t border-border px-3 pb-2"
      >
        <NearestPlacesList buckets={buckets} />
      </CollapsibleContent>
    </Collapsible>
  )
}

/** Remaining StopPoint additionalProperties after Direction / SMS lifts. */
export const AdditionalPropertiesDisclosure = ({
  properties,
}: {
  properties: readonly StopAdditionalProperty[]
}) => {
  const [open, setOpen] = useState(false)
  const grouped = groupAdditionalProperties(properties)
  if (grouped.extraCount === 0) return null

  if (grouped.groups.length === 0) {
    return <NearestPlacesDisclosure buckets={grouped.nearestPlaces} />
  }

  return (
    <Collapsible
      open={open}
      defaultOpen={false}
      onOpenChange={setOpen}
      className="rounded-lg border border-border"
    >
      <CollapsibleTrigger
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Additional properties
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {grouped.extraCount}
          <ChevronDown
            className={cn("size-4 transition-transform", open && "rotate-180")}
          />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent
        keepMounted={false}
        className="border-t border-border px-3 pb-2"
      >
        {grouped.groups.map((group) => (
          <div key={group.category} className="pt-2">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {group.label}
            </p>
            {group.properties.map((prop, index) => (
              <CopyableField
                key={`${group.category}-${prop.key ?? "property"}-${index}`}
                label={prop.key ?? "Property"}
                value={prop.value ?? ""}
                display={<AdditionalPropertyValue raw={prop.value} />}
              />
            ))}
          </div>
        ))}
        <NearestPlacesDisclosure nested buckets={grouped.nearestPlaces} />
      </CollapsibleContent>
    </Collapsible>
  )
}

type EntityInspectorShellProps = {
  title: string
  subtitle?: string
  identity: ReactNode
  preview?: ReactNode
  relationships?: ReactNode
  normalised?: ReactNode
  code?: ReactNode
  /** Streamed sections after Identity (Preview, Relationships, …). */
  details?: ReactNode
}

export const EntityInspectorShell = ({
  title,
  subtitle,
  identity,
  preview,
  relationships,
  normalised,
  code,
  details,
}: EntityInspectorShellProps) => (
  <article
    className={cn(
      explorerPaneClassName,
      "flex min-h-0 min-w-0 flex-col",
      explorerSplitFillClassName
    )}
  >
    <ScrollArea className={cn("min-h-0", explorerSplitFillClassName)}>
      <div className="space-y-6 p-4">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-balance">{title}</h2>
          {subtitle ? (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </header>

        <InspectorSection title="Identity">{identity}</InspectorSection>

        {details}

        {preview ? (
          <InspectorSection title="Preview">{preview}</InspectorSection>
        ) : null}

        {relationships ? (
          <InspectorSection title="Relationships">
            {relationships}
          </InspectorSection>
        ) : null}

        {normalised ? (
          <InspectorSection title="Normalised data">
            {normalised}
          </InspectorSection>
        ) : null}

        {code ? <InspectorSection title="Code">{code}</InspectorSection> : null}
      </div>
    </ScrollArea>
  </article>
)
