"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { explorerPaneClassName } from "@/components/explorer/explorer-split";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type InspectorSectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

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
);

type CopyableFieldProps = {
  label: string;
  value: string;
  href?: string;
};

export const CopyableField = ({ label, value, href }: CopyableFieldProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable — ignore.
    }
  };

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
          <p className="truncate font-mono text-sm">{value}</p>
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
  );
};

type CodeSnippetProps = {
  title: string;
  code: string;
};

export const CodeSnippet = ({ title, code }: CodeSnippetProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

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
  );
};

type InspectorJsonProps = {
  value: unknown;
};

export const InspectorJson = ({ value }: InspectorJsonProps) => (
  <pre className="overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-muted/30 p-3 text-xs">
    {JSON.stringify(value, null, 2)}
  </pre>
);

type EntityInspectorShellProps = {
  title: string;
  subtitle?: string;
  identity: ReactNode;
  preview?: ReactNode;
  relationships?: ReactNode;
  normalised?: ReactNode;
  code?: ReactNode;
  /** Streamed sections after Identity (Preview, Relationships, …). */
  details?: ReactNode;
};

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
      "flex min-h-0 min-w-0 flex-col lg:h-full",
    )}
  >
    <ScrollArea className="min-h-0 lg:h-full">
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
          <InspectorSection title="Normalised data">{normalised}</InspectorSection>
        ) : null}

        {code ? <InspectorSection title="Code">{code}</InspectorSection> : null}
      </div>
    </ScrollArea>
  </article>
);
