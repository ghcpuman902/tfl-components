/** Stable ids for Illustrator ↔ React round-trip. Do not rename these. */

export const SOURCE_SVG = "public/images/landing/landing-source.svg"
export const PALETTE_SVG = "public/images/landing/landing-palette.svg"
export const ARTWORK_TSX = "app/temp/landing-hero/landing-artwork.tsx"
export const ARTWORK_CSS = "app/temp/landing-hero/landing-artwork.css"

export const LAYER_REFS = {
  "landing-l3": "l3Ref",
  "landing-l2": "l2Ref",
  "landing-l1": "l1Ref",
  "landing-l0": "l0Ref",
  "landing-ipad": "iPadRef",
}

export const TRACKING_REFS = {
  "landing-ipad-screen": "iPadScreenRef",
  "landing-picture-mat-1": "pictureMat1Ref",
  "landing-picture-mat-2": "pictureMat2Ref",
}

export const HOLE_IDS = {
  ipadScreen: "landing-ipad-screen",
  pictureMat1: "landing-picture-mat-1",
  pictureMat2: "landing-picture-mat-2",
}

/** Required by palette overrides / scene hooks. */
export const REQUIRED_IDS = [
  "landing-l0",
  "landing-l1",
  "landing-l2",
  "landing-l3",
  "landing-ipad",
  "landing-ipad-screen",
  "landing-picture-frame-1",
  "landing-picture-frame-2",
  "landing-picture-mat-1",
  "landing-picture-mat-2",
  "landing-mirror-frame",
  "Wall",
  "Table",
]

/** Hit target around the iPad screen (camera + cable). */
export const IPAD_HIT_PAD = { x: -4, y: -4, width: 34, height: 8 }

export const assertRequiredIds = (markup) => {
  for (const id of REQUIRED_IDS) {
    if (!markup.includes(`id="${id}"`)) {
      throw new Error(`landing SVG is missing required id="${id}"`)
    }
  }
}
