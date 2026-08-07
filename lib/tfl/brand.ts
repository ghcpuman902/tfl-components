/**
 * TfL brand tooling — colours, roundel presets, line-diagram geometry,
 * and Basic Elements helpers.
 */

export {
  TFL_BLUE,
  TFL_MODAL_COLOURS,
  UNDERGROUND_LINE_COLOURS,
  OVERGROUND_LINE_COLOURS,
  UNDERGROUND_RING_RED,
  type ModalColourKey,
  type UndergroundLineColourKey,
  type OvergroundLineColourKey,
} from "@/lib/tfl/brand-colours";

export {
  ROUNDEL_LOGO_PATHS,
  ROUNDEL_LOGO_SOURCES,
  ROUNDEL_PRESETS,
  TFL_BRAND_LINKS,
  getRoundelLogoPath,
  type RoundelPreset,
  type RoundelStyle,
} from "@/lib/tfl/roundel-presets";

export {
  ROUNDEL_DO_NOT,
  ROUNDEL_EXCLUSION_RATIO,
  ROUNDEL_FONT_FAMILY,
  ROUNDEL_FONT_POLICY,
  ROUNDEL_MIN_WIDTH_MM,
  ROUNDEL_MIN_WIDTH_PX,
  getRoundelExclusion,
  isRoundelAboveMinSize,
  type RoundelExclusion,
} from "@/lib/tfl/brand-rules";

export {
  LINE_DIAGRAM,
  LINE_DIAGRAM_ASSETS,
  LINE_DIAGRAM_SOURCE,
  DIAGRAM_BASELINE,
  DIAGRAM_SCALE,
  DIAGRAM_SCALE_CLASS,
  DIAGRAM_SCALE_VAR,
  DIAGRAM_X_VAR,
  bend90Path,
  bendCenterlineRadius,
  continuationArrowPoints,
  diagramUnitStyle,
  horizontalDiagramMetrics,
  interchangeInnerRadius,
  interchangeOuterRadius,
  interchangeStroke,
  scale,
  stationTickRect,
  ux,
  verticalDiagramMetrics,
} from "@/lib/tfl/line-diagram";

export {
  formatStationName,
  isLikelyInterchange,
  type DiagramConnection,
  type DiagramStation,
} from "@/lib/tfl/diagram-station";

export {
  sliceJourney,
  toDiagramStation,
} from "@/lib/tfl/diagram-mappers";
