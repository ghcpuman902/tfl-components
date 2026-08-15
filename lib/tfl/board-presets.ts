/**
 * Hosted Board layout presets. Each preset allowlists which settings the
 * Config form exposes. The URL codec may support more than the form.
 */

import type { BoardSettingId } from "@/lib/tfl/board-settings";

export type BoardPresetId = "station" | "mixed" | "lines" | "commute";

export type BoardPresetDef = {
  id: BoardPresetId;
  title: string;
  description: string;
  available: boolean;
  /** Settings the Config form renders for this preset. */
  formSettings: readonly BoardSettingId[];
};

export const BOARD_PRESETS: readonly BoardPresetDef[] = [
  {
    id: "station",
    title: "Station + network status",
    description:
      "One station's arrivals, the current time, and status for every Tube and rail line.",
    available: true,
    formSettings: ["stop", "stopName", "arrivalsLines", "arrivalsRows"],
  },
  {
    id: "mixed",
    title: "Mixed transport",
    description: "Combine Tube, rail, bus, DLR, and Overground in one board.",
    available: false,
    formSettings: ["stop", "stopName"],
  },
  {
    id: "lines",
    title: "My lines",
    description: "Show status for the lines you choose and leave out the rest.",
    available: false,
    formSettings: [],
  },
  {
    id: "commute",
    title: "Commute",
    description: "Build the board around a regular journey or destination.",
    available: false,
    formSettings: ["stop", "stopName"],
  },
];

export const DEFAULT_BOARD_PRESET_ID: BoardPresetId = "station";

export const getBoardPreset = (id: BoardPresetId): BoardPresetDef =>
  BOARD_PRESETS.find((preset) => preset.id === id) ?? BOARD_PRESETS[0]!;
