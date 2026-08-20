import fs from "node:fs"

const src = fs.readFileSync(
  "public/images/landing/landing-reference.svg",
  "utf8"
)

const IPAD_SCREEN = {
  x: 1049.449,
  y: 508.3357,
  width: 110.3998,
  height: 82.2392,
  rx: 6.9508,
}
const FRAME_1 = {
  x: 990.1774,
  y: 455.5416,
  width: 25.8568,
  height: 36.1799,
}
const FRAME_2 = {
  x: 918.1262,
  y: 400.6514,
  width: 31.9087,
  height: 45.0292,
}

let body = src
  .replace(/<\?xml[^>]*>\s*/u, "")
  .replace(/class="/g, 'className="')
  .replace(/cls-/g, "landing-cls-")

body = body.replace(
  /<svg([^>]*)>/,
  `<svg$1 ref={svgRef} className="landing-artwork block size-full" preserveAspectRatio="xMidYMid meet">`
)

const styleMatch = body.match(/<style>\s*([\s\S]*?)\s*<\/style>/)
if (!styleMatch) throw new Error("missing svg style block")
fs.writeFileSync(
  "app/temp/landing-hero/landing-artwork.css",
  `${styleMatch[1].trim()}\n`
)
body = body.replace(/<defs>\s*<style>[\s\S]*?<\/style>\s*<\/defs>\s*/, "")

body = body.replace(
  '<g id="L3_-_inside_the_mirror" data-name="L3 - inside the mirror">',
  '<g ref={l3Ref} id="landing-l3" data-name="L3 - inside the mirror">'
)
body = body.replace(
  '<g id="L2_-_floor_back_wall_table_hanging_light_plant_ipad_mirror_frame" data-name="L2 - floor, back wall, table, hanging light, plant, ipad, mirror frame">',
  '<g ref={l2Ref} id="landing-l2" data-name="L2 - floor, back wall, table, hanging light, plant, ipad, mirror frame">'
)
body = body.replace(
  '<g id="L1_-_front_wall_lamp_and_drawer_and_wall_painting" data-name="L1 - front wall lamp and drawer and wall painting">',
  '<g ref={l1Ref} id="landing-l1" data-name="L1 - front wall lamp and drawer and wall painting">'
)
body = body.replace(
  '<g id="L0_-_sofa_and_pillow" data-name="L0 - sofa and pillow">',
  '<g ref={l0Ref} id="landing-l0" data-name="L0 - sofa and pillow">'
)
body = body.replace('<g id="iPad">', '<g ref={iPadRef} id="landing-ipad">')
body = body.replace(
  '<rect id="iPad_Screen" data-name="iPad Screen"',
  '<rect id="landing-ipad-screen" data-name="iPad Screen"'
)
body = body.replace(
  '<path id="Mirror_frame" data-name="Mirror frame"',
  '<path id="landing-mirror-frame" data-name="Mirror frame"'
)
body = body.replace(
  '<g id="Picture_frame_1" data-name="Picture frame 1">',
  '<g id="landing-picture-frame-1" data-name="Picture frame 1">'
)
body = body.replace(
  '<g id="Picture_frame_2" data-name="Picture frame 2">',
  '<g id="landing-picture-frame-2" data-name="Picture frame 2">'
)

const iPadForeignObject = `
        <foreignObject
          x="${IPAD_SCREEN.x}"
          y="${IPAD_SCREEN.y}"
          width="${IPAD_SCREEN.width}"
          height="${IPAD_SCREEN.height}"
        >
          {iPadScreen}
        </foreignObject>
        <rect
          ref={iPadHitRef}
          x="${IPAD_SCREEN.x - 4}"
          y="${IPAD_SCREEN.y - 4}"
          width="${IPAD_SCREEN.width + 34}"
          height="${IPAD_SCREEN.height + 8}"
          fill="transparent"
          className="cursor-pointer"
          tabIndex={0}
          role="button"
          aria-label="Zoom in to the station display"
          onClick={onIpadClick}
          onKeyDown={onIpadKeyDown}
        />`

body = body.replace(
  /(<rect id="landing-ipad-screen"[^/]*\/>)/,
  `$1${iPadForeignObject}`
)

const frame1Fo = `
      <foreignObject x="${FRAME_1.x}" y="${FRAME_1.y}" width="${FRAME_1.width}" height="${FRAME_1.height}">
        {pictureFrame1}
      </foreignObject>`
const frame2Fo = `
      <foreignObject x="${FRAME_2.x}" y="${FRAME_2.y}" width="${FRAME_2.width}" height="${FRAME_2.height}">
        {pictureFrame2}
      </foreignObject>`

body = body.replace(/(<g id="landing-picture-frame-1"[^>]*>)/, `$1${frame1Fo}`)
body = body.replace(/(<g id="landing-picture-frame-2"[^>]*>)/, `$1${frame2Fo}`)

const header = `/* eslint-disable @next/next/no-img-element */
"use client";

import type { KeyboardEvent, ReactNode, Ref } from "react";
import { heroArtworkStyleSheet } from "@/app/temp/landing-palette/palette";
import "./landing-artwork.css";

const LIGHT_ARTWORK_CSS = heroArtworkStyleSheet("light");

export const LANDING_VIEWBOX = "0 0 1559.3951 1011.3564";
export const LANDING_VIEWBOX_WIDTH = 1559.3951;
export const LANDING_VIEWBOX_HEIGHT = 1011.3564;

export const IPAD_SCREEN = ${JSON.stringify(IPAD_SCREEN, null, 2)} as const;
export const PICTURE_FRAME_1 = ${JSON.stringify(FRAME_1, null, 2)} as const;
export const PICTURE_FRAME_2 = ${JSON.stringify(FRAME_2, null, 2)} as const;

export const BOARD_IFRAME_SRC =
  "/board/view#stop=940GZZLUOXC&behaviour=unattended&a.rows=3&s.tiles=4";
export const BOARD_IFRAME_WIDTH = 1280;
export const BOARD_IFRAME_HEIGHT =
  BOARD_IFRAME_WIDTH * (IPAD_SCREEN.height / IPAD_SCREEN.width);

type LandingArtworkProps = {
  svgRef: Ref<SVGSVGElement | null>;
  l0Ref: Ref<SVGGElement | null>;
  l1Ref: Ref<SVGGElement | null>;
  l2Ref: Ref<SVGGElement | null>;
  l3Ref: Ref<SVGGElement | null>;
  iPadRef: Ref<SVGGElement | null>;
  iPadHitRef: Ref<SVGRectElement | null>;
  iPadScreen: ReactNode;
  pictureFrame1: ReactNode;
  pictureFrame2: ReactNode;
  onIpadClick: () => void;
  onIpadKeyDown: (event: KeyboardEvent<SVGRectElement>) => void;
};

export const LandingArtwork = ({
  svgRef,
  l0Ref,
  l1Ref,
  l2Ref,
  l3Ref,
  iPadRef,
  iPadHitRef,
  iPadScreen,
  pictureFrame1,
  pictureFrame2,
  onIpadClick,
  onIpadKeyDown,
}: LandingArtworkProps) => (
  <>
  <style>{LIGHT_ARTWORK_CSS}</style>
`

const footer = `
  </>
);
`

fs.writeFileSync(
  "app/temp/landing-hero/landing-artwork.tsx",
  `${header}${body}${footer}`
)

console.log("wrote landing-artwork.tsx", body.length, "chars")
