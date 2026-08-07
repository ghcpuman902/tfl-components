"use client";

import { useState } from "react";
import { CheckIcon, ChevronDownIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type CodeCollapsibleProps = {
  title: string;
  description?: string;
  code: string;
  language?: string;
  defaultOpen?: boolean;
  className?: string;
};

export const CodeCollapsible = ({
  title,
  description,
  code,
  language = "tsx",
  defaultOpen = false,
  className,
}: CodeCollapsibleProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can fail in insecure contexts; ignore.
    }
  };

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn("rounded-lg border border-border", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={copied ? "Copied" : "Copy code"}
            onClick={handleCopy}
          >
            {copied ? (
              <CheckIcon data-icon="inline-start" />
            ) : (
              <CopyIcon data-icon="inline-start" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          <CollapsibleTrigger
            render={
              <Button type="button" variant="ghost" size="sm" />
            }
          >
            {open ? "Hide code" : "View code"}
            <ChevronDownIcon
              data-icon="inline-end"
              className={cn(
                "transition-transform",
                open && "rotate-180",
              )}
            />
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent className="border-t border-border">
        <pre className="overflow-x-auto bg-muted/50 p-4 text-xs leading-relaxed text-foreground">
          <code className={`language-${language}`}>{code}</code>
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
};
