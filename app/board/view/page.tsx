import type { Metadata } from "next";
import { BoardDisplay } from "@/components/board/board-display";
import { getBoardArrivalsStopIdsIndex } from "@/lib/tfl/board-arrivals-stop-ids";
import { getBoardStationLinesIndex } from "@/lib/tfl/board-station-lines";
import { getBoardStationNamesIndex } from "@/lib/tfl/board-station-names";

export const metadata: Metadata = {
  title: "Board",
  description:
    "Full-screen arrivals for one station, with Tube status in a side slot, set from the URL.",
  robots: { index: false, follow: false },
};

export default function BoardViewPage() {
  const stationLines = getBoardStationLinesIndex();
  const stationNames = getBoardStationNamesIndex();
  const arrivalsStopIds = getBoardArrivalsStopIdsIndex();
  return (
    <BoardDisplay
      stationLines={stationLines}
      stationNames={stationNames}
      arrivalsStopIds={arrivalsStopIds}
    />
  );
}
