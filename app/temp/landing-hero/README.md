# Landing hero (temp)

Temp test for a 2.5D room landing: horizontal parallax, a GSAP scroll-scrubbed camera zoom into the iPad, a live `/board/view` iframe, and a fake mirror with looping photos.

Route: `/temp/landing-hero` — not linked in nav, `noindex`.

## What to try

- Desktop: move the pointer for parallax; scroll to zoom toward the iPad; click the iPad to jump to the zoomed state.
- Mobile: “Enable tilt” for device orientation (permission required); otherwise parallax follows scroll. The iPad is fit with `contain` so the whole device stays visible on portrait screens.
- `D` opens a debug panel: reference-SVG overlay + camera scrub slider.
- `prefers-reduced-motion`: no parallax, no blur, copy fades without moving, photo loops freeze.

## Regeneration

The React artwork is generated from `public/images/landing/landing-reference.svg`:

```bash
node app/temp/landing-hero/convert-svg.mjs
```

Re-apply the picture-frame foreignObject order (media under the frame stroke) if you regenerate.

## Palette

Light-mode tokens from `/temp/landing-palette` are applied on this page. Fills are baked as `oklch()` on `.landing-cls-*` (inline SVG often ignores `var(--landing-*)`). Dark hex in `landing-artwork.css` is the convert-svg leftover and is overridden.

Change colours in `app/temp/landing-palette/palette.ts` + `oklch.ts`; this scene reads `heroArtworkStyleSheet("light")`.

## Promotion

Replace `/` only after the camera, iOS `svh`/`dvh` framing, and iPad iframe hold up on a phone. This folder is research, not the public homepage.
