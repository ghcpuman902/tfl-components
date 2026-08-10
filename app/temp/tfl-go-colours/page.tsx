import type { Metadata } from "next";
import { GoColourCompareView } from "./compare-view";

export const metadata: Metadata = {
  title: "TfL Go colours (temp)",
  description:
    "Temp research: TfL brand vs Go day/night map colours, OKLCH transform, WCAG/APCA contrast.",
};

export default function TflGoColoursTempPage() {
  return <GoColourCompareView />;
}
