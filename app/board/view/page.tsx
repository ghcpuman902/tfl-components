import type { Metadata } from "next";
import { BoardDisplay } from "@/components/board/board-display";

export const metadata: Metadata = {
  title: "Board",
  description:
    "Full-screen arrivals for one station, with Tube status in a side slot, set from the URL.",
  robots: { index: false, follow: false },
};

export default function BoardViewPage() {
  return <BoardDisplay />;
}
