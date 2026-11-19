/** Shortest the open search list gets, so a few results always show. */
export const MIN_LIST_HEIGHT_PX = 240

/**
 * Height for the open search list so its bottom edge sits on the bottom of
 * the screen wherever the page is scrolled: nothing of the Board below shows
 * between the list and the screen edge. `listTop` is the list's top in
 * viewport pixels (negative once scrolled under the header).
 */
export const listHeightToScreenBottom = (viewportHeight: number, listTop: number) =>
  Math.max(MIN_LIST_HEIGHT_PX, Math.ceil(viewportHeight - listTop))
