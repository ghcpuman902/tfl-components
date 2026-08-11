"use client";

import { CheckIcon, InfoIcon } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  useFontPreference,
  type FontPreference,
} from "@/components/font-preference-provider";

export const FontPreferenceSwitch = () => {
  const { font, setFont, adobeFontsConfigured } = useFontPreference();
  const showDebugInfo = process.env.NODE_ENV === "development";

  return (
    <div className="space-y-4">
      <div className="grid border-y border-border sm:grid-cols-2">
        <figure className="space-y-1 py-4 sm:pr-6">
          <figcaption className="text-xs text-muted-foreground">
            Hammersmith One · 400 · normal tracking
          </figcaption>
          <p className="font-['Hammersmith_One',sans-serif] text-2xl font-normal tracking-normal [font-synthesis:none]">
            Victoria line
          </p>
          <p className="font-['Hammersmith_One',sans-serif] text-sm [font-synthesis:none]">
            Minor delays while we fix a signal fault.
          </p>
        </figure>
        <figure className="space-y-1 border-t border-border py-4 sm:border-t-0 sm:border-l sm:pl-6">
          <figcaption className="text-xs text-muted-foreground">
            P22 Underground · 600 · tight tracking
          </figcaption>
          <p className="font-['p22-underground','Hammersmith_One',sans-serif] text-2xl font-semibold tracking-tight [font-synthesis:none]">
            Victoria line
          </p>
          <p className="font-['p22-underground','Hammersmith_One',sans-serif] text-sm [font-synthesis:none]">
            Minor delays while we fix a signal fault.
          </p>
        </figure>
      </div>
      <ToggleGroup
        value={[font]}
        onValueChange={(values) => {
          const next = values[0] as FontPreference | undefined;
          if (next) setFont(next);
        }}
        variant="outline"
        aria-label="Site body font"
      >
        <ToggleGroupItem value="default">Hammersmith One</ToggleGroupItem>
        <ToggleGroupItem value="p22" disabled={!adobeFontsConfigured}>
          P22 Underground
        </ToggleGroupItem>
      </ToggleGroup>
      {showDebugInfo ? (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          {adobeFontsConfigured ? (
            <>
              <CheckIcon
                className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                strokeWidth={3}
              />
              Adobe Fonts kit configured.
            </>
          ) : (
            <>
              <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
              P22 disabled:{" "}
              <code className="font-mono text-[0.7rem]">
                NEXT_PUBLIC_ADOBE_FONTS_KIT_ID
              </code>{" "}
              is not configured.
            </>
          )}
        </p>
      ) : null}
    </div>
  );
};
