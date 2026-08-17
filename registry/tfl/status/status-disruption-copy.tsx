import { QuietChip } from "@/components/tfl/arrivals/quiet-chip"
import { cn } from "@/lib/utils"

export type StatusDisruptionCopyItem = {
  text: string
  statusSeverityDescription?: string
}

/** Half-tile leading — wrapping copy stays on the arrivals baseline. */
export const DISRUPTION_LEADING_CLASS = "leading-[calc(var(--arrivals-row)/2)]"

const DISRUPTION_COPY_CLASS = cn(
  "text-base text-pretty text-foreground/80",
  DISRUPTION_LEADING_CLASS
)

const SeverityChip = ({ label }: { label: string }) => (
  <QuietChip className="mr-[0.35em]">{label}</QuietChip>
)

export const StatusDisruptionCopy = ({
  announcement,
  quiet = false,
}: {
  announcement: StatusDisruptionCopyItem
  quiet?: boolean
}) => {
  const severityLabel = announcement.statusSeverityDescription?.trim()
  const body = announcement.text
  const bodyIsOnlyLabel = severityLabel
    ? body.toLowerCase() === severityLabel.toLowerCase()
    : false

  return (
    <p className={cn(DISRUPTION_COPY_CLASS, quiet && "text-muted-foreground")}>
      {severityLabel ? <SeverityChip label={severityLabel} /> : null}
      {bodyIsOnlyLabel ? null : body}
    </p>
  )
}

export const StatusDisruptionBlock = ({
  announcements,
  quiet = false,
}: {
  announcements: readonly StatusDisruptionCopyItem[]
  quiet?: boolean
}) => (
  <div className={DISRUPTION_LEADING_CLASS}>
    {announcements.map((announcement, index) => (
      <StatusDisruptionCopy
        key={index}
        announcement={announcement}
        quiet={quiet}
      />
    ))}
  </div>
)
