import type { LineSchematic } from "@/lib/tfl/line-schematic";
import { NORTHERN_LINE_SCHEMATIC_HORIZONTAL } from "@/lib/tfl/fixtures/northern-line-schematic-horizontal";
import { NORTHERN_LINE_SCHEMATIC_VERTICAL } from "@/lib/tfl/fixtures/northern-line-schematic-vertical";
import { CENTRAL_BRANCH_SCHEMATIC_HORIZONTAL } from "@/lib/tfl/fixtures/generated/central-branch-schematic-horizontal";
import { CENTRAL_BRANCH_SCHEMATIC_VERTICAL } from "@/lib/tfl/fixtures/generated/central-branch-schematic-vertical";
import { CIRCLE_BRANCH_SCHEMATIC_HORIZONTAL } from "@/lib/tfl/fixtures/generated/circle-branch-schematic-horizontal";
import { CIRCLE_BRANCH_SCHEMATIC_VERTICAL } from "@/lib/tfl/fixtures/generated/circle-branch-schematic-vertical";
import { DISTRICT_BRANCH_SCHEMATIC_HORIZONTAL } from "@/lib/tfl/fixtures/generated/district-branch-schematic-horizontal";
import { DISTRICT_BRANCH_SCHEMATIC_VERTICAL } from "@/lib/tfl/fixtures/generated/district-branch-schematic-vertical";
import { DLR_BRANCH_SCHEMATIC_HORIZONTAL } from "@/lib/tfl/fixtures/generated/dlr-branch-schematic-horizontal";
import { DLR_BRANCH_SCHEMATIC_VERTICAL } from "@/lib/tfl/fixtures/generated/dlr-branch-schematic-vertical";
import { ELIZABETH_BRANCH_SCHEMATIC_HORIZONTAL } from "@/lib/tfl/fixtures/generated/elizabeth-branch-schematic-horizontal";
import { ELIZABETH_BRANCH_SCHEMATIC_VERTICAL } from "@/lib/tfl/fixtures/generated/elizabeth-branch-schematic-vertical";
import { METROPOLITAN_BRANCH_SCHEMATIC_HORIZONTAL } from "@/lib/tfl/fixtures/generated/metropolitan-branch-schematic-horizontal";
import { METROPOLITAN_BRANCH_SCHEMATIC_VERTICAL } from "@/lib/tfl/fixtures/generated/metropolitan-branch-schematic-vertical";
import { MILDMAY_BRANCH_SCHEMATIC_HORIZONTAL } from "@/lib/tfl/fixtures/generated/mildmay-branch-schematic-horizontal";
import { MILDMAY_BRANCH_SCHEMATIC_VERTICAL } from "@/lib/tfl/fixtures/generated/mildmay-branch-schematic-vertical";
import { PICCADILLY_BRANCH_SCHEMATIC_HORIZONTAL } from "@/lib/tfl/fixtures/generated/piccadilly-branch-schematic-horizontal";
import { PICCADILLY_BRANCH_SCHEMATIC_VERTICAL } from "@/lib/tfl/fixtures/generated/piccadilly-branch-schematic-vertical";
import { RB1_BRANCH_SCHEMATIC_HORIZONTAL } from "@/lib/tfl/fixtures/generated/rb1-branch-schematic-horizontal";
import { RB1_BRANCH_SCHEMATIC_VERTICAL } from "@/lib/tfl/fixtures/generated/rb1-branch-schematic-vertical";
import { RB6_BRANCH_SCHEMATIC_HORIZONTAL } from "@/lib/tfl/fixtures/generated/rb6-branch-schematic-horizontal";
import { RB6_BRANCH_SCHEMATIC_VERTICAL } from "@/lib/tfl/fixtures/generated/rb6-branch-schematic-vertical";
import { TRAM_BRANCH_SCHEMATIC_HORIZONTAL } from "@/lib/tfl/fixtures/generated/tram-branch-schematic-horizontal";
import { TRAM_BRANCH_SCHEMATIC_VERTICAL } from "@/lib/tfl/fixtures/generated/tram-branch-schematic-vertical";
import { WEAVER_BRANCH_SCHEMATIC_HORIZONTAL } from "@/lib/tfl/fixtures/generated/weaver-branch-schematic-horizontal";
import { WEAVER_BRANCH_SCHEMATIC_VERTICAL } from "@/lib/tfl/fixtures/generated/weaver-branch-schematic-vertical";
import { WINDRUSH_BRANCH_SCHEMATIC_HORIZONTAL } from "@/lib/tfl/fixtures/generated/windrush-branch-schematic-horizontal";
import { WINDRUSH_BRANCH_SCHEMATIC_VERTICAL } from "@/lib/tfl/fixtures/generated/windrush-branch-schematic-vertical";

/**
 * Demo / docs registries. Northern uses the hand-authored fixtures.
 * Every other line is generated (`pnpm schematics:build`).
 * Horizontal and vertical maps are separate — do not rotate one graph.
 */
export const BRANCH_SCHEMATICS_HORIZONTAL: Record<string, LineSchematic> = {
  "central": CENTRAL_BRANCH_SCHEMATIC_HORIZONTAL,
  "circle": CIRCLE_BRANCH_SCHEMATIC_HORIZONTAL,
  "district": DISTRICT_BRANCH_SCHEMATIC_HORIZONTAL,
  "dlr": DLR_BRANCH_SCHEMATIC_HORIZONTAL,
  "elizabeth": ELIZABETH_BRANCH_SCHEMATIC_HORIZONTAL,
  "metropolitan": METROPOLITAN_BRANCH_SCHEMATIC_HORIZONTAL,
  "mildmay": MILDMAY_BRANCH_SCHEMATIC_HORIZONTAL,
  northern: NORTHERN_LINE_SCHEMATIC_HORIZONTAL,
  "piccadilly": PICCADILLY_BRANCH_SCHEMATIC_HORIZONTAL,
  "rb1": RB1_BRANCH_SCHEMATIC_HORIZONTAL,
  "rb6": RB6_BRANCH_SCHEMATIC_HORIZONTAL,
  "tram": TRAM_BRANCH_SCHEMATIC_HORIZONTAL,
  "weaver": WEAVER_BRANCH_SCHEMATIC_HORIZONTAL,
  "windrush": WINDRUSH_BRANCH_SCHEMATIC_HORIZONTAL,
};

export const BRANCH_SCHEMATICS_VERTICAL: Record<string, LineSchematic> = {
  "central": CENTRAL_BRANCH_SCHEMATIC_VERTICAL,
  "circle": CIRCLE_BRANCH_SCHEMATIC_VERTICAL,
  "district": DISTRICT_BRANCH_SCHEMATIC_VERTICAL,
  "dlr": DLR_BRANCH_SCHEMATIC_VERTICAL,
  "elizabeth": ELIZABETH_BRANCH_SCHEMATIC_VERTICAL,
  "metropolitan": METROPOLITAN_BRANCH_SCHEMATIC_VERTICAL,
  "mildmay": MILDMAY_BRANCH_SCHEMATIC_VERTICAL,
  northern: NORTHERN_LINE_SCHEMATIC_VERTICAL,
  "piccadilly": PICCADILLY_BRANCH_SCHEMATIC_VERTICAL,
  "rb1": RB1_BRANCH_SCHEMATIC_VERTICAL,
  "rb6": RB6_BRANCH_SCHEMATIC_VERTICAL,
  "tram": TRAM_BRANCH_SCHEMATIC_VERTICAL,
  "weaver": WEAVER_BRANCH_SCHEMATIC_VERTICAL,
  "windrush": WINDRUSH_BRANCH_SCHEMATIC_VERTICAL,
};

export const BRANCH_SCHEMATICS = BRANCH_SCHEMATICS_HORIZONTAL;

export const BRANCH_SCHEMATIC_LINE_IDS = Object.keys(BRANCH_SCHEMATICS_HORIZONTAL);
