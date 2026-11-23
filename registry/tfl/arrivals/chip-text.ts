/**
 * Chip labels keep normal casing (e.g. “Platform 4”, “Plat 4”).
 * Put this on the painted text node, not the flex chrome — then `items-center`
 * on the chip centres the cap-height box (uppercase X → alphabetic baseline),
 * not the em-square. Line names almost never have descenders; clip
 * Piccadilly / City `y` rather than shifting the optical centre. Do not use
 * x-height (`ex`) trim.
 */
export const CHIP_CAP_TEXT_BOX_CLASS =
  "leading-none [text-box:trim-both_cap_alphabetic]"

/**
 * Cap-centre shim for a glyph at `line-height: 1` that must not depend on
 * text-box-trim (it is unsupported in some browsers). Moves the glyph down by
 * (cap height + descent − ascent) / 2 so the cap height, not the line box,
 * sits on the box centre: Hammersmith One (0.649 / 0.350 / 0.900) → 0.0493em;
 * P22 Underground (0.700 / 0.300 / 0.905) → 0.0475em, under 0.03px apart at
 * badge sizes. A transform, not `top`: Chromium snaps a text box's layout
 * offset to whole CSS px, which would throw the centre off by up to 0.5px.
 * Use instead of CHIP_CAP_TEXT_BOX_CLASS, not with it.
 */
export const CHIP_CAP_SHIM_CLASS = "translate-y-[0.0493em]"

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
