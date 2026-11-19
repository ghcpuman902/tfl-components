/**
 * Height K of the on-screen keyboard, reserved under the search view's sticky
 * row so nothing moves when the keyboard opens or closes.
 */
export const KEYBOARD_HEIGHT_KEY = "tfl-kb-height"

/** A smaller gap between the layout and visual viewports is browser chrome, not a keyboard. */
export const MIN_KEYBOARD_PX = 120

type KeyStore = Pick<Storage, "getItem" | "setItem">

export const estimateKeyboardHeight = (innerHeight: number): number =>
  Math.round(0.42 * innerHeight)

/** The keyboard's height from one viewport reading, or undefined when it is not open. */
export const measureKeyboardHeight = (
  innerHeight: number,
  visualHeight: number
): number | undefined => {
  const gap = Math.round(innerHeight - visualHeight)
  return gap > MIN_KEYBOARD_PX ? gap : undefined
}

export const readKeyboardHeight = (store: KeyStore | undefined): number | undefined => {
  try {
    const value = Number(store?.getItem(KEYBOARD_HEIGHT_KEY))
    return Number.isFinite(value) && value > MIN_KEYBOARD_PX ? value : undefined
  } catch {
    return undefined
  }
}

export const writeKeyboardHeight = (store: KeyStore | undefined, px: number) => {
  try {
    store?.setItem(KEYBOARD_HEIGHT_KEY, String(px))
  } catch {
    // Private mode: the estimate stays in use.
  }
}

/** K only grows: a taller keyboard shrinks the map, a shorter one leaves the zone as it is. */
export const growKeyboardHeight = (current: number, measured: number | undefined): number =>
  measured != null && measured > current ? measured : current
