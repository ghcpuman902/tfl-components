import { ColourFormatsGrid } from "@/components/docs/colour-formats-grid";
import {
  getLineColourBarMode,
  LINE_COLOUR_TOKENS,
} from "@/lib/tfl/line-colour-map";

/** One card per token — aliases share the same paint (mode purple for Cable Car). */
const FORMAT_LINES = LINE_COLOUR_TOKENS.map((token) => ({
  id: token.id,
  name: token.name,
  modeName: getLineColourBarMode(token.id) ?? token.id,
  spec: token.spec,
}));

/** Foundations Colours full reference — copyable formats, not the Line Badge API. */
export default function ColoursDemo({
  title,
  titleId,
}: {
  title?: string;
  titleId?: string;
}) {
  return (
    <ColourFormatsGrid
      lines={FORMAT_LINES}
      title={title}
      titleId={titleId}
    />
  );
}
