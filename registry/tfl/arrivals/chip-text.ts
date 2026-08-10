/**
 * Chip labels keep normal casing (e.g. “Platform 4”, “Plat 4”).
 * When centering inside a fixed rectangle, trim the text box to uppercase
 * (cap) metrics — not x-height (`ex`) — for a stable optical baseline.
 */
export const CHIP_CAP_TEXT_BOX_CLASS =
  "leading-none [text-box:trim-both_cap_alphabetic]";
