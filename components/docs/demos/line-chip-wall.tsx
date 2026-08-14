import { LineBadge } from "@/components/tfl/brand/line-badge";
import { CABLE_CAR_MAP_COLOUR } from "@/lib/tfl/brand-colours";
import { LINE_COLOUR_TOKENS } from "@/lib/tfl/line-colour-map";

const CHIP_LINES = LINE_COLOUR_TOKENS.map((token) => ({
  id: token.id,
  name: token.name,
  mapColor: token.id === "cable-car" ? CABLE_CAR_MAP_COLOUR.hex : undefined,
}));

/** Flex-wrap wall of every published line / mode colour as a LineBadge chip. */
export const LineChipWall = () => (
  <div className="flex flex-wrap gap-2">
    {CHIP_LINES.map((line) => (
      <LineBadge
        key={line.id}
        lineId={line.id}
        name={line.name}
        color={line.mapColor}
      />
    ))}
  </div>
);
