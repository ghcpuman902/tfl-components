export type DisruptionStatus = {
  statusSeverity?: number;
  statusSeverityDescription?: string;
  reason?: string;
  disruption?: {
    category?: string;
    categoryDescription?: string;
  };
  validityPeriods?: readonly {
    isNow?: boolean;
    fromDate?: string;
    toDate?: string;
  }[];
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

/**
 * TfL's own "valid now" flag. Realtime rows omit periods entirely — those are
 * current. Rows whose every period has `isNow: false` are future-only.
 */
export const isCurrentAnnouncement = (status: DisruptionStatus): boolean => {
  const periods = status.validityPeriods ?? [];
  if (periods.length === 0) return true;
  return periods.some((period) => period.isNow === true);
};

export type LineAnnouncement = {
  /** Paragraph to render (prefix-stripped unless rawReason). */
  text: string;
  /** Worst severity in the merged group — drives chip colour. */
  statusSeverity?: number;
  statusSeverityDescription?: string;
  /** How many TfL rows collapsed into this paragraph. */
  sourceCount: number;
};

export type PrepareLineAnnouncementsOptions = {
  line?: { name?: string; modeName?: string };
  /** Keep only TfL `isNow` rows (or rows with no validity window). Default true. */
  currentOnly?: boolean;
  /** Collapse equal / contained paragraphs. Default true. */
  dedupe?: boolean;
  /** Keep TfL's unstripped `reason` string. Default false. */
  rawReason?: boolean;
};

const normalizeAnnouncementKey = (text: string): string =>
  text.toLowerCase().replace(/\s+/g, " ").trim();

const resolveAnnouncementText = (
  status: DisruptionStatus,
  options: { line?: { name?: string; modeName?: string }; rawReason: boolean },
): string => {
  const reason = status.reason?.trim();
  if (reason) {
    return options.rawReason
      ? reason
      : stripStatusReason(reason, options.line);
  }
  return status.statusSeverityDescription?.trim() || "Status update";
};

const isWorseSeverity = (
  candidate: number | undefined,
  current: number | undefined,
): boolean => {
  if (candidate === undefined) return false;
  if (current === undefined) return true;
  return candidate < current;
};

type DraftAnnouncement = LineAnnouncement & {
  key: string;
};

/**
 * Passenger-facing announcement list for one line: current filter → text
 * resolution → containment dedupe. All three steps are opt-out via options.
 */
export const prepareLineAnnouncements = (
  statuses: readonly DisruptionStatus[],
  options: PrepareLineAnnouncementsOptions = {},
): readonly LineAnnouncement[] => {
  const currentOnly = options.currentOnly ?? true;
  const dedupe = options.dedupe ?? true;
  const rawReason = options.rawReason ?? false;

  const resolved = statuses
    .filter((status) => (currentOnly ? isCurrentAnnouncement(status) : true))
    .map((status) => {
      const text = resolveAnnouncementText(status, {
        line: options.line,
        rawReason,
      });
      return {
        text,
        key: normalizeAnnouncementKey(text),
        statusSeverity: status.statusSeverity,
        statusSeverityDescription: status.statusSeverityDescription,
        sourceCount: 1,
      } satisfies DraftAnnouncement;
    });

  const toAnnouncement = (draft: DraftAnnouncement): LineAnnouncement => ({
    text: draft.text,
    statusSeverity: draft.statusSeverity,
    statusSeverityDescription: draft.statusSeverityDescription,
    sourceCount: draft.sourceCount,
  });

  if (!dedupe) {
    return resolved.map(toAnnouncement);
  }

  const kept: DraftAnnouncement[] = [];

  for (const item of resolved) {
    const matchIndex = kept.findIndex(
      (existing) =>
        existing.key === item.key ||
        existing.key.includes(item.key) ||
        item.key.includes(existing.key),
    );

    if (matchIndex === -1) {
      kept.push(item);
      continue;
    }

    const existing = kept[matchIndex]!;
    const preferIncoming =
      item.key.length > existing.key.length ||
      (item.key.length === existing.key.length &&
        isWorseSeverity(item.statusSeverity, existing.statusSeverity));

    const winner = preferIncoming ? item : existing;
    const loser = preferIncoming ? existing : item;
    const worstSeverity = isWorseSeverity(
      winner.statusSeverity,
      loser.statusSeverity,
    )
      ? winner
      : isWorseSeverity(loser.statusSeverity, winner.statusSeverity)
        ? loser
        : winner;

    kept[matchIndex] = {
      text: winner.text,
      key: winner.key,
      statusSeverity: worstSeverity.statusSeverity,
      statusSeverityDescription: worstSeverity.statusSeverityDescription,
      sourceCount: winner.sourceCount + loser.sourceCount,
    };
  }

  return kept.map(toAnnouncement);
};
