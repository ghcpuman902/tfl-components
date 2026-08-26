/**
 * Chip labels keep normal casing (e.g. “Platform 4”, “Plat 4”).
 * Put this on the painted text node, not the flex chrome — then `items-center`
 * on the chip centres the cap-height box (uppercase X), not the em-square.
 * Chips never show descenders (g/y/p/q), so cap→alphabetic is the optical
 * vertical centre. Do not use x-height (`ex`) trim.
 */
export const CHIP_CAP_TEXT_BOX_CLASS =
  "leading-none [text-box:trim-both_cap_alphabetic]"

/**
 * Shared identity-chip width for line codes and route numbers. Line codes are
 * 3 letters; bus routes are ≤4 characters. One extra `ch` keeps MET / H&C /
 * N253 from clipping. Compact platform chips are narrower — see
 * `ARRIVALS_PLATFORM_CHIP_WIDTH_CLASS`.
 */
export const ARRIVALS_IDENTITY_CHIP_WIDTH_CLASS = "w-[5ch]"

/**
 * Compact `P{n}` chip. Digits are `1ch`; `P1`/`P2` and a rare `P22` share
 * this box so rows align. Not the 5ch letter box — three letters are wider
 * than a letter plus two tabular digits, and the platform chip should not
 * carry that side padding.
 */
export const ARRIVALS_PLATFORM_CHIP_WIDTH_CLASS = "w-[3ch]"

/** Unattended rank chip — digit + ordinal suffix (`1st`). */
export const ARRIVALS_RANK_CHIP_WIDTH_CLASS = "w-[3ch]"

export const arrivalsOrdinalSuffix = (
  rank: number
): "st" | "nd" | "rd" | "th" => {
  const abs = Math.abs(Math.trunc(rank))
  const mod100 = abs % 100
  if (mod100 >= 11 && mod100 <= 13) return "th"
  switch (abs % 10) {
    case 1:
      return "st"
    case 2:
      return "nd"
    case 3:
      return "rd"
    default:
      return "th"
  }
}

export const formatArrivalsRankLabel = (rank: number): string =>
  `${rank}${arrivalsOrdinalSuffix(rank)}`
