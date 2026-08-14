import { ColourTokenPins } from "@/components/docs/demos/colour-token-pins";
import { LineChipWall } from "@/components/docs/demos/line-chip-wall";

/** First-fold Colours preview — all tokens as chips. */
export default function ColoursPreviewDemo() {
  return (
    <div className="space-y-3">
      <ColourTokenPins />
      <LineChipWall />
    </div>
  );
}
