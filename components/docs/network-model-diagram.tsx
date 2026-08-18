const EDGES = [
  "Line → ServicePattern → PatternCall → Station → StationHub",
  "ServicePattern → PatternCalendar",
  "ServicePattern → PatternFrequency",
  "ServicePattern → PermittedMovement (via consecutive PatternCalls)",
  "ServicePattern → PhysicalPath (via PatternPathMatch)",
] as const

export const NetworkModelDiagram = () => (
  <figure className="my-6 max-w-prose rounded-none border border-border bg-muted/30 px-4 py-3">
    <figcaption className="sr-only">
      Network-model records and how they relate
    </figcaption>
    <pre className="m-0 overflow-x-auto font-mono text-sm leading-6 text-foreground">
      {`Line ── ServicePattern ── PatternCall ── Station ── StationHub
                │                                       │
                ├── PatternCalendar        PhysicalPath ┘
                ├── PatternFrequency           (via PatternPathMatch)
                └── PermittedMovement
                    (via consecutive PatternCalls)

MapProductPolicy   — which patterns each map shows`}
    </pre>
    <ul className="sr-only">
      {EDGES.map((edge) => (
        <li key={edge}>{edge}</li>
      ))}
    </ul>
  </figure>
)
