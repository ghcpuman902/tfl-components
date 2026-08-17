/** Collapse whitespace the way find-in-page treats a typed query. */
export const normalizeFindPhrase = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

/**
 * True when searching for `query` would already highlight one of `phrases`
 * (Chrome find is a case-insensitive substring match).
 */
export const isFindCovered = (
  query: string,
  phrases: readonly string[],
): boolean => {
  const needle = normalizeFindPhrase(query).toLowerCase();
  if (!needle) return false;
  return phrases.some((phrase) =>
    normalizeFindPhrase(phrase).toLowerCase().includes(needle),
  );
};

/** Drop phrases contained in a longer one so match counts stay honest. */
export const withoutFindSubstrings = (values: readonly string[]): string[] =>
  values.filter(
    (value) =>
      !values.some(
        (other) =>
          other.length > value.length &&
          other.toLowerCase().includes(value.toLowerCase()),
      ),
  );

/**
 * Candidates that find-in-page cannot already hit in `coveredPhrases`.
 * One copy of the longest uncovered form — not one chip per variant.
 */
export const neededFindPhrases = (
  candidates: readonly string[],
  coveredPhrases: readonly string[],
): string[] => {
  const seen = new Set<string>();
  const needed: string[] = [];
  for (const candidate of candidates) {
    const trimmed = normalizeFindPhrase(candidate);
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    if (isFindCovered(trimmed, coveredPhrases)) continue;
    seen.add(key);
    needed.push(trimmed);
  }
  return withoutFindSubstrings(needed);
};

/**
 * Mount a hidden find chip only when the current query would not already
 * highlight the painted copy. An empty query keeps uncovered chips in the
 * DOM so the first match of a true semantic (cross-`<br>` full name, `&` →
 * `and`) can still land.
 */
export const shouldExposeFindPhrase = (
  phrase: string,
  coveredPhrases: readonly string[],
  findQuery: string,
): boolean => {
  if (isFindCovered(phrase, coveredPhrases)) return false;
  const query = normalizeFindPhrase(findQuery);
  if (!query) return true;
  if (!isFindCovered(query, [phrase])) return false;
  return !isFindCovered(query, coveredPhrases);
};

export const phrasesToExpose = (
  candidates: readonly string[],
  coveredPhrases: readonly string[],
  findQuery: string,
): string[] =>
  neededFindPhrases(candidates, coveredPhrases).filter((phrase) =>
    shouldExposeFindPhrase(phrase, coveredPhrases, findQuery),
  );
