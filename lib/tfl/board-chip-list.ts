export type ChipListZone = "selected" | "pool" | "bin"

export type ChipListState = {
  selected: readonly string[]
  pool: readonly string[]
}

const insertAt = (
  list: readonly string[],
  id: string,
  index: number | undefined
): string[] => {
  const next = [...list]
  const at =
    index === undefined ? next.length : Math.max(0, Math.min(index, next.length))
  next.splice(at, 0, id)
  return next
}

const sameList = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((id, index) => id === right[index])

/** Move a chip into the selected list (optional index), the unused pool, or discard. */
export const moveChipListItem = (
  state: ChipListState,
  id: string,
  to: ChipListZone,
  index?: number
): ChipListState => {
  const selected = state.selected.filter((item) => item !== id)
  const pool = state.pool.filter((item) => item !== id)
  if (to === "bin") {
    const next = { selected, pool }
    if (
      sameList(next.selected, state.selected) &&
      sameList(next.pool, state.pool)
    ) {
      return state
    }
    return next
  }
  const next: ChipListState =
    to === "pool"
      ? { selected, pool: [...pool, id] }
      : { selected: insertAt(selected, id, index), pool }
  if (
    sameList(next.selected, state.selected) &&
    sameList(next.pool, state.pool)
  ) {
    return state
  }
  return next
}

export const sameChipOrder = (
  left: readonly string[],
  right: readonly string[]
): boolean => sameList(left, right)
