"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { FindableText } from "@/components/tfl/findable-text";
import {
  approximateStationMeasure,
  createCanvasStationMeasure,
  formatStationLabel,
  resolveSansFontFamily,
  type StationLabelFormatResult,
} from "@/lib/tfl/station-typography";
import { formatStationName } from "@/lib/tfl/diagram-station";
import {
  findCompletionForToken,
  stationCopyName,
  stationFindAliases,
} from "@/lib/tfl/station-label-find";

export type StationNameLayout = "fixed" | "auto";

export type StationNameProps = {
  name: string;
  className?: string;
  style?: CSSProperties;
  /**
   * Explicit visual lines (editorial / crowding recipes).
   * When set, skips auto word-break selection.
   */
  lines?: readonly string[];
  /**
   * `fixed` (default): use `lines` or a single canonical line — no measure/scale.
   * `auto`: measure the box and pick 1–2 lines / abbr / scale via formatStationLabel.
   */
  layout?: StationNameLayout;
  /**
   * When set with `layout="auto"`, labels measure against this width instead
   * of the container. Useful for fixed diagram columns.
   */
  maxWidth?: number;
  fontSize?: number;
  maxLines?: 1 | 2;
  allowAbbreviation?: boolean;
  allowScaleDown?: boolean;
  minScale?: number;
  /**
   * @deprecated Prefer `lines`. Kept for call-site compatibility.
   */
  forcedLines?: readonly string[];
  /**
   * Canonical single-line name for aria + copy. Defaults to `formatStationName`.
   */
  accessibleName?: string;
  /**
   * @deprecated No longer required — find/copy/aria always use the canonical name.
   */
  abbreviatedVisual?: boolean;
  /** Align text within the label block. */
  align?: "left" | "center" | "right";
  /** Expose format diagnostics to a parent (typography lab). */
  onFormat?: (result: StationLabelFormatResult) => void;
};

/** @deprecated Use `StationNameProps`. */
export type StationNameLabelProps = StationNameProps;

type SizeState = {
  width: number;
  fontSize: number;
  fontFamily: string;
  measured: boolean;
};

const WIDTH_EPSILON = 0.5;
const FONT_EPSILON = 0.05;
const FALLBACK_FONT = "Hammersmith One, system-ui, sans-serif";
/** Unitless so wrapped lines stay clustered when `scale` shrinks font-size. */
const MULTILINE_LINE_HEIGHT = 1.15;

/**
 * Invisible inline completion (e.g. St + "reet" → Street) for engines that
 * still index font-size: 0. Primary cross-line find uses FindPhrase below.
 */
const FindExpand = ({ text }: { text: string }) => (
  <span className="text-[0px] leading-none" aria-hidden="true">
    {text}
  </span>
);

const renderFindableLine = (line: string): ReactNode[] =>
  line.split(/(\s+|&)/).map((part, index) => {
    if (!part) return null;
    const completion = findCompletionForToken(part);
    if (!completion) {
      return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
    }
    return (
      <Fragment key={`${part}-${index}`}>
        {part}
        <FindExpand text={completion} />
      </Fragment>
    );
  });

const fixedResult = (
  name: string,
  lines?: readonly string[],
): StationLabelFormatResult => {
  const displayName = formatStationName(name);
  if (lines && lines.length > 0) {
    return {
      lines: [...lines],
      scale: 1,
      abbreviated: lines.join(" ") !== displayName,
      fits: true,
      displayName,
    };
  }
  return {
    lines: [displayName],
    scale: 1,
    abbreviated: false,
    fits: true,
    displayName,
  };
};

/**
 * Station name UI contract: canonical copy / aria, find-in-page variants,
 * and optional visual line breaks. String-driven so non-TfL labels (pubs,
 * attractions) can use the same find/copy behaviour.
 *
 * Diagrams typically pass `lines` from a label recipe with `layout="fixed"`.
 * The typography lab uses `layout="auto"` + `maxWidth` to exercise fit policy.
 */
export const StationName = ({
  name,
  className,
  style,
  lines: linesProp,
  layout = "fixed",
  maxWidth: maxWidthProp,
  fontSize: fontSizeProp,
  maxLines = 2,
  allowAbbreviation = false,
  allowScaleDown = true,
  minScale,
  forcedLines,
  accessibleName: accessibleNameProp,
  align = "left",
  onFormat,
}: StationNameProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const visualLines = linesProp ?? forcedLines;
  const useAuto = layout === "auto";
  const hasFixedMetrics =
    useAuto && maxWidthProp != null && maxWidthProp > 0 && fontSizeProp != null;
  const copyName = stationCopyName(name, accessibleNameProp);

  const [size, setSize] = useState<SizeState>(() => ({
    width: maxWidthProp ?? 0,
    fontSize: fontSizeProp ?? 16,
    fontFamily: FALLBACK_FONT,
    measured: false,
  }));

  useEffect(() => {
    if (!useAuto) return;
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

    const observer = new ResizeObserver(() => readMetrics());
    if (container) observer.observe(container);
    else observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [fontSizeProp, maxWidthProp, name, useAuto]);

  const measure = useMemo(() => {
    if (!useAuto || !size.measured) return approximateStationMeasure;
    return createCanvasStationMeasure(size.fontFamily);
  }, [size.fontFamily, size.measured, useAuto]);

  const formatOptions = useMemo(
    () => ({
      maxWidth: Math.max(size.width, 1),
      fontSize: size.fontSize,
      maxLines,
      allowAbbreviation,
      allowScaleDown,
      minScale,
      forcedLines: visualLines,
    }),
    [
      allowAbbreviation,
      allowScaleDown,
      visualLines,
      maxLines,
      minScale,
      size.fontSize,
      size.width,
    ],
  );

  const result = useMemo(() => {
    if (!useAuto) return fixedResult(name, visualLines);

    // Until the box is measured, run the fit policy at a 1px width so we
    // land on the smallest form — never flash the full-size overflow default.
    if (!hasFixedMetrics && (!size.measured || size.width <= 0)) {
      return formatStationLabel(name, approximateStationMeasure, {
        ...formatOptions,
        maxWidth: 1,
      });
    }
    return formatStationLabel(name, measure, formatOptions);
  }, [
    formatOptions,
    hasFixedMetrics,
    measure,
    name,
    size.measured,
    size.width,
    useAuto,
    visualLines,
  ]);

  useEffect(() => {
    if (!useAuto) {
      onFormat?.(result);
      return;
    }
    if (!size.measured || size.width <= 0) return;
    onFormat?.(result);
  }, [onFormat, result, size.measured, size.width, useAuto]);

  const findAliases = useMemo(
    () => stationFindAliases(copyName, result.lines),
    [copyName, result.lines],
  );

  const textAlign =
    align === "center" ? "center" : align === "right" ? "right" : "left";
  const multiline = result.lines.length > 1;

  const paintDiffersFromCopy =
    multiline ||
    result.abbreviated ||
    result.lines.join(" ").replace(/\s+/g, " ").trim() !== copyName;
  const extraFindAliases = findAliases.filter(
    (alias) => alias.toLowerCase() !== copyName.toLowerCase(),
  );

  return (
    <FindableText
      ref={ref}
      text={copyName}
      aliases={extraFindAliases}
      paintMatchesText={!paintDiffersFromCopy}
      className={cn(
        "relative inline-flex h-full min-h-0 w-full min-w-0 flex-col justify-center",
        !multiline && "leading-none",
        align === "center" && "items-center",
        align === "right" && "items-end",
        align === "left" && "items-start",
        className,
      )}
      style={{
        ...style,
        fontSize: fontSizeProp != null ? `${fontSizeProp}px` : style?.fontSize,
        textAlign,
      }}
    >
      <span
        className="inline-block w-full min-w-0"
        style={{
          fontSize: result.scale !== 1 ? `${result.scale * 100}%` : undefined,
          // Unitless LH tracks scaled font-size; rem leading from callers would not.
          lineHeight: multiline ? MULTILINE_LINE_HEIGHT : undefined,
        }}
        aria-hidden="true"
      >
        {result.lines.map((line, index) => (
          <Fragment key={`${line}-${index}`}>
            {index > 0 ? (
              <>
                <FindExpand text=" " />
                <br />
              </>
            ) : null}
            <span className="whitespace-nowrap">
              {renderFindableLine(line)}
            </span>
          </Fragment>
        ))}
      </span>
    </FindableText>
  );
};

/** @deprecated Prefer `StationName`. */
export const StationNameLabel = StationName;
