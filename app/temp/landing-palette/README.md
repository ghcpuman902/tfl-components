# Landing palette (temp)

OKLCH tokens + light-mode for the room SVG, judged here before the 3D hero at `/temp/landing-hero` is rewired.

Route: `/temp/landing-palette` — not linked in nav, `noindex`.

## What to compare

Three columns, independent of the site theme (`data-landing-scheme`, not `.dark`):

1. **Original** — 96 hexes as exported
2. **Dark tokens** — walls/sofa/floor merged; carpet and painting keep every class colour
3. **Light tokens** — room planes (walls, floor, carpet field) lift toward cream; sofa / pillow keep that lightness with peach-pink chroma; table and drawer keep original wood; kickers, rug pattern, painting ink, iPad / plant / lamp stay

`#Wall` shares hex `#825e3a` with the picture-frame outers. `cls-23` maps to `wood-frame`; `#Wall` overrides to `wall-mirror`. `cls-60` is the plant pot and the table knobs — `#Table .cls-60` remaps to `wood-knob`.

## 3D consumption

`/temp/landing-hero` paints both schemes via `heroArtworkThemeStyleSheet()` — resolved `oklch()` on `.landing-cls-*`, not CSS variables. Light is the default; `.dark` on `<html>` swaps to the dark tokens.

```ts
import { getLandingPalette, heroArtworkStyleSheet } from "@/app/temp/landing-palette/palette"

const palette = getLandingPalette("light")
// palette["wall-front"] === "oklch(…)"
```

## Regeneration

```bash
node app/temp/landing-palette/optimize-svg.mjs
```

Reads `public/images/landing/landing-source.svg`, runs SVGO (keeps ids, classes, groups), strips the internal stylesheet, writes `public/images/landing/landing-palette.svg`.
