import type TflClient from "tfl-ts";

/**
 * One row from `tfl.line.getStatus()` — the public `tfl-ts` status contract.
 * Prefer sorting with `sortLinesBySeverityAndOrder` before pass-in.
 */
export type StatusLine = Awaited<
  ReturnType<TflClient["line"]["getStatus"]>
>[number];
