/** Normalised line status row accepted by TubeStatusBoard (`data` prop). */
export type StatusLine = {
  id?: string;
  name?: string;
  modeName?: string;
  lineStatuses?: Array<{
    statusSeverity?: number;
    statusSeverityDescription?: string;
    reason?: string;
  }>;
};
