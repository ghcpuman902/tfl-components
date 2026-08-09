import { ROUNDEL_LOGO_PATHS } from "@/lib/tfl/roundel-presets";
import { cn } from "@/lib/utils";

export type NationalRailPictogramProps = {
  className?: string;
  /** CSS length for height (width follows aspect). */
  height?: string | number;
  /** Decorative by default — parent should expose “National Rail” in aria. */
  decorative?: boolean;
};

/**
 * National Rail double-arrow pictogram for line diagrams (§9.4).
 * Sits beside the station name; does not change name centering.
 */
export const NationalRailPictogram = ({
  className,
  height = "0.85em",
  decorative = true,
}: NationalRailPictogramProps) => (
  // eslint-disable-next-line @next/next/no-img-element -- small SVG brand mark; matches TfLRoundel
  <img
    src={ROUNDEL_LOGO_PATHS.nationalRail}
    alt={decorative ? "" : "National Rail"}
    aria-hidden={decorative ? true : undefined}
    className={cn("inline-block shrink-0 object-contain", className)}
    style={{ height, width: "auto" }}
    draggable={false}
  />
);
