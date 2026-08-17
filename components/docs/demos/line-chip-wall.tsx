import { LineBadge } from "@/components/tfl/brand/line-badge";
import { LINE_COLOUR_TOKENS } from "@/lib/tfl/line-colour-map";

const CHIP_LINES = LINE_COLOUR_TOKENS.map((token) => ({
  id: token.id,
  name: token.name,
  diagram: token.id === "cable-car",
}));

/** Flex-wrap wall of every published line / mode colour as a LineBadge chip. */
export const LineChipWall = () => (
  <div className="flex flex-wrap gap-2">
    {CHIP_LINES.map((line) => (
      <LineBadge
        key={line.id}
        lineId={line.id}
        name={line.name}
        diagram={line.diagram}
      />
    ))}
  </div>
);
