"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { cn } from "@/lib/utils";
import {
  approximateStationMeasure,
  createCanvasStationMeasure,
  formatStationLabel,
  resolveSansFontFamily,
  type StationLabelFormatResult,
} from "@/lib/tfl/station-typography";
import { formatStationName } from "@/lib/tfl/diagram-station";

export type StationNameLabelProps = {
  name: string;
  className?: string;
  style?: CSSProperties;
  /**
   * When set, labels measure against this width instead of the container.
   * Useful for fixed diagram columns.
   */
  maxWidth?: number;
  fontSize?: number;
  maxLines?: 1 | 2;
  allowAbbreviation?: boolean;
  allowScaleDown?: boolean;
  minScale?: number;
  /** Align text within the label block. */
  align?: "left" | "center" | "right";
  /** Expose format diagnostics to a parent (typography lab). */
  onFormat?: (result: StationLabelFormatResult) => void;
};

type SizeState = {
  width: number;
  fontSize: number;
  fontFamily: string;
  /** True once live DOM/font metrics have been read (canvas measure). */
  measured: boolean;
};

const WIDTH_EPSILON = 0.5;
const FONT_EPSILON = 0.05;
const FALLBACK_FONT = "Hammersmith One, system-ui, sans-serif";

const placeholderResult = (name: string): StationLabelFormatResult => {
  const displayName = formatStationName(name);
  return {
    lines: [displayName],
    scale: 1,
    abbreviated: false,
    fits: true,
    displayName,
  };
};

/**
 * Measured station-name label using the live Hammersmith One / `--font-sans`
 * stack. Breaks only between words; never mid-token.
 *
 * When `maxWidth` + `fontSize` are provided, the first paint (SSR + hydrate)
 * uses the deterministic approximate measure so server/client HTML match.
 * After fonts are ready, canvas measurement refines the layout.
 *
 * Scale is applied on an inner span so the measurement host keeps a stable
 * base font-size — otherwise ResizeObserver re-reads the scaled size and
 * oscillates (1-line ↔ 2-line / scale vibration).
 */
export const StationNameLabel = ({
  name,
  className,
  style,
  maxWidth: maxWidthProp,
  fontSize: fontSizeProp,
  maxLines = 2,
  allowAbbreviation = false,
  allowScaleDown = true,
  minScale,
  align = "left",
  onFormat,
}: StationNameLabelProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const hasFixedMetrics =
    maxWidthProp != null && maxWidthProp > 0 && fontSizeProp != null;

  const [size, setSize] = useState<SizeState>(() => ({
    width: maxWidthProp ?? 0,
    fontSize: fontSizeProp ?? 16,
    fontFamily: FALLBACK_FONT,
    measured: false,
  }));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;
    const container = el.parentElement;

    const readMetrics = () => {
      if (cancelled) return;

      const width =
        maxWidthProp ??
        (container && container.clientWidth > 0
          ? container.clientWidth
          : el.clientWidth);

      // Always read font from the outer host — it never receives the fit scale.
      const measuredFont =
        fontSizeProp ??
        (Number.parseFloat(getComputedStyle(el).fontSize) || 16);
      const fontFamily = resolveSansFontFamily(el);

      setSize((prev) => {
        if (
          prev.measured &&
          Math.abs(prev.width - width) < WIDTH_EPSILON &&
          Math.abs(prev.fontSize - measuredFont) < FONT_EPSILON &&
          prev.fontFamily === fontFamily
        ) {
          return prev;
        }
        return {
          width,
          fontSize: measuredFont,
          fontFamily,
          measured: true,
        };
      });
    };

    const waitFonts = async () => {
      try {
        if (document.fonts?.ready) await document.fonts.ready;
      } catch {
        // Ignore font loading errors; approximate measure still works.
      }
      readMetrics();
    };

    void waitFonts();

    // Observe the stable parent box only — self height/width changes when
    // we switch between one and two lines and must not re-trigger measure.
    const observer = new ResizeObserver(() => readMetrics());
    if (container) observer.observe(container);
    else observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [fontSizeProp, maxWidthProp, name]);

  const measure = useMemo(() => {
    if (!size.measured) return approximateStationMeasure;
    return createCanvasStationMeasure(size.fontFamily);
  }, [size.fontFamily, size.measured]);

  const formatOptions = useMemo(
    () => ({
      maxWidth: Math.max(size.width, 1),
      fontSize: size.fontSize,
      maxLines,
      allowAbbreviation,
      allowScaleDown,
      minScale,
    }),
    [
      allowAbbreviation,
      allowScaleDown,
      maxLines,
      minScale,
      size.fontSize,
      size.width,
    ],
  );

  const result = useMemo(() => {
    // Fixed metrics: format on first paint (SSR + hydrate) with approximate
    // measure so markup matches; refine once canvas metrics arrive.
    if (hasFixedMetrics && size.width > 0) {
      return formatStationLabel(name, measure, formatOptions);
    }
    if (!size.measured || size.width <= 0) {
      return placeholderResult(name);
    }
    return formatStationLabel(name, measure, formatOptions);
  }, [formatOptions, hasFixedMetrics, measure, name, size.measured, size.width]);

  useEffect(() => {
    if (!size.measured || size.width <= 0) return;
    onFormat?.(result);
  }, [onFormat, result, size.measured, size.width]);

  const textAlign =
    align === "center" ? "center" : align === "right" ? "right" : "left";

  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex w-full min-w-0 flex-col leading-none",
        align === "center" && "items-center",
        align === "right" && "items-end",
        align === "left" && "items-start",
        className,
      )}
      style={{
        ...style,
        // Keep the author/base size on the measurement host; never apply fit
        // scale here (that used to feed ResizeObserver and vibrate).
        fontSize: fontSizeProp != null ? `${fontSizeProp}px` : style?.fontSize,
        textAlign,
      }}
    >
      <span
        className="inline-flex w-full min-w-0 flex-col"
        style={{
          fontSize: result.scale !== 1 ? `${result.scale * 100}%` : undefined,
        }}
      >
        {result.lines.map((line, index) => (
          <span key={`${line}-${index}`} className="block whitespace-nowrap">
            {line}
          </span>
        ))}
      </span>
    </span>
  );
};
