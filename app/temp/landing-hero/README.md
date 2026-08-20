# Landing hero (temp)

Temp test for a 2.5D room landing: horizontal parallax, an elastic scroll-to-zoom into the iPad, a live interactive `/board/view` iframe (Oxford Circus), and a fake mirror with looping photos.

Route: `/temp/landing-hero` — not linked in nav, `noindex`.

## What to try

- Desktop: move the pointer for parallax. The camera tracks the wheel 1:1 over a short slice of the hero; a small pull eases-out to the iPad, then the page keeps scrolling with the camera already locked. Scroll back up through that same slice to ease-out to the wide room. Click the iPad to ease-out to the zoomed position.
- Two copy states: a centred headline + CTAs on the wide room, then a one-line caption under the zoomed iPad.
- Mobile: “Enable tilt” for device orientation (permission required); otherwise parallax follows scroll. The **canvas** (artwork) is sized to cover the viewport and slides so the iPad stays in the padded safe area — the camera stays put at rest and only zooms on scroll. Tall screens crop the sides, wide screens crop the sofa.
- `D` opens a debug panel: reference-SVG overlay + camera scrub slider.
- `prefers-reduced-motion`: no parallax, no blur, copy fades without moving, photo loops freeze.

## Regeneration

Canonical SVG (open in Illustrator): `public/images/landing/landing-source.svg`. Keep the ids in `svg-ids.mjs` and the `cls-*` classes — don’t expand appearance to RGB fills.

```bash
# After editing the SVG:
node app/temp/landing-hero/convert-svg.mjs

# After editing the React artwork, dump it back out:
node app/temp/landing-hero/export-svg.mjs
```

`convert-svg` reads hole geometry from `#landing-ipad-screen`, `#landing-picture-mat-1`, and `#landing-picture-mat-2`. Mirror photos and the board iframe are HTML overlays (not `foreignObject`) so they stay sharp while the camera zooms.

## Palette

Tokens from `/temp/landing-palette` are applied on this page and follow the site theme (`.dark` on `<html>`). Fills are baked as `oklch()` on `.landing-cls-*` (inline SVG often ignores `var(--landing-*)`). Dark hex in `landing-artwork.css` is the convert-svg leftover and is overridden.

Change colours in `app/temp/landing-palette/palette.ts` + `oklch.ts`; this scene reads `heroArtworkThemeStyleSheet()`.

## Promotion

Replace `/` only after the camera, iOS `svh`/`dvh` framing, and iPad iframe hold up on a phone. This folder is research, not the public homepage.
