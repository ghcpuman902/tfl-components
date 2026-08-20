import type TflClient from "tfl-ts"

/**
 * One normalised dock from `tfl.bikePoint.getById()` / radius / bounds.
 * Prefer this over inventing a docs-only row shape.
 */
export type CycleHireDock = Awaited<
  ReturnType<TflClient["bikePoint"]["getById"]>
>
