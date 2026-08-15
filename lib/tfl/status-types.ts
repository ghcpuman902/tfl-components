import type TflClient from "tfl-ts"

/**
 * One row from `tfl.line.getStatus()` — the public `tfl-ts` status contract.
 * Fetch-time `sortLinesBySeverityAndOrder` is a hint only. The live board
 * partitions and sorts again after announcement prep.
 */
export type StatusLine = Awaited<
  ReturnType<TflClient["line"]["getStatus"]>
>[number]
