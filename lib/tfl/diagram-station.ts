export type DiagramConnection = {
  id: string;
  name: string;
  /** Hex colour for flag box; defaults to muted if omitted. */
  color?: string;
  /** When true, use corporate blue text (Circle / H&C / W&C). */
  darkText?: boolean;
};

export type DiagramStation = {
  id: string;
  name: string;
  /** Show interchange ring instead of a tick. */
  interchange?: boolean;
  /** Optional connecting-line flag boxes under the name. */
  connections?: DiagramConnection[];
};

/** Short display name for diagrams (drop common TfL suffixes). */
export const formatStationName = (name: string): string =>
  name
    .replace(/\s+Underground Station$/i, "")
    .replace(/\s+DLR Station$/i, "")
    .replace(/\s+Rail Station$/i, "")
    .replace(/\s+Station$/i, "")
    .trim();

export const isLikelyInterchange = (stop: {
  lines?: { id?: string | null }[] | null;
  modes?: string[] | null;
}): boolean => {
  const lineCount = stop.lines?.filter((l) => l.id).length ?? 0;
  if (lineCount > 1) return true;
  const modes = stop.modes?.filter(Boolean) ?? [];
  return modes.length > 1;
};
