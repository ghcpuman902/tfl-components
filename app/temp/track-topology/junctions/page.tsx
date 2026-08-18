import type { Metadata } from "next";
import Link from "next/link";
import { JunctionGrammarView } from "../junction-grammar-view";

export const metadata: Metadata = {
  title: "Junction grammar (temp)",
  description:
    "Temp research: a finite taxonomy of rail junction types, modelled as legs + permitted movements, tested in the force-field layout.",
};

export default function JunctionGrammarTempPage() {
  return (
    <div className="mx-auto max-w-[90rem] space-y-6 px-4 py-10">
      <header className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Temp research — not linked in nav
        </p>
        <h1 className="text-2xl font-semibold">Junction grammar</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          A finite taxonomy of junction shapes that occur on London
          Underground, the Elizabeth line, Overground and DLR. Geometry
          (legs) and connectivity (permitted movements) are separate fields
          on purpose — a visual Y or diamond doesn&apos;t by itself say which
          pairs of legs a train can actually move between. See{" "}
          <code>lib/tfl/geometry/junction-grammar.ts</code>.
        </p>
        <p className="text-sm">
          <Link href="/temp/track-topology" className="underline underline-offset-2">
            ← OSM vs TfL track topology comparison
          </Link>
        </p>
      </header>
      <JunctionGrammarView />
    </div>
  );
}
