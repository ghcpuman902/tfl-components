/**
 * Geometry for a row lifted out of a vertical list. `offsets` and `heights`
 * are the rows' resting layout, in list order; `dy` is how far the lifted
 * row has moved from its own resting place.
 */

/** Keep the lifted row inside the list. */
export const clampDrag = (
  offsets: readonly number[],
  heights: readonly number[],
  draggedIndex: number,
  dy: number
): number => {
  const last = offsets.length - 1
  if (last < 0) return 0
  const min = (offsets[0] ?? 0) - (offsets[draggedIndex] ?? 0)
  const max =
    (offsets[last] ?? 0) +
    (heights[last] ?? 0) -
    ((offsets[draggedIndex] ?? 0) + (heights[draggedIndex] ?? 0))
  return Math.min(Math.max(dy, min), max)
}

/**
 * Where the lifted row lands. Moving up, its top edge passing a row's middle
 * takes that row's place; moving down, its bottom edge does. (Comparing the
 * centre would stop a row taller than its neighbours from ever reaching an
 * end, because the clamp keeps its top inside the list.)
 */
export const targetIndexFor = (
  offsets: readonly number[],
  heights: readonly number[],
  draggedIndex: number,
  dy: number
): number => {
  const top = (offsets[draggedIndex] ?? 0) + dy
  const bottom = top + (heights[draggedIndex] ?? 0)
  const movingUp = dy < 0
  let index = 0
  offsets.forEach((rowTop, at) => {
    const middle = rowTop + (heights[at] ?? 0) / 2
    // Ties go to the side the row came from, so the ends are reachable.
    const passed =
      at < draggedIndex
        ? !movingUp || middle < top
        : at > draggedIndex && !movingUp && middle <= bottom
    if (passed) index += 1
  })
  return index
}

/**
 * Where a row carried up into the list from below it lands, given its top
 * edge in list coordinates: under every row whose middle it has passed. Null
 * while its top is still below the list (letting go there adds nothing).
 */
export const insertIndexFor = (
  offsets: readonly number[],
  heights: readonly number[],
  top: number
): number | null => {
  const last = offsets.length - 1
  const bottom = last < 0 ? 0 : (offsets[last] ?? 0) + (heights[last] ?? 0)
  if (top >= bottom) return null
  return offsets.filter((rowTop, at) => rowTop + (heights[at] ?? 0) / 2 < top)
    .length
}

/** How far a resting row slides to open the gap at `targetIndex`. */
export const shiftFor = (
  index: number,
  draggedIndex: number,
  targetIndex: number,
  draggedHeight: number
): number => {
  if (index === draggedIndex) return 0
  if (index > draggedIndex && index <= targetIndex) return -draggedHeight
  if (index >= targetIndex && index < draggedIndex) return draggedHeight
  return 0
}

export const moveItem = <T>(
  items: readonly T[],
  from: number,
  to: number
): T[] => {
  const next = [...items]
  if (from < 0 || from >= next.length) return next
  const [item] = next.splice(from, 1)
  next.splice(Math.min(Math.max(to, 0), next.length), 0, item as T)
  return next
}
