/** Query keys for docs strip pickers — same `line` key as line topology. */
export const DOCS_LINE_QUERY_PARAM = "line"
export const DOCS_MONO_QUERY_PARAM = "mono"
export const DOCS_FIT_QUERY_PARAM = "fit"
const FLAG_TRUE = "1"

export type DocsStripQueryState = {
  lineId: string
  mono: boolean
  fit: boolean
}

export const parseDocsStripQuery = (
  search: string,
  validLineIds: ReadonlySet<string>,
  fallbackLineId: string
): DocsStripQueryState => {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  )
  const requested = params.get(DOCS_LINE_QUERY_PARAM)
  return {
    lineId:
      requested && validLineIds.has(requested) ? requested : fallbackLineId,
    mono: params.get(DOCS_MONO_QUERY_PARAM) === FLAG_TRUE,
    fit: params.get(DOCS_FIT_QUERY_PARAM) === FLAG_TRUE,
  }
}

const setFlag = (
  params: URLSearchParams,
  key: string,
  on: boolean
): boolean => {
  const present = params.get(key) === FLAG_TRUE
  if (on) {
    if (present) return false
    params.set(key, FLAG_TRUE)
    return true
  }
  if (!params.has(key)) return false
  params.delete(key)
  return true
}

/**
 * Returns the next `URL.search` (no `?`) or `null` when nothing changed.
 * `mono` / `fit` omitted from the input are left untouched.
 */
export const writeDocsStripQuery = (
  search: string,
  state: {
    lineId: string
    mono?: boolean
    fit?: boolean
  }
): string | null => {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  )
  let changed = false
  if (params.get(DOCS_LINE_QUERY_PARAM) !== state.lineId) {
    params.set(DOCS_LINE_QUERY_PARAM, state.lineId)
    changed = true
  }
  if (state.mono !== undefined) {
    changed = setFlag(params, DOCS_MONO_QUERY_PARAM, state.mono) || changed
  }
  if (state.fit !== undefined) {
    changed = setFlag(params, DOCS_FIT_QUERY_PARAM, state.fit) || changed
  }
  return changed ? params.toString() : null
}
