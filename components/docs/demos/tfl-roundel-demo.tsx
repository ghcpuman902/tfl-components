import { TfLRoundel } from "@/components/tfl/brand/tfl-roundel";
import {
  ROUNDEL_PRESETS,
  getRoundelLogoPath,
  type RoundelPreset,
} from "@/lib/tfl/roundel-presets";

const PRESET_KEYS = Object.keys(ROUNDEL_PRESETS) as RoundelPreset[];
const ARTWORK_KEYS = PRESET_KEYS.filter((key) => getRoundelLogoPath(key));

const RoundelGrid = ({
  keys,
  artwork = false,
}: {
  keys: RoundelPreset[];
  artwork?: boolean;
}) => (
  // Fixed tracks + auto-fill: wrap denser on wide screens, no stretched cells.
  <ul className="grid grid-cols-[repeat(auto-fill,6.5rem)] justify-start">
    {keys.map((key) => (
      <li
        key={key}
        className="flex size-[6.5rem] flex-col items-center justify-center gap-1.5 px-1"
      >
        <TfLRoundel
          variant={key}
          artwork={artwork}
          className={artwork ? "h-12 w-auto" : "size-14"}
        />
        <span className="max-w-full truncate text-center text-xs text-muted-foreground">
          {key}
        </span>
      </li>
    ))}
  </ul>
);

/** Presentational — placeholder unless NEXT_PUBLIC_ALLOW_TFL_ROUNDEL=true. */
export default function TflRoundelDemo() {
  const allowed =
    process.env.NEXT_PUBLIC_ALLOW_TFL_ROUNDEL === "true" ||
    process.env.VITE_ALLOW_TFL_ROUNDEL === "true";

  return (
    <div className="space-y-8">
      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">Default</h2>
        <p className="text-sm text-muted-foreground">
          {allowed
            ? "Official SVG enabled via env flag."
            : "Placeholder shown — set NEXT_PUBLIC_ALLOW_TFL_ROUNDEL=true to enable the mark."}
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <TfLRoundel className="size-16" />
          <TfLRoundel className="size-24" text="UNDERGROUND" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Mode presets</h2>
        <RoundelGrid keys={PRESET_KEYS} />
      </section>

      {ARTWORK_KEYS.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Artwork variants</h2>
          <RoundelGrid keys={ARTWORK_KEYS} artwork />
        </section>
      ) : null}
    </div>
  );
}
