import { DocsResizeFrame } from "@/components/docs/docs-resize-frame";
import { LineColorBar } from "@/components/tfl/brand/line-badge";
import { LineName } from "@/components/tfl/brand/line-name";

const SHARED_TRACK_IDS = [
  "circle",
  "hammersmith-city",
  "metropolitan",
] as const;

/** Board header: coloured title + brand bar(s). Not a filled chip. */
const BoardLineHeader = ({
  lineId,
  lineIds,
}: {
  lineId?: string;
  lineIds?: readonly string[];
}) => {
  const ids = lineIds ?? (lineId ? [lineId] : []);
  const primary = ids[0];
  const isGroup = ids.length > 1;

  return (
    <div className="min-w-0">
      <div
        data-line={isGroup ? undefined : primary}
        className={
          isGroup
            ? "pb-2 text-xl font-semibold leading-7 text-foreground"
            : "pb-2 text-xl font-semibold leading-7 text-[var(--line-color)]"
        }
      >
        {lineIds ? (
          <LineName lineIds={lineIds} group />
        ) : (
          <LineName lineId={lineId} />
        )}
      </div>
      <div className="flex h-1 w-full overflow-hidden" aria-hidden>
        {ids.map((id) => (
          <LineColorBar
            key={id}
            lineId={id}
            heightClass="h-1 min-w-0 flex-1"
          />
        ))}
      </div>
    </div>
  );
};

/** Line title — board headers only (chips live on Line chip). */
export default function LineNameDemo() {
  return (
    <div className="space-y-6">
      <p className="max-w-prose text-sm text-muted-foreground">
        Board group headers: coloured type plus a brand underline. Filled
        chips and shared-track chip rails are on{" "}
        <a
          href="/docs/line-chip"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Line chip
        </a>
        .
      </p>
      <DocsResizeFrame
        defaultWidth={320}
        minWidth={64}
        maxWidth={480}
        captionSuffix=" · resize to step the title ladder"
        className="space-y-5 p-4"
      >
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Single line</p>
          <BoardLineHeader lineId="hammersmith-city" />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Shared-track group
          </p>
          <BoardLineHeader lineIds={SHARED_TRACK_IDS} />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Short name</p>
          <BoardLineHeader lineId="central" />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Double rail (Elizabeth)
          </p>
          <BoardLineHeader lineId="elizabeth" />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Triple rail (Cable Car)
          </p>
          <BoardLineHeader lineId="cable-car" />
        </div>
      </DocsResizeFrame>
    </div>
  );
}
