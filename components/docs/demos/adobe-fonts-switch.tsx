"use client";

import { useEffect, useState } from "react";
import { CheckIcon, InfoIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  useFontPreference,
  type FontPreference,
} from "@/components/font-preference-provider";

type KitStatus = "checking" | "available" | "unavailable";

const P22_PROBE = '600 16px "p22-underground"';

const isP22Available = (): boolean =>
  typeof document !== "undefined" &&
  "fonts" in document &&
  document.fonts.check(P22_PROBE);

/**
 * Site-wide font switch (Hammersmith One ↔ P22 Underground), plus an honest
 * readout of whether P22 actually resolved in *this* browser. Flipping the
 * switch always updates `--font-sans`; whether that's visible depends on
 * the viewer having their own Adobe Fonts kit loaded (see .env.example).
 */
export const FontPreferenceSwitch = () => {
  const { font, setFont, adobeFontsConfigured } = useFontPreference();
  const [kitStatus, setKitStatus] = useState<KitStatus>("checking");

  useEffect(() => {
    if (!adobeFontsConfigured) {
      setKitStatus("unavailable");
      return;
    }
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) setKitStatus(isP22Available() ? "available" : "unavailable");
    });
    return () => {
      cancelled = true;
    };
  }, [adobeFontsConfigured]);

  return (
    <div className="space-y-3">
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
        <ToggleGroupItem value="p22">P22 Underground</ToggleGroupItem>
      </ToggleGroup>
      <p
        className={cn(
          "flex items-start gap-1.5 text-xs text-muted-foreground",
        )}
      >
        {kitStatus === "checking" ? (
          "Checking whether your browser has an Adobe Fonts kit loaded…"
        ) : kitStatus === "available" ? (
          <>
            <CheckIcon
              className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
              strokeWidth={3}
            />
            P22 Underground is loaded here — the switch renders real
            Book/DemiBold, not a placeholder.
          </>
        ) : (
          <>
            <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
            No Adobe Fonts kit detected in this browser, so P22 Underground
            falls back to Hammersmith One. That&apos;s expected unless you set
            <code className="mx-1 rounded bg-muted px-1 py-0.5 font-mono text-[0.7rem]">
              NEXT_PUBLIC_ADOBE_FONTS_KIT_ID
            </code>
            to your own kit.
          </>
        )}
      </p>
    </div>
  );
};
