/**
 * TfL brand tooling — colours, roundel presets, line-strip geometry,
 * and Basic Elements helpers.
 */

export {
  TFL_BLUE,
  TFL_MODAL_COLOURS,
  UNDERGROUND_LINE_COLOURS,
  OVERGROUND_LINE_COLOURS,
  UNDERGROUND_RING_RED,
  CABLE_CAR_MAP_COLOUR,
  type BrandColourSpec,
  type ModalColourKey,
  type UndergroundLineColourKey,
  type OvergroundLineColourKey,
} from "@/lib/tfl/brand-colours"

export {
  brandColourFormats,
  brandColourTableRow,
  cmykToDeviceCmykCss,
  formatHex,
  formatRgbCss,
  parseCmyk,
  parseHex,
  parseRgbChannels,
  srgbToDisplayP3Css,
  srgbToOklchCss,
  type ColourFormatRow,
  type ColourTableRow,
  type Srgb,
} from "@/lib/tfl/colour-formats"

export {
  LINE_COLOUR_TOKENS,
  getLineColourBarMode,
  getLineColourBgClass,
  getLineColourTextClass,
  getLineColourToken,
  lineCssPaint,
  type LineColourKind,
  type LineColourToken,
} from "@/lib/tfl/line-colour-map"

export {
  ROUNDEL_LOGO_PATHS,
  ROUNDEL_LOGO_SOURCES,
  ROUNDEL_PRESETS,
  TFL_BRAND_LINKS,
  getRoundelLogoPath,
  type RoundelPreset,
  type RoundelStyle,
} from "@/lib/tfl/roundel-presets"

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
} from "@/lib/tfl/brand-rules"

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
} from "@/lib/tfl/line-diagram"

export {
  formatStationName,
  isLikelyInterchange,
  type DiagramConnection,
  type DiagramStation,
} from "@/lib/tfl/diagram-station"

export {
  getHorizontalForcedLineBreak,
  getHorizontalStationLabelOverride,
  getStationLabelRecipe,
  stationLabelKey,
  STATION_LABEL_RECIPES,
  type HorizontalStationLabelOverride,
} from "@/lib/tfl/horizontal-station-labels"

export {
  applyStripLabelRecipes,
  buildSegmentStateMap,
  isStationOutOfUse,
  prepareBranchStrip,
  prepareBranchStripLabels,
  prepareStraightStrip,
  stationOutOfUseFromSegments,
  type BranchStripLabelMap,
  type PreparedBranchStrip,
  type PreparedStraightStrip,
  type StraightStripStation,
  type StripLabelPlacement,
  type StripSegmentState,
} from "@/lib/tfl/strip-model"

export {
  emptyStationIndex,
  resolveStationRecord,
  stationRecordIdentityIds,
  upsertStationRecord,
  type StationIndex,
  type StationLabelRecipe,
  type StationRecord,
} from "@/lib/tfl/station-index"

export {
  STATION_ABBREVIATIONS,
  STATION_ABBREVIATION_ENTRIES,
  STATION_ABBR_FIND_COMPLETIONS,
  applyStationAbbreviations,
} from "@/lib/tfl/station-abbreviations"

export {
  STATION_LABEL_MIN_SCALE,
  approximateStationMeasure,
  createCanvasStationMeasure,
  formatStationLabel,
  resolveSansFontFamily,
  stationLabelCandidates,
  type StationLabelFormatOptions,
  type StationLabelFormatResult,
  type StationTextMeasure,
} from "@/lib/tfl/station-typography"

export {
  buildLineTopologyFromOrderedRoutes,
  branchStationIds,
  primarySpineIds,
  topologyStationIds,
  type LineBranchMeta,
  type LineEdge,
  type LineNode,
  type LineTopology,
} from "@/lib/tfl/line-topology"

export {
  assertValidSchematic,
  schematicBounds,
  schematicNodeMap,
  schematicStationKey,
  validateSchematic,
  type LineSchematic,
  type SchematicBranchMeta,
  type SchematicEdge,
  type SchematicNode,
  type SchematicNodeKind,
  type SchematicOrientationHint,
} from "@/lib/tfl/line-schematic"

export {
  layoutLineSchematic,
  bezierLanePath,
  octilinearLanePath,
  orthogonalRoundedPath,
  maxOctilinearRadius,
  type SchematicLayout,
  type SchematicLayoutEdge,
  type SchematicLayoutOptions,
  type SchematicLayoutPoint,
  type SchematicOrientation,
} from "@/lib/tfl/schematic-layout"

export {
  NORTHERN_LINE_SCHEMATIC,
  NORTHERN_LINE_SCHEMATIC_HORIZONTAL,
  NORTHERN_LINE_SCHEMATIC_VERTICAL,
} from "@/lib/tfl/fixtures/northern-line-schematic"

export {
  getLineSpine,
  sliceLineSpineStations,
  type LineSpine,
} from "@/lib/tfl/line-spine"

export {
  CABLE_CAR_DIAGRAM_COLOR,
  SIMPLE_LINE_STRIP_IDS,
  isSimpleLineStripId,
  resolveDiagramLineColor,
  resolveRouteTrackStyle,
  routeTrackHeightUnits,
  routeTrackRailCount,
  type RouteTrackStyle,
  type SimpleLineStripId,
} from "@/lib/tfl/route-track"

export { sliceJourney, toDiagramStation } from "@/lib/tfl/diagram-mappers"
