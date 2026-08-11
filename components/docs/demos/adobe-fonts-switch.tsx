"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  useFontPreference,
  type FontPreference,
} from "@/components/font-preference-provider";

export const FontPreferenceSwitch = () => {
  const { font, setFont, adobeFontsConfigured } = useFontPreference();

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
    </div>
  );
};
