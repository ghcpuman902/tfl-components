/**
 * Chip labels keep normal casing (e.g. “Platform 4”, “Plat 4”).
 * Put this on the painted text node, not the flex chrome — then `items-center`
 * on the chip centres the cap-height box (uppercase X), not the em-square.
 * Chips never show descenders (g/y/p/q), so cap→alphabetic is the optical
 * vertical centre. Do not use x-height (`ex`) trim.
 */
export const CHIP_CAP_TEXT_BOX_CLASS =
  "leading-none [text-box:trim-both_cap_alphabetic]";

/**
 * Shared identity-chip width. Bus routes are ≤4 characters; line codes are
 * 3 letters. One extra `ch` keeps MET / H&C / N253 from clipping.
 */
export const ARRIVALS_IDENTITY_CHIP_WIDTH_CLASS = "w-[5ch]";
