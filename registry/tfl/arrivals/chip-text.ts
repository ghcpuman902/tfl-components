/**
 * Chip labels keep normal casing (e.g. “Platform 4”, “Plat 4”).
 * When centering inside a fixed rectangle, trim the text box to uppercase
 * (cap) metrics — not x-height (`ex`) — for a stable optical baseline.
 */
export const CHIP_CAP_TEXT_BOX_CLASS =
  "leading-none [text-box:trim-both_cap_alphabetic]";

/**
 * Shared identity-chip width. Bus routes are ≤4 characters; line codes are
 * 3 letters. One extra `ch` keeps MET / H&C / N253 from clipping.
 */
export const ARRIVALS_IDENTITY_CHIP_WIDTH_CLASS = "w-[5ch]";
