import {
  Ban,
  Bus,
  CalendarClock,
  CircleCheck,
  CircleOff,
  CirclePause,
  CircleX,
  Clock,
  Gauge,
  Info,
  LogOut,
  Moon,
  OctagonPause,
  PersonStanding,
  RouteOff,
  Split,
  TriangleAlert,
  TrendingDown,
} from "lucide-react";
import {
  getDisruptionStatusIcon,
  getDisruptionStatusIconName,
} from "@/components/tfl/status/tube-status-board";
import { cn } from "@/lib/utils";

type StatusIcon = typeof CircleX;

type MarkerRow = {
  marker: string;
  level: number | string;
  note: string;
  candidates: readonly { icon: StatusIcon; name: string }[];
  status: {
    statusSeverity?: number;
    statusSeverityDescription?: string;
    disruption?: { category?: string };
  };
};

/** Tube / rail markers from `GET /Line/Meta/Severity`, plus the PlannedWork override. */
const MARKER_ROWS: readonly MarkerRow[] = [
  {
    marker: "PlannedWork (any marker)",
    level: "category",
    note: "Scheduled engineering. Wins over the numeric marker.",
    candidates: [{ icon: CalendarClock, name: "CalendarClock" }],
    status: { disruption: { category: "PlannedWork" } },
  },
  {
    marker: "Special Service",
    level: 0,
    note: "Treated as normal by `isNormalService`.",
    candidates: [{ icon: Info, name: "Info" }],
    status: { statusSeverity: 0, statusSeverityDescription: "Special Service" },
  },
  {
    marker: "Closed",
    level: 1,
    note: "",
    candidates: [{ icon: Ban, name: "Ban" }],
    status: { statusSeverity: 1, statusSeverityDescription: "Closed" },
  },
  {
    marker: "Suspended",
    level: 2,
    note: "",
    candidates: [{ icon: OctagonPause, name: "OctagonPause" }],
    status: { statusSeverity: 2, statusSeverityDescription: "Suspended" },
  },
  {
    marker: "Part Suspended",
    level: 3,
    note: "",
    candidates: [{ icon: CirclePause, name: "CirclePause" }],
    status: { statusSeverity: 3, statusSeverityDescription: "Part Suspended" },
  },
  {
    marker: "Planned Closure",
    level: 4,
    note: "Scheduled engineering.",
    candidates: [{ icon: CalendarClock, name: "CalendarClock" }],
    status: {
      statusSeverity: 4,
      statusSeverityDescription: "Planned Closure",
    },
  },
  {
    marker: "Part Closure",
    level: 5,
    note: "Often PlannedWork as well. Uses CalendarClock when it is.",
    candidates: [
      { icon: CalendarClock, name: "CalendarClock" },
      { icon: RouteOff, name: "RouteOff" },
    ],
    status: { statusSeverity: 5, statusSeverityDescription: "Part Closure" },
  },
  {
    marker: "Severe Delays",
    level: 6,
    note: "",
    candidates: [{ icon: TriangleAlert, name: "TriangleAlert" }],
    status: { statusSeverity: 6, statusSeverityDescription: "Severe Delays" },
  },
  {
    marker: "Reduced Service",
    level: 7,
    note: "",
    candidates: [{ icon: TrendingDown, name: "TrendingDown" }],
    status: { statusSeverity: 7, statusSeverityDescription: "Reduced Service" },
  },
  {
    marker: "Bus Service",
    level: 8,
    note: "Replacement buses.",
    candidates: [{ icon: Bus, name: "Bus" }],
    status: { statusSeverity: 8, statusSeverityDescription: "Bus Service" },
  },
  {
    marker: "Minor Delays",
    level: 9,
    note: "",
    candidates: [{ icon: Clock, name: "Clock" }],
    status: { statusSeverity: 9, statusSeverityDescription: "Minor Delays" },
  },
  {
    marker: "Good Service",
    level: 10,
    note: "Good Service section, not disruptions.",
    candidates: [{ icon: CircleCheck, name: "CircleCheck" }],
    status: { statusSeverity: 10, statusSeverityDescription: "Good Service" },
  },
  {
    marker: "Part Closed",
    level: 11,
    note: "",
    candidates: [{ icon: RouteOff, name: "RouteOff" }],
    status: { statusSeverity: 11, statusSeverityDescription: "Part Closed" },
  },
  {
    marker: "Exit Only",
    level: 12,
    note: "Usually a station, not a whole line.",
    candidates: [{ icon: LogOut, name: "LogOut" }],
    status: { statusSeverity: 12, statusSeverityDescription: "Exit Only" },
  },
  {
    marker: "No Step Free Access",
    level: 13,
    note: "Treated as normal by `isNormalService`.",
    candidates: [{ icon: PersonStanding, name: "PersonStanding" }],
    status: {
      statusSeverity: 13,
      statusSeverityDescription: "No Step Free Access",
    },
  },
  {
    marker: "Change of frequency",
    level: 14,
    note: "",
    candidates: [{ icon: Gauge, name: "Gauge" }],
    status: {
      statusSeverity: 14,
      statusSeverityDescription: "Change of frequency",
    },
  },
  {
    marker: "Diverted",
    level: 15,
    note: "",
    candidates: [{ icon: Split, name: "Split" }],
    status: { statusSeverity: 15, statusSeverityDescription: "Diverted" },
  },
  {
    marker: "Not Running",
    level: 16,
    note: "",
    candidates: [{ icon: CircleOff, name: "CircleOff" }],
    status: { statusSeverity: 16, statusSeverityDescription: "Not Running" },
  },
  {
    marker: "Issues Reported",
    level: 17,
    note: "",
    candidates: [{ icon: TriangleAlert, name: "TriangleAlert" }],
    status: { statusSeverity: 17, statusSeverityDescription: "Issues Reported" },
  },
  {
    marker: "No Issues",
    level: 18,
    note: "Good Service section, not disruptions.",
    candidates: [{ icon: CircleCheck, name: "CircleCheck" }],
    status: { statusSeverity: 18, statusSeverityDescription: "No Issues" },
  },
  {
    marker: "Information",
    level: 19,
    note: "Treated as normal by `isNormalService`.",
    candidates: [{ icon: Info, name: "Info" }],
    status: { statusSeverity: 19, statusSeverityDescription: "Information" },
  },
  {
    marker: "Service Closed",
    level: 20,
    note: "`hasNightService` in tfl-ts. Night badge, not disruptions.",
    candidates: [{ icon: Moon, name: "Moon" }],
    status: { statusSeverity: 20, statusSeverityDescription: "Service Closed" },
  },
];

const IconCell = ({
  icon: Icon,
  name,
  current,
}: {
  icon: StatusIcon;
  name: string;
  current?: boolean;
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 font-mono text-xs",
      current ? "text-foreground" : "text-muted-foreground",
    )}
  >
    <Icon className="size-4 shrink-0" aria-hidden />
    {name}
  </span>
);

export const SeverityIconTable = () => (
  <div className="my-6 w-full overflow-x-auto">
    <table className="w-full caption-bottom text-sm">
      <caption className="mt-2 text-left text-xs text-muted-foreground">
        Now is what the board paints. Candidates stay listed so we can still
        swap.
      </caption>
      <thead className="[&_tr]:border-b">
        <tr className="m-0 border-t border-b p-0">
          <th className="h-10 border px-4 py-2 text-left align-middle font-bold">
            Marker
          </th>
          <th className="h-10 border px-4 py-2 text-left align-middle font-bold">
            Level
          </th>
          <th className="h-10 border px-4 py-2 text-left align-middle font-bold">
            Now
          </th>
          <th className="h-10 border px-4 py-2 text-left align-middle font-bold">
            Candidates
          </th>
          <th className="h-10 border px-4 py-2 text-left align-middle font-bold">
            Notes
          </th>
        </tr>
      </thead>
      <tbody className="[&_tr:last-child]:border-0">
        {MARKER_ROWS.map((row) => {
          const Icon = getDisruptionStatusIcon(row.status);
          const iconName = getDisruptionStatusIconName(row.status);

          return (
            <tr
              key={`${row.level}-${row.marker}`}
              className="m-0 border-t border-b p-0 transition-colors hover:bg-muted/50"
            >
              <td className="border px-4 py-2 align-middle font-medium">
                {row.marker}
              </td>
              <td className="border px-4 py-2 align-middle font-mono text-xs">
                {row.level}
              </td>
              <td className="border px-4 py-2 align-middle">
                <IconCell icon={Icon} name={iconName} current />
              </td>
              <td className="border px-4 py-2 align-middle">
                <span className="flex flex-wrap gap-x-3 gap-y-1">
                  {row.candidates.map((candidate) => (
                    <IconCell
                      key={candidate.name}
                      icon={candidate.icon}
                      name={candidate.name}
                    />
                  ))}
                </span>
              </td>
              <td className="border px-4 py-2 align-middle text-muted-foreground">
                {row.note}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
