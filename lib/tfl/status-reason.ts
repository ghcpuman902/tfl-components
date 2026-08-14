export type DisruptionStatus = {
  statusSeverity?: number;
  statusSeverityDescription?: string;
  reason?: string;
  disruption?: {
    category?: string;
    categoryDescription?: string;
  };
};

export type DisruptionStatusIconName =
  | "Ban"
  | "Bus"
  | "CalendarClock"
  | "CircleCheck"
  | "CircleOff"
  | "CirclePause"
  | "CircleX"
  | "Clock"
  | "Gauge"
  | "Info"
  | "LogOut"
  | "Moon"
  | "OctagonPause"
  | "PersonStanding"
  | "RouteOff"
  | "Split"
  | "TriangleAlert"
  | "TrendingDown";

/** TfL `statusSeverity` → Lucide name. PlannedWork still overrides to CalendarClock. */
export const SEVERITY_LEVEL_ICONS: Record<number, DisruptionStatusIconName> = {
  0: "Info",
  1: "Ban",
  2: "OctagonPause",
  3: "CirclePause",
  4: "CalendarClock",
  5: "RouteOff",
  6: "TriangleAlert",
  7: "TrendingDown",
  8: "Bus",
  9: "Clock",
  10: "CircleCheck",
  11: "RouteOff",
  12: "LogOut",
  13: "PersonStanding",
  14: "Gauge",
  15: "Split",
  16: "CircleOff",
  17: "TriangleAlert",
  18: "CircleCheck",
  19: "Info",
  20: "Moon",
};

const MODE_REASON_PREFIXES = [
  "London Trams",
  "London Tram",
  "London Overground",
  "Docklands Light Railway",
  "Elizabeth line",
  "Elizabeth Line",
  "DLR",
] as const;

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const lineReasonPrefixes = (line?: {
  name?: string;
  modeName?: string;
}): string[] => {
  const prefixes: string[] = [...MODE_REASON_PREFIXES];
  const name = line?.name?.trim();
  if (name) {
    const andName = name.replace(/&/g, "and");
    const ampName = name.replace(/\band\b/gi, "&");
    prefixes.push(name, andName, ampName);
    prefixes.push(`London ${name}`, `London ${andName}`, `London ${name}s`);
  }
  const modeName = line?.modeName?.trim().replace(/-/g, " ");
  if (modeName) {
    prefixes.push(modeName, `${modeName} line`);
  }
  return prefixes;
};

/** Drop TfL mode / line prefixes that repeat the card title. */
export const stripStatusReason = (
  reason: string,
  line?: { name?: string; modeName?: string },
): string => {
  const prefixes = [...new Set(lineReasonPrefixes(line))].sort(
    (a, b) => b.length - a.length,
  );
  const pattern = new RegExp(
    `^(?:${prefixes.map(escapeRegExp).join("|")})(?:\\s+LINE)?\\s*:\\s*`,
    "i",
  );
  return reason.trim().replace(pattern, "");
};

/** Planned Closure, or any marker whose disruption category is PlannedWork. */
export const isScheduledEngineeringWork = (
  status: DisruptionStatus,
): boolean => {
  if (status.statusSeverity === 4) return true;
  const description = status.statusSeverityDescription?.trim().toLowerCase();
  if (description === "planned closure") return true;
  const category = status.disruption?.category?.trim().toLowerCase();
  if (category === "plannedwork") return true;
  const categoryDescription =
    status.disruption?.categoryDescription?.trim().toLowerCase() ?? "";
  return categoryDescription.includes("planned work");
};

export const getDisruptionStatusIconName = (
  status: DisruptionStatus,
): DisruptionStatusIconName => {
  if (isScheduledEngineeringWork(status)) return "CalendarClock";
  const level = status.statusSeverity;
  if (level !== undefined) {
    return SEVERITY_LEVEL_ICONS[level] ?? "CircleX";
  }
  return "CircleX";
};
