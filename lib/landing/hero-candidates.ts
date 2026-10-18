/**
 * Hero headline + subline candidates for the shape gate. Marked-up copy: a
 * space separates chunks, `{...}` glues words into one non-breaking phrase
 * unit (see `tagline-shape.ts`). Only candidates that pass the gate may enter
 * the A/B test (`hero-variants.ts`); `hero-variants.test.ts` enforces that.
 *
 * Copy comes from `_agent/marketing-copy.md`; a, b and c are the brief's
 * variants. The hero scene opens on Clapham Common (Northern line, bus 77 to
 * Waterloo), so c names the 77, not the 38.
 */
export type HeroCandidate = {
  id: string
  /** Where the angle comes from. */
  angle: string
  headline: string
  subline: string
}

export const HERO_CANDIDATES: readonly HeroCandidate[] = [
  {
    id: "a",
    angle: "Should I leave yet? (brief a)",
    headline: "{Know when to leave.} Without {picking up} {your phone.}",
    subline:
      "{Live buses,} {trains and Tube status} {on a screen} {by the door.}",
  },
  {
    id: "b",
    angle: "The board by the door (brief b)",
    headline: "{The bus board} {for your hallway.}",
    subline:
      "{Next buses, Tube trains and line status,} {always on.} {Put it on an old iPad,} {a monitor or a spare screen.}",
  },
  {
    id: "c",
    angle: "Spare screen, new job (brief c, 38 changed to the 77 on show)",
    headline:
      "{Got a spare screen?} {It could tell you} {when the 77 is coming.}",
    subline: "{Pick a stop.} {Board does the rest.} {No app, no TfL key.}",
  },
  {
    id: "d",
    angle: "Glance, coat, go",
    headline: "Glance. {Grab your coat.} Go.",
    subline:
      "{Live buses, trains and Tube status} {on a screen} {by the door.}",
  },
  {
    id: "e",
    angle: "Stop checking the phone",
    headline: "{Stop checking your phone} {for the bus.}",
    subline:
      "{Put the next buses and trains} {on a spare screen} {by the door.}",
  },
  {
    id: "f",
    angle: "The hallway tells you",
    headline: "{Your hallway could tell you} {when the bus is coming.}",
    subline:
      "{Next buses, trains and Tube status} {on a spare screen.} {Nothing to install.}",
  },
  {
    id: "g",
    angle: "The old iPad",
    headline: "{That old iPad} {could tell you} {when the bus is due.}",
    subline: "{Pick a stop,} {leave it by the door.} {No app to install.}",
  },
  {
    id: "h",
    angle: "Leave on time",
    headline: "{Leave on time,} {without checking} {your phone.}",
    subline:
      "{Live buses, trains and Tube status} {on a screen} {by the door.}",
  },
  {
    id: "i",
    angle: "Is the bus due yet?",
    headline: "{Is the bus due yet?} {Just look up.}",
    subline:
      "{Live buses, trains and Tube status} {on a spare screen,} {in a browser.}",
  },
]
