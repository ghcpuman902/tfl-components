import { formatStationName } from "@/lib/tfl/diagram-station"

const qualifierFromRaw = (name: string): string | null => {
  if (/\bH\s*&\s*C\b/i.test(name)) return "H&C"
  const paren = name.match(/\(([^)]+)\)/)
  if (!paren) return null
  const inner = paren[1]
    .replace(/\s*Line-?Underground.*$/i, "")
    .replace(/\s*Lines?\b.*$/i, "")
    .trim()
  return inner || null
}

const naptanTail = (id: string) => id.replace(/^940GZZ(?:LU|DL|CR)?/i, "")

/** Short leaf labels that stay distinct when TfL display names collide. */
export const boundaryLabels = (
  neighbours: readonly { id: string; name: string }[]
): Map<string, string> => {
  const shorts = neighbours.map((neighbour) => ({
    id: neighbour.id,
    short: formatStationName(neighbour.name),
    raw: neighbour.name,
  }))
  const counts = new Map<string, number>()
  for (const row of shorts) counts.set(row.short, (counts.get(row.short) ?? 0) + 1)

  return new Map(
    shorts.map((row) => {
      if ((counts.get(row.short) ?? 0) <= 1) return [row.id, row.short]
      const qualifier = qualifierFromRaw(row.raw)
      if (qualifier) return [row.id, `${row.short} (${qualifier})`]
      return [row.id, `${row.short} · ${naptanTail(row.id)}`]
    })
  )
}
